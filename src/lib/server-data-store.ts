import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { defaultTournamentData, type TournamentData } from "./data-store";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "tournament-data.json");

function normalizeTournamentData(data: Partial<TournamentData>): TournamentData {
  return {
    teams: Array.isArray(data.teams) ? data.teams : defaultTournamentData.teams,
    players: Array.isArray(data.players) ? data.players : defaultTournamentData.players,
    matches: Array.isArray(data.matches) ? data.matches : defaultTournamentData.matches
  };
}

export async function readTournamentData(): Promise<TournamentData> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    return normalizeTournamentData(JSON.parse(raw) as Partial<TournamentData>);
  } catch {
    return defaultTournamentData;
  }
}

export async function writeTournamentData(data: TournamentData): Promise<TournamentData> {
  const normalized = normalizeTournamentData(data);
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  return normalized;
}
