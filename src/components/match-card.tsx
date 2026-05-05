"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import { clsx } from "clsx";
import { useTournamentData } from "@/hooks/use-tournament-data";
import { getTeam } from "@/lib/data-store";
import type { Match, Team } from "@/lib/types";
import { Card, StatusPill } from "./ui";

function getFootballMatchTime(match: Match) {
  const rawLabel = (match.matchMinute || match.periodLabel).trim();
  const normalizedLabel = rawLabel.toLowerCase();
  const minutePattern = /^\d{1,3}(\+\d{1,2})?'$/;

  if (match.status === "Final" || normalizedLabel === "ft" || normalizedLabel === "full time" || normalizedLabel === "final") {
    return { phase: "Full Time", minute: "FT" };
  }

  if (normalizedLabel === "ht" || normalizedLabel === "half time" || normalizedLabel === "halftime") {
    return { phase: "Half Time", minute: "HT" };
  }

  if (minutePattern.test(rawLabel)) {
    const minuteValue = Number(rawLabel.split("+")[0].replace("'", ""));
    return {
      phase: minuteValue > 45 ? "Second Half" : "First Half",
      minute: rawLabel
    };
  }

  if (/second|q3|q4|set\s?[3-5]/i.test(rawLabel)) {
    return { phase: "Second Half", minute: "" };
  }

  return { phase: "First Half", minute: "" };
}

export function MatchCard({ match, teams }: { match: Match; teams?: Team[] }) {
  const { data, selectedTournamentId } = useTournamentData();
  const teamData = teams ?? data.teams;
  const home = getTeam({ ...data, teams: teamData }, match.homeTeamId);
  const away = getTeam({ ...data, teams: teamData }, match.awayTeamId);
  const selectedTournament = data.tournaments.find((tournament) => tournament.id === selectedTournamentId);
  const isFootball = selectedTournament?.sportType === "Football";
  const footballTime = isFootball ? getFootballMatchTime(match) : null;

  if (!home || !away) {
    return null;
  }

  return (
    <Card className="flex flex-col gap-5 border-slate-200/90 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.08)] transition hover:border-blue-200 hover:shadow-[0_18px_42px_rgba(37,99,235,0.12)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
            {match.sport} - {match.group}
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-slate-400">
            <MapPin size={15} aria-hidden="true" />
            {match.court} - {match.date} - {match.time}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {isFootball && match.status === "Live" ? (
            <span className="rounded-full bg-red-600 px-2.5 py-1 text-xs font-black uppercase tracking-wide text-white shadow-sm shadow-red-900/20">
              Live
            </span>
          ) : null}
          <StatusPill status={match.status} />
        </div>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4">
        <Link href={`/teams/${home.id}`} className="min-w-0 truncate text-base font-bold text-slate-900 hover:text-blue-700">
          {home.name}
        </Link>
        <Link
          href={`/matches/${match.id}`}
          className={clsx(
            "rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 text-center font-black leading-none !text-white shadow-md shadow-blue-900/25 ring-1 ring-blue-500/20 hover:from-blue-700 hover:to-blue-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700",
            isFootball ? "px-6 py-3 text-3xl sm:min-w-32" : "px-5 py-3 text-2xl sm:min-w-28"
          )}
        >
          {match.homeScore} - {match.awayScore}
        </Link>
        <Link href={`/teams/${away.id}`} className="min-w-0 truncate text-right text-base font-bold text-slate-900 hover:text-blue-700">
          {away.name}
        </Link>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm text-slate-600">
        {isFootball && footballTime ? (
          <div className="flex flex-wrap items-center gap-2">
            {footballTime.minute ? (
              <span className="rounded-md bg-blue-50 px-2.5 py-1 text-sm font-black text-blue-700">{footballTime.minute}</span>
            ) : null}
            <span className="font-semibold text-slate-600">{footballTime.phase}</span>
          </div>
        ) : (
          <span className="font-semibold text-slate-600">{match.periodLabel}</span>
        )}
        <div className="flex gap-3">
          <Link className="font-semibold text-blue-700 hover:text-blue-800" href={`/matches/${match.id}`}>
            Report
          </Link>
          <Link className="font-semibold text-blue-700 hover:text-blue-800" href={`/court/${match.hallSlug}`}>
            Court QR page
          </Link>
        </div>
      </div>
    </Card>
  );
}
