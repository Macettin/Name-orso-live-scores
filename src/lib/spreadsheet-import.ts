export function normalizeSpreadsheetValue(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function parseCsvText(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

async function inflateRaw(data: Uint8Array) {
  const buffer = new ArrayBuffer(data.byteLength);
  new Uint8Array(buffer).set(data);
  const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function columnIndex(cellRef: string) {
  const letters = cellRef.match(/[A-Z]+/)?.[0] ?? "A";
  return letters.split("").reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

async function readZipEntries(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  let eocdOffset = -1;

  for (let index = bytes.length - 22; index >= 0; index -= 1) {
    if (view.getUint32(index, true) === 0x06054b50) {
      eocdOffset = index;
      break;
    }
  }

  if (eocdOffset < 0) throw new Error("Could not read Excel file.");

  const entryCount = view.getUint16(eocdOffset + 10, true);
  let offset = view.getUint32(eocdOffset + 16, true);
  const entries = new Map<string, string>();
  const decoder = new TextDecoder();

  for (let entryIndex = 0; entryIndex < entryCount; entryIndex += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) break;

    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const fileNameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localHeaderOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(bytes.slice(offset + 46, offset + 46 + fileNameLength));
    const localNameLength = view.getUint16(localHeaderOffset + 26, true);
    const localExtraLength = view.getUint16(localHeaderOffset + 28, true);
    const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(dataStart, dataStart + compressedSize);
    const data = method === 0 ? compressed : method === 8 ? await inflateRaw(compressed) : null;

    if (data) entries.set(name, decoder.decode(data));
    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function parseXml(xmlText: string) {
  return new DOMParser().parseFromString(xmlText, "application/xml");
}

function textContent(node: Element, tagName: string) {
  return Array.from(node.getElementsByTagName(tagName)).map((item) => item.textContent ?? "").join("");
}

async function parseXlsxRows(file: File) {
  const entries = await readZipEntries(await file.arrayBuffer());
  const sharedStringsXml = entries.get("xl/sharedStrings.xml");
  const workbookRelsXml = entries.get("xl/_rels/workbook.xml.rels");
  const workbookXml = entries.get("xl/workbook.xml");

  if (!workbookXml) throw new Error("Excel workbook is missing.");

  const sharedStrings = sharedStringsXml
    ? Array.from(parseXml(sharedStringsXml).getElementsByTagName("si")).map((item) => textContent(item, "t"))
    : [];
  const workbook = parseXml(workbookXml);
  const firstSheet = workbook.getElementsByTagName("sheet")[0];
  const relationshipId = firstSheet?.getAttribute("r:id");
  let sheetPath = "xl/worksheets/sheet1.xml";

  if (relationshipId && workbookRelsXml) {
    const rel = Array.from(parseXml(workbookRelsXml).getElementsByTagName("Relationship")).find((item) => item.getAttribute("Id") === relationshipId);
    const target = rel?.getAttribute("Target");
    if (target) sheetPath = target.startsWith("xl/") ? target : `xl/${target.replace(/^\//, "")}`;
  }

  const sheetXml = entries.get(sheetPath);
  if (!sheetXml) throw new Error("First worksheet is missing.");

  const sheet = parseXml(sheetXml);
  return Array.from(sheet.getElementsByTagName("row")).map((rowNode) => {
    const cells: string[] = [];
    Array.from(rowNode.getElementsByTagName("c")).forEach((cellNode) => {
      const index = columnIndex(cellNode.getAttribute("r") ?? "A");
      const value = cellNode.getElementsByTagName("v")[0]?.textContent ?? "";
      const inline = textContent(cellNode, "t");
      cells[index] = cellNode.getAttribute("t") === "s" ? sharedStrings[Number(value)] ?? "" : inline || value;
    });
    return cells;
  });
}

export async function parseSpreadsheetRows(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "xlsx") {
    return parseXlsxRows(file);
  }

  const text = await file.text();

  if (extension === "xls" && text.trim().startsWith("<")) {
    const document = new DOMParser().parseFromString(text, "text/html");
    return Array.from(document.querySelectorAll("tr")).map((row) => Array.from(row.querySelectorAll("th,td")).map((cell) => cell.textContent?.trim() ?? ""));
  }

  if (extension === "tsv" || extension === "xls") {
    return text.split(/\r?\n/).filter(Boolean).map((row) => row.split("\t").map((cell) => cell.trim()));
  }

  return parseCsvText(text);
}
