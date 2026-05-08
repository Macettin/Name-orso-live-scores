"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import { clsx } from "clsx";
import { getTeam } from "@/lib/data-store";
import type { Match, Team } from "@/lib/types";
import { Card, StatusPill, TeamLogo } from "./ui";
import { YouTubeEmbed } from "./youtube-embed";

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
  const teamData = teams ?? [];
  const lookupData = { tournaments: [], teams: teamData, players: [], matches: [], events: [], playerMatchStats: [], matchTeamStats: [] };
  const home = getTeam(lookupData, match.homeTeamId);
  const away = getTeam(lookupData, match.awayTeamId);
  const isFootball = match.sport === "Football";
  const footballTime = isFootball ? getFootballMatchTime(match) : null;

  if (!home || !away) {
    return null;
  }

  return (
    <Card className="flex flex-col gap-4 border-slate-200/90 transition hover:border-blue-200 hover:shadow-[0_18px_42px_rgba(37,99,235,0.12)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
            {match.sport} - {match.group}
          </p>
          <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm font-semibold text-slate-500">
            <MapPin size={15} aria-hidden="true" />
            {match.court} - {match.date} - {match.time}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <StatusPill status={match.status} />
        </div>
      </div>
      <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center sm:gap-4">
        <Link href={`/teams/${home.id}`} className="flex min-w-0 items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 hover:text-blue-700 sm:bg-transparent sm:px-0 sm:py-0 sm:gap-3 sm:text-base">
          <TeamLogo team={home} size="h-9 w-9 sm:h-10 sm:w-10" />
          <span className="orso-team-name orso-team-name-2 min-w-0 leading-tight sm:truncate">{home.name}</span>
        </Link>
        <Link
          href={`/matches/${match.id}`}
          className={clsx(
            "mx-auto w-full max-w-52 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 text-center font-black leading-none !text-white shadow-md shadow-blue-900/25 ring-1 ring-blue-500/20 hover:from-blue-700 hover:to-blue-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 sm:w-auto sm:max-w-none",
            isFootball ? "px-6 py-3 text-4xl sm:min-w-32 sm:text-3xl" : "px-5 py-3 text-3xl sm:min-w-28 sm:text-2xl"
          )}
        >
          {match.homeScore} - {match.awayScore}
        </Link>
        <Link href={`/teams/${away.id}`} className="flex min-w-0 items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 hover:text-blue-700 sm:justify-end sm:bg-transparent sm:px-0 sm:py-0 sm:text-right sm:gap-3 sm:text-base">
          <span className="orso-team-name orso-team-name-2 min-w-0 leading-tight sm:truncate">{away.name}</span>
          <TeamLogo team={away} size="h-9 w-9 sm:h-10 sm:w-10" />
        </Link>
      </div>
      {match.youtubeUrl ? <YouTubeEmbed url={match.youtubeUrl} title={`${home.name} vs ${away.name} livestream`} /> : null}
      <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
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
        <div className="grid gap-2 sm:flex sm:flex-wrap sm:gap-x-3 sm:gap-y-2">
          <Link className="rounded-lg bg-blue-50 px-3 py-2 text-center font-semibold text-blue-700 hover:text-blue-800 sm:bg-transparent sm:px-0 sm:py-0" href={`/matches/${match.id}`}>
            Match QR
          </Link>
          <Link className="rounded-lg bg-blue-50 px-3 py-2 text-center font-semibold text-blue-700 hover:text-blue-800 sm:bg-transparent sm:px-0 sm:py-0" href={`/matches/${match.id}`}>
            Report
          </Link>
          <Link className="rounded-lg bg-blue-50 px-3 py-2 text-center font-semibold text-blue-700 hover:text-blue-800 sm:bg-transparent sm:px-0 sm:py-0" href={`/court/${match.hallSlug}`}>
            Court QR page
          </Link>
        </div>
      </div>
    </Card>
  );
}
