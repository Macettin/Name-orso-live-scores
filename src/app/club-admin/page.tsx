"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { useTournamentData } from "@/hooks/use-tournament-data";
import { createId } from "@/lib/data-store";
import { playerStatKeys, type Player, type Team } from "@/lib/types";
import { PageHeader, TeamLogo } from "@/components/ui";

type TeamForm = Pick<Team, "name" | "logoUrl" | "city" | "coach" | "colors">;
type PlayerForm = Pick<Player, "id" | "name" | "number" | "position" | "photoUrl">;
type RosterImportRow = {
  name: string;
  numberText: string;
  position: string;
  country: string;
  birthdate: string;
  photoUrl: string;
};
type RosterPreviewRow = RosterImportRow & {
  rowNumber: number;
  status: "ready" | "duplicate" | "error";
  message: string;
};

const emptyTeamForm: TeamForm = {
  name: "",
  logoUrl: "",
  city: "",
  coach: "",
  colors: ""
};

const emptyPlayerForm: PlayerForm = {
  id: "",
  name: "",
  number: 0,
  position: "",
  photoUrl: ""
};

const emptyStats = Object.fromEntries(playerStatKeys.map((key) => [key, 0])) as Player["stats"];
const rosterImportHeaders = ["Player Name", "Number", "Position", "Country", "Birthdate", "Photo URL"];

function labelClass() {
  return "text-sm font-semibold text-slate-600";
}

function inputClass() {
  return "mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";
}

function initials(value: string) {
  return (
    value
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "P"
  );
}

function normalizeImportValue(value: string) {
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

function parseRosterRows(rows: string[][]): RosterImportRow[] {
  const headers = rows[0]?.map((header) => normalizeImportValue(header)) ?? [];
  const indexFor = (label: string) => headers.indexOf(normalizeImportValue(label));

  return rows.slice(1).map((row) => ({
    name: row[indexFor("Player Name")] ?? "",
    numberText: row[indexFor("Number")] ?? "",
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

async function parseRosterXlsxFile(file: File) {
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

  return parseRosterRows(rows);
}

async function parseRosterUpload(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "xlsx") {
    return parseRosterXlsxFile(file);
  }

  const text = await file.text();

  if (extension === "xls" && text.trim().startsWith("<")) {
    const document = new DOMParser().parseFromString(text, "text/html");
    const rows = Array.from(document.querySelectorAll("tr")).map((row) => Array.from(row.querySelectorAll("th,td")).map((cell) => cell.textContent?.trim() ?? ""));
    return parseRosterRows(rows);
  }

  if (extension === "tsv" || extension === "xls") {
    return parseRosterRows(text.split(/\r?\n/).filter(Boolean).map((row) => row.split("\t").map((cell) => cell.trim())));
  }

  return parseRosterRows(parseCsvText(text));
}

function rosterTemplateHref() {
  const sample = [
    rosterImportHeaders.join(","),
    "Ricardo Quaresma,7,Winger,Portugal,1983-09-26,https://example.com/photo.jpg"
  ].join("\n");
  return `data:text/csv;charset=utf-8,${encodeURIComponent(sample)}`;
}

function PlayerAvatar({ player }: { player: Player }) {
  if (player.photoUrl) {
    return <span aria-hidden="true" className="h-10 w-10 shrink-0 rounded-lg bg-cover bg-center" style={{ backgroundImage: `url(${player.photoUrl})` }} />;
  }

  return <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-sm font-black text-blue-700 ring-1 ring-blue-100">{initials(player.name)}</span>;
}

export default function ClubAdminPage() {
  const router = useRouter();
  const {
    data,
    profile,
    authLoading,
    supabaseEnabled,
    lastError,
    selectedTournamentId,
    canManageClub,
    clubAdminTeamIds,
    logout,
    saveTeam,
    uploadTeamLogo,
    savePlayer,
    uploadPlayerPhoto,
    removePlayer
  } = useTournamentData();
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [teamFormTeamId, setTeamFormTeamId] = useState("");
  const [teamForm, setTeamForm] = useState<TeamForm>(emptyTeamForm);
  const [teamLogoFile, setTeamLogoFile] = useState<File | null>(null);
  const [playerForm, setPlayerForm] = useState<PlayerForm>(emptyPlayerForm);
  const [playerPhotoFile, setPlayerPhotoFile] = useState<File | null>(null);
  const [rosterPreviewRows, setRosterPreviewRows] = useState<RosterPreviewRow[]>([]);
  const [rosterImportSaving, setRosterImportSaving] = useState(false);
  const [message, setMessage] = useState("Manage your assigned team details and roster.");

  const assignedTeams = useMemo(
    () => data.teams.filter((team) => clubAdminTeamIds.includes(team.id) && (!team.tournamentId || team.tournamentId === selectedTournamentId)),
    [clubAdminTeamIds, data.teams, selectedTournamentId]
  );
  const selectedTeam = assignedTeams.find((team) => team.id === selectedTeamId) ?? assignedTeams[0];
  const activeTeamForm =
    selectedTeam && teamFormTeamId === selectedTeam.id
      ? teamForm
      : {
          name: selectedTeam?.name ?? "",
          logoUrl: selectedTeam?.logoUrl ?? "",
          city: selectedTeam?.city ?? "",
          coach: selectedTeam?.coach ?? "",
          colors: selectedTeam?.colors ?? ""
        };
  const roster = selectedTeam ? data.players.filter((player) => player.teamId === selectedTeam.id) : [];
  const rosterImportReadyRows = rosterPreviewRows.filter((row) => row.status === "ready");

  useEffect(() => {
    if (!supabaseEnabled || authLoading) {
      return;
    }

    if (!canManageClub) {
      router.replace("/login?next=/club-admin");
    }
  }, [authLoading, canManageClub, router, supabaseEnabled]);

  async function submitTeam(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedTeam || !activeTeamForm.name.trim()) {
      return;
    }

    let logoUrl = activeTeamForm.logoUrl || undefined;
    if (teamLogoFile) {
      try {
        logoUrl = await uploadTeamLogo(selectedTeam.id, teamLogoFile);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not upload team logo.");
        return;
      }
    }

    await saveTeam({
      ...selectedTeam,
      name: activeTeamForm.name.trim(),
      logoUrl,
      city: activeTeamForm.city,
      coach: activeTeamForm.coach,
      colors: activeTeamForm.colors
    });
    setTeamLogoFile(null);
    setMessage(`Saved team details for ${activeTeamForm.name.trim()}.`);
  }

  function updateTeamForm(nextForm: TeamForm) {
    if (selectedTeam) {
      setTeamFormTeamId(selectedTeam.id);
    }
    setTeamForm(nextForm);
  }

  async function submitPlayer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedTeam || !playerForm.name.trim()) {
      return;
    }

    const existingPlayer = playerForm.id ? data.players.find((player) => player.id === playerForm.id) : undefined;
    const playerId = existingPlayer?.id ?? createId("player", playerForm.name);
    let photoUrl = playerForm.photoUrl || undefined;
    const nextPlayer: Player = {
      id: playerId,
      tournamentId: selectedTeam.tournamentId ?? selectedTournamentId,
      teamId: selectedTeam.id,
      name: playerForm.name.trim(),
      number: playerForm.number,
      position: playerForm.position,
      photoUrl,
      stats: existingPlayer?.baseStats ?? existingPlayer?.stats ?? emptyStats,
      baseStats: existingPlayer?.baseStats
    };

    if (playerPhotoFile && !existingPlayer) {
      await savePlayer(nextPlayer);
    }

    if (playerPhotoFile) {
      try {
        photoUrl = await uploadPlayerPhoto(playerId, playerPhotoFile);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not upload player photo.");
        return;
      }
    }

    await savePlayer({ ...nextPlayer, photoUrl });
    setPlayerForm(emptyPlayerForm);
    setPlayerPhotoFile(null);
    setMessage(`Saved player: ${playerForm.name.trim()}.`);
  }

  function editPlayer(player: Player) {
    setPlayerForm({
      id: player.id,
      name: player.name,
      number: player.number,
      position: player.position,
      photoUrl: player.photoUrl ?? ""
    });
    setPlayerPhotoFile(null);
  }

  function buildRosterPreview(rows: RosterImportRow[]) {
    const existingKeys = new Set(roster.map((player) => `${normalizeImportValue(player.name)}:${player.number}`));
    const seenKeys = new Set<string>();

    return rows.map<RosterPreviewRow>((row, index) => {
      const name = row.name.trim();
      const number = Number(row.numberText);
      const key = `${normalizeImportValue(name)}:${number}`;

      if (!name) {
        return { ...row, rowNumber: index + 2, status: "error", message: "Player Name is required." };
      }

      if (!row.numberText.trim() || !Number.isFinite(number)) {
        return { ...row, rowNumber: index + 2, status: "error", message: "Number is required and must be numeric." };
      }

      if (existingKeys.has(key) || seenKeys.has(key)) {
        return { ...row, rowNumber: index + 2, status: "duplicate", message: "Duplicate player skipped for this team." };
      }

      seenKeys.add(key);
      return { ...row, rowNumber: index + 2, status: "ready", message: "Ready to import." };
    });
  }

  async function handleRosterFile(file?: File) {
    if (!file || !selectedTeam) return;

    try {
      const rows = await parseRosterUpload(file);
      const preview = buildRosterPreview(rows);
      setRosterPreviewRows(preview);
      setMessage(`Parsed ${preview.length} roster row${preview.length === 1 ? "" : "s"} for ${selectedTeam.name}. ${preview.filter((row) => row.status === "ready").length} ready to import.`);
    } catch (error) {
      setRosterPreviewRows([]);
      setMessage(error instanceof Error ? error.message : "Could not parse roster upload.");
    }
  }

  async function saveRosterImport() {
    if (!selectedTeam) return;

    setRosterImportSaving(true);
    let saved = 0;

    for (const row of rosterImportReadyRows) {
      await savePlayer({
        id: createId("player", `${selectedTeam.name}-${row.name}`),
        tournamentId: selectedTeam.tournamentId ?? selectedTournamentId,
        teamId: selectedTeam.id,
        name: row.name.trim(),
        number: Number(row.numberText),
        position: row.position.trim(),
        country: row.country.trim() || undefined,
        birthdate: row.birthdate.trim() || undefined,
        photoUrl: row.photoUrl.trim() || undefined,
        stats: emptyStats
      });
      saved += 1;
    }

    setRosterImportSaving(false);
    setMessage(`Imported ${saved} player${saved === 1 ? "" : "s"} to ${selectedTeam.name}. ${rosterPreviewRows.length - saved} skipped or errored.`);
    setRosterPreviewRows([]);
  }

  if (supabaseEnabled && authLoading) {
    return <PageHeader title="Checking club access" description="Loading your Supabase session." />;
  }

  if (supabaseEnabled && !canManageClub) {
    return <PageHeader title="Club admin access required" description="Redirecting to login." />;
  }

  return (
    <>
      <PageHeader title="Club Admin" description="Manage your assigned team profile, branding, roster, and player photos." />

      <div className="grid gap-6">
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">{lastError ?? message}</div>

        {profile ? (
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Signed in</h2>
                <p className="mt-1 text-sm text-slate-400">
                  {profile.email} - {profile.role}
                </p>
              </div>
              <button onClick={() => void logout()} className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">
                <LogOut size={16} aria-hidden="true" />
                Sign out
              </button>
            </div>
          </section>
        ) : null}

        {assignedTeams.length > 1 ? (
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <label className="block max-w-xl">
              <span className={labelClass()}>Assigned team</span>
              <select
                value={selectedTeam?.id ?? ""}
                onChange={(event) => {
                  setSelectedTeamId(event.target.value);
                  setTeamFormTeamId("");
                  setTeamLogoFile(null);
                }}
                className={inputClass()}
              >
                {assignedTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
          </section>
        ) : null}

        {selectedTeam ? (
          <>
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <TeamLogo team={selectedTeam} size="h-14 w-14" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Team details</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {selectedTeam.sport} - {selectedTeam.group}
                  </p>
                </div>
              </div>
              <form onSubmit={submitTeam} className="grid gap-4 md:grid-cols-4">
                <label>
                  <span className={labelClass()}>Team name</span>
                  <input value={activeTeamForm.name} onChange={(event) => updateTeamForm({ ...activeTeamForm, name: event.target.value })} className={inputClass()} />
                </label>
                <label>
                  <span className={labelClass()}>City</span>
                  <input value={activeTeamForm.city} onChange={(event) => updateTeamForm({ ...activeTeamForm, city: event.target.value })} className={inputClass()} />
                </label>
                <label>
                  <span className={labelClass()}>Coach</span>
                  <input value={activeTeamForm.coach} onChange={(event) => updateTeamForm({ ...activeTeamForm, coach: event.target.value })} className={inputClass()} />
                </label>
                <label>
                  <span className={labelClass()}>Colors</span>
                  <input value={activeTeamForm.colors} onChange={(event) => updateTeamForm({ ...activeTeamForm, colors: event.target.value })} className={inputClass()} />
                </label>
                <label className="md:col-span-2">
                  <span className={labelClass()}>Team logo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => setTeamLogoFile(event.target.files?.[0] ?? null)}
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-blue-700"
                  />
                </label>
                <div className="flex items-end md:col-span-2">
                  <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                    <Save size={16} aria-hidden="true" />
                    Save team
                  </button>
                </div>
              </form>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Players</h2>
                  <p className="mt-1 text-sm text-slate-400">Add players, edit details, and upload player photos for this team.</p>
                </div>
                {playerForm.id ? (
                  <button
                    onClick={() => {
                      setPlayerForm(emptyPlayerForm);
                      setPlayerPhotoFile(null);
                    }}
                    className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"
                  >
                    <X size={16} aria-hidden="true" />
                    Cancel edit
                  </button>
                ) : null}
              </div>
              <form onSubmit={submitPlayer} className="grid gap-4 md:grid-cols-4">
                <label>
                  <span className={labelClass()}>Name</span>
                  <input value={playerForm.name} onChange={(event) => setPlayerForm({ ...playerForm, name: event.target.value })} className={inputClass()} />
                </label>
                <label>
                  <span className={labelClass()}>Number</span>
                  <input type="number" value={playerForm.number} onChange={(event) => setPlayerForm({ ...playerForm, number: Number(event.target.value) })} className={inputClass()} />
                </label>
                <label>
                  <span className={labelClass()}>Position</span>
                  <input value={playerForm.position} onChange={(event) => setPlayerForm({ ...playerForm, position: event.target.value })} className={inputClass()} />
                </label>
                <label>
                  <span className={labelClass()}>Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => setPlayerPhotoFile(event.target.files?.[0] ?? null)}
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-blue-700"
                  />
                </label>
                <div className="flex items-end md:col-span-4">
                  <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                    {playerForm.id ? <Save size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
                    {playerForm.id ? "Save player" : "Add player"}
                  </button>
                </div>
              </form>
              <div className="mt-6 rounded-lg border border-blue-100 bg-blue-50 p-4">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-black text-blue-950">Roster upload</h3>
                    <p className="mt-1 text-sm font-semibold text-blue-700">Upload CSV or Excel players directly into {selectedTeam.name}. Team assignment is locked to this club.</p>
                  </div>
                  <a href={rosterTemplateHref()} download="orso-club-roster-template.csv" className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-black text-blue-700 hover:bg-blue-100">
                    Download template
                  </a>
                </div>
                <label className="block">
                  <span className={labelClass()}>CSV or Excel roster</span>
                  <input
                    type="file"
                    accept=".csv,.tsv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={(event) => void handleRosterFile(event.target.files?.[0])}
                    className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-blue-700"
                  />
                </label>
                <p className="mt-2 text-xs font-semibold text-blue-700">Headers: {rosterImportHeaders.join(", ")}</p>
                <div className="mt-4 overflow-x-auto rounded-lg border border-blue-100 bg-white">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-400">
                      <tr>
                        <th className="px-4 py-3">Row</th>
                        <th className="px-4 py-3">Player</th>
                        <th className="px-4 py-3">Details</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rosterPreviewRows.map((row) => (
                        <tr key={`${row.rowNumber}-${row.name}-${row.numberText}`}>
                          <td className="px-4 py-3 font-bold text-slate-500">{row.rowNumber}</td>
                          <td className="px-4 py-3">
                            <p className="font-black text-slate-900">#{row.numberText || "-"} {row.name || "Missing name"}</p>
                            <p className="text-sm text-slate-500">{row.position || "Player"}</p>
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
                      {rosterPreviewRows.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-5 text-center text-sm font-semibold text-slate-400">No roster upload parsed yet.</td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-blue-800">
                    {rosterImportReadyRows.length} ready / {rosterPreviewRows.filter((row) => row.status === "duplicate").length} duplicates / {rosterPreviewRows.filter((row) => row.status === "error").length} errors
                  </p>
                  <button
                    type="button"
                    onClick={() => void saveRosterImport()}
                    disabled={rosterImportReadyRows.length === 0 || rosterImportSaving}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {rosterImportSaving ? "Saving..." : "Save ready players"}
                  </button>
                </div>
              </div>
              <div className="mt-5 divide-y divide-slate-100 rounded-lg border border-slate-200">
                {roster.map((player) => (
                  <div key={player.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <PlayerAvatar player={player} />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900">
                          #{player.number} {player.name}
                        </p>
                        <p className="text-sm text-slate-400">{player.position || "Player"}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => editPlayer(player)} className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold">
                        <Pencil size={14} aria-hidden="true" />
                        Edit
                      </button>
                      <button onClick={() => removePlayer(player.id)} className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-700">
                        <Trash2 size={14} aria-hidden="true" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {roster.length === 0 ? <p className="p-4 text-sm text-slate-400">No players are listed for this team yet.</p> : null}
              </div>
            </section>
          </>
        ) : (
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">No assigned team</h2>
            <p className="mt-1 text-sm text-slate-400">Ask an admin to assign your user account to a team.</p>
          </section>
        )}
      </div>
    </>
  );
}
