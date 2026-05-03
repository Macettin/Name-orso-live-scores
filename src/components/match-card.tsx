"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import { useTournamentData } from "@/hooks/use-tournament-data";
import { getTeam } from "@/lib/data-store";
import type { Match, Team } from "@/lib/types";
import { Card, StatusPill } from "./ui";

export function MatchCard({ match, teams }: { match: Match; teams?: Team[] }) {
  const { data } = useTournamentData();
  const teamData = teams ?? data.teams;
  const home = getTeam({ ...data, teams: teamData }, match.homeTeamId);
  const away = getTeam({ ...data, teams: teamData }, match.awayTeamId);

  if (!home || !away) {
    return null;
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">
            {match.sport} - {match.group}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
            <MapPin size={15} aria-hidden="true" />
            {match.court} - {match.date} - {match.time}
          </p>
        </div>
        <StatusPill status={match.status} />
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <Link href={`/teams/${home.id}`} className="font-semibold text-slate-900 hover:text-emerald-700">
          {home.name}
        </Link>
        <Link href={`/matches/${match.id}`} className="rounded-lg bg-slate-950 px-4 py-2 text-center text-xl font-bold text-white">
          {match.homeScore} - {match.awayScore}
        </Link>
        <Link href={`/teams/${away.id}`} className="text-right font-semibold text-slate-900 hover:text-emerald-700">
          {away.name}
        </Link>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
        <span>{match.periodLabel}</span>
        <div className="flex gap-3">
          <Link className="font-semibold text-emerald-700 hover:text-emerald-800" href={`/matches/${match.id}`}>
            Report
          </Link>
          <Link className="font-semibold text-emerald-700 hover:text-emerald-800" href={`/court/${match.hallSlug}`}>
            Court QR page
          </Link>
        </div>
      </div>
    </Card>
  );
}
