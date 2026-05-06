"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createId } from "@/lib/data-store";
import { useTournamentData } from "@/hooks/use-tournament-data";
import { playerStatKeys, type Player, type Team } from "@/lib/types";
import { PageHeader, TeamLogo } from "@/components/ui";

type ImportRow = {
  team: string;
  name: string;
  number: number;
  position: string;
  country: string;
  birthdate: string;
  photoUrl: string;
};

type PreviewRow = ImportRow & {
  rowNumber: number;
  teamMatch?: Team;
  status: "ready" | "duplicate" | "error";
  message: string;
};

const requiredHeaders = ["Team", "Player Name", "Number", "Position", "Country", "Birthdate", "Photo URL"];
const emptyStats = Object.fromEntries(playerStatKeys.map((key) => [key, 0])) as Player["stats"];

function inputClass() {
  return "mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
}

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function parseCsvText(text: string) {
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

function parseDelimitedRows(rows: string[][]): ImportRow[] {
  const headers = rows[0]?.map((header) => normalize(header)) ?? [];
  const indexFor = (label: string) => headers.indexOf(normalize(label));

  return rows.slice(1).map((row) => ({
    team: row[indexFor("Team")] ?? "",
    name: row[indexFor("Player Name")] ?? "",
    number: Number(row[indexFor("Number")] ?? 0),
    position: row[indexFor("Position")] ?? "",
    country: row[indexFor("Country")] ?? "",
    birthdate: row[indexFor("Birthdate")] ?? "",
    photoUrl: row[indexFor("Photo URL")] ?? ""
  }));
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

async function parseXlsxFile(file: File) {
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
  const rows = Array.from(sheet.getElementsByTagName("row")).map((rowNode) => {
    const cells: string[] = [];
    Array.from(rowNode.getElementsByTagName("c")).forEach((cellNode) => {
      const index = columnIndex(cellNode.getAttribute("r") ?? "A");
      const value = cellNode.getElementsByTagName("v")[0]?.textContent ?? "";
      const inline = textContent(cellNode, "t");
      cells[index] = cellNode.getAttribute("t") === "s" ? sharedStrings[Number(value)] ?? "" : inline || value;
    });
    return cells;
  });

  return parseDelimitedRows(rows);
}

async function parseUpload(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "xlsx") {
    return parseXlsxFile(file);
  }

  const text = await file.text();

  if (extension === "xls" && text.trim().startsWith("<")) {
    const document = new DOMParser().parseFromString(text, "text/html");
    const rows = Array.from(document.querySelectorAll("tr")).map((row) => Array.from(row.querySelectorAll("th,td")).map((cell) => cell.textContent?.trim() ?? ""));
    return parseDelimitedRows(rows);
  }

  if (extension === "tsv" || extension === "xls") {
    return parseDelimitedRows(text.split(/\r?\n/).filter(Boolean).map((row) => row.split("\t").map((cell) => cell.trim())));
  }

  return parseDelimitedRows(parseCsvText(text));
}

function csvTemplateHref() {
  const sample = [
    requiredHeaders.join(","),
    "Besiktas JK,Ricardo Quaresma,7,Winger,Portugal,1983-09-26,https://example.com/photo.jpg"
  ].join("\n");
  return `data:text/csv;charset=utf-8,${encodeURIComponent(sample)}`;
}

export default function PlayerImportPage() {
  const router = useRouter();
  const { authLoading, canManageAll, supabaseEnabled, data, selectedTournamentId, savePlayer } = useTournamentData();
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [message, setMessage] = useState("Upload a CSV or Excel file to preview players before saving.");
  const [saving, setSaving] = useState(false);
  const tournamentTeams = data.teams.filter((team) => team.tournamentId === selectedTournamentId || (!team.tournamentId && selectedTournamentId === "main-tournament"));

  useEffect(() => {
    if (!supabaseEnabled || authLoading) return;
    if (!canManageAll) router.replace("/login?next=/admin/player-import");
  }, [authLoading, canManageAll, router, supabaseEnabled]);

  const duplicateKeys = useMemo(() => new Set(data.players.map((player) => `${player.teamId}:${normalize(player.name)}`)), [data.players]);
  const readyRows = previewRows.filter((row) => row.status === "ready");

  function buildPreview(rows: ImportRow[]) {
    const seen = new Set<string>();

    return rows.map<PreviewRow>((row, index) => {
      const teamMatch = tournamentTeams.find((team) => normalize(team.name) === normalize(row.team));
      const key = teamMatch ? `${teamMatch.id}:${normalize(row.name)}` : "";

      if (!row.name.trim() || !row.team.trim()) {
        return { ...row, rowNumber: index + 2, status: "error", message: "Team and Player Name are required." };
      }

      if (!teamMatch) {
        return { ...row, rowNumber: index + 2, status: "error", message: `No team matched "${row.team}".` };
      }

      if (duplicateKeys.has(key) || seen.has(key)) {
        return { ...row, rowNumber: index + 2, teamMatch, status: "duplicate", message: "Duplicate player skipped." };
      }

      seen.add(key);
      return { ...row, rowNumber: index + 2, teamMatch, status: "ready", message: "Ready to import." };
    });
  }

  async function handleFile(file?: File) {
    if (!file) return;

    try {
      const rows = await parseUpload(file);
      const preview = buildPreview(rows);
      setPreviewRows(preview);
      setMessage(`Parsed ${preview.length} row${preview.length === 1 ? "" : "s"}. ${preview.filter((row) => row.status === "ready").length} ready to import.`);
    } catch (error) {
      setPreviewRows([]);
      setMessage(error instanceof Error ? error.message : "Could not parse upload.");
    }
  }

  async function saveReadyRows() {
    setSaving(true);
    let saved = 0;

    for (const row of readyRows) {
      if (!row.teamMatch) continue;

      await savePlayer({
        id: createId("player", `${row.teamMatch.name}-${row.name}`),
        tournamentId: selectedTournamentId,
        teamId: row.teamMatch.id,
        name: row.name.trim(),
        number: Number.isFinite(row.number) ? row.number : 0,
        position: row.position.trim(),
        country: row.country.trim() || undefined,
        birthdate: row.birthdate.trim() || undefined,
        photoUrl: row.photoUrl.trim() || undefined,
        stats: emptyStats
      });
      saved += 1;
    }

    setSaving(false);
    setMessage(`Imported ${saved} player${saved === 1 ? "" : "s"}. ${previewRows.length - saved} skipped or errored.`);
    setPreviewRows([]);
  }

  if (supabaseEnabled && authLoading) {
    return <PageHeader title="Checking access" description="Loading your Supabase session." />;
  }

  if (supabaseEnabled && !canManageAll) {
    return <PageHeader title="Admin access required" description="Redirecting to login." />;
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Admin only"
        title="Bulk player import"
        description="Upload CSV or Excel rosters, preview team matches and duplicates, then save confirmed players."
        action={
          <Link href="/admin" className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 hover:bg-blue-100">
            Back to Admin CMS
          </Link>
        }
      />

      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">{message}</div>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <label>
            <span className="text-sm font-bold text-slate-700">CSV or Excel file</span>
            <input
              type="file"
              accept=".csv,.tsv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(event) => void handleFile(event.target.files?.[0])}
              className={`${inputClass()} file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-blue-700`}
            />
          </label>
          <a href={csvTemplateHref()} download="orso-player-import-template.csv" className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-center text-sm font-black text-blue-700 hover:bg-blue-100">
            Download CSV template
          </a>
        </div>
        <p className="mt-3 text-sm font-semibold text-slate-400">Required headers: {requiredHeaders.join(", ")}</p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-900">Preview</h2>
            <p className="text-sm font-semibold text-slate-400">{readyRows.length} ready / {previewRows.filter((row) => row.status === "duplicate").length} duplicates / {previewRows.filter((row) => row.status === "error").length} errors</p>
          </div>
          <button onClick={() => void saveReadyRows()} disabled={readyRows.length === 0 || saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300">
            {saving ? "Saving..." : "Save ready players"}
          </button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Row</th>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3">Team match</th>
                <th className="px-4 py-3">Details</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {previewRows.map((row) => (
                <tr key={`${row.rowNumber}-${row.name}-${row.team}`}>
                  <td className="px-4 py-3 font-bold text-slate-500">{row.rowNumber}</td>
                  <td className="px-4 py-3">
                    <p className="font-black text-slate-900">#{row.number || 0} {row.name}</p>
                    <p className="text-sm text-slate-500">{row.position || "Player"}</p>
                  </td>
                  <td className="px-4 py-3">
                    {row.teamMatch ? (
                      <div className="flex items-center gap-2">
                        <TeamLogo team={row.teamMatch} size="h-8 w-8" />
                        <span className="font-bold text-slate-800">{row.teamMatch.name}</span>
                      </div>
                    ) : (
                      <span className="font-semibold text-red-600">{row.team}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {[row.country, row.birthdate, row.photoUrl ? "Photo URL" : ""].filter(Boolean).join(" / ") || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-black uppercase ${row.status === "ready" ? "bg-emerald-100 text-emerald-700" : row.status === "duplicate" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                      {row.status}
                    </span>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{row.message}</p>
                  </td>
                </tr>
              ))}
              {previewRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm font-semibold text-slate-400">No upload parsed yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
