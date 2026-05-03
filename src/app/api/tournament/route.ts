import { NextResponse } from "next/server";
import { readTournamentData, writeTournamentData } from "@/lib/server-data-store";
import type { TournamentData } from "@/lib/data-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const data = await readTournamentData();
  return NextResponse.json(data);
}

export async function PUT(request: Request) {
  try {
    const data = (await request.json()) as TournamentData;

    if (!Array.isArray(data.teams) || !Array.isArray(data.players) || !Array.isArray(data.matches)) {
      return NextResponse.json({ error: "Invalid tournament data." }, { status: 400 });
    }

    const savedData = await writeTournamentData(data);
    return NextResponse.json(savedData);
  } catch {
    return NextResponse.json({ error: "Could not save tournament data." }, { status: 400 });
  }
}
