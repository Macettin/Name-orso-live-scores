"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { TeamLogo } from "@/components/ui";
import { useTournamentData } from "@/hooks/use-tournament-data";
import { getTeam } from "@/lib/data-store";
import type { Match, Tournament } from "@/lib/types";

function displayClock(match: Match) {
  return match.clockLabel || match.matchMinute || match.periodLabel || "Pregame";
}

function BrandMark({ tournament }: { tournament?: Tournament }) {
  const accent = tournament?.primaryColor || "#2563eb";

  if (tournament?.logoUrl) {
    return <span className="h-20 w-20 rounded-2xl bg-white/10 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${tournament.logoUrl})` }} />;
  }

  return (
    <span className="flex h-20 w-20 items-center justify-center rounded-2xl text-3xl font-black text-white" style={{ backgroundColor: accent }}>
      {(tournament?.name || "OR").slice(0, 2).toUpperCase()}
    </span>
  );
}

export default function ScoreboardPage() {
  const params = useParams<{ matchId: string }>();
  const { data } = useTournamentData();
  const match = data.matches.find((item) => item.id === params.matchId);

  if (!match) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 px-6 text-white">
        <div className="text-center">
          <p className="text-4xl font-black">Match not found</p>
          <Link href="/live" className="mt-6 inline-flex rounded-lg bg-white px-4 py-2 text-sm font-bold text-slate-950">
            Back to live scores
          </Link>
        </div>
      </div>
    );
  }

  const home = getTeam(data, match.homeTeamId);
  const away = getTeam(data, match.awayTeamId);
  const tournament = data.tournaments.find((item) => item.id === match.tournamentId);
  const accent = tournament?.primaryColor || "#2563eb";
  const clock = displayClock(match);

  return (
    <div className="fixed inset-0 z-50 flex min-h-screen flex-col bg-slate-950 px-6 py-6 text-white sm:px-10 lg:px-14">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-5">
        <div className="flex min-w-0 items-center gap-4">
          <BrandMark tournament={tournament} />
          <div className="min-w-0">
            <p className="truncate text-3xl font-black sm:text-4xl">{tournament?.name || "Tournament"}</p>
            <p className="mt-1 text-lg font-bold text-white/60">{match.sport} / {match.group}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-5 py-3">
          <span className="h-3 w-3 rounded-full bg-red-500 shadow-[0_0_18px_rgba(239,68,68,0.9)]" />
          <span className="text-xl font-black uppercase tracking-wide">{match.status}</span>
        </div>
      </header>

      <main className="grid flex-1 place-items-center py-8">
        <div className="grid w-full max-w-7xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 sm:gap-8">
          <div className="min-w-0 text-left">
            <div className="flex min-w-0 items-center gap-4">
              <TeamLogo team={home} size="h-20 w-20" className="text-2xl" />
              <p className="truncate text-4xl font-black sm:text-6xl lg:text-7xl">{home?.name || "Home"}</p>
            </div>
          </div>
          <div className="rounded-3xl px-6 py-5 text-center shadow-[0_28px_80px_rgba(0,0,0,0.35)] sm:px-10 sm:py-7" style={{ backgroundColor: accent }}>
            <div className="text-7xl font-black leading-none tracking-tight sm:text-8xl lg:text-[10rem]">
              {match.homeScore} - {match.awayScore}
            </div>
          </div>
          <div className="min-w-0 text-right">
            <div className="flex min-w-0 items-center justify-end gap-4">
              <p className="truncate text-4xl font-black sm:text-6xl lg:text-7xl">{away?.name || "Away"}</p>
              <TeamLogo team={away} size="h-20 w-20" className="text-2xl" />
            </div>
          </div>
        </div>
      </main>

      <footer className="grid shrink-0 gap-4 md:grid-cols-[1fr_auto_1fr] md:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-white/45">Clock</p>
          <div className="mt-2 inline-flex items-center gap-3 rounded-2xl bg-white/10 px-5 py-3">
            {match.clockRunning ? <span className="h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.9)]" /> : null}
            <span className="text-3xl font-black">{clock}</span>
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-wide text-white/45">Court / Hall</p>
          <p className="mt-2 text-2xl font-black">{match.court} / {match.hallSlug}</p>
        </div>
        <div className="flex justify-start md:justify-end">
          {tournament?.sponsorName || tournament?.sponsorLogoUrl ? (
            <div className="flex items-center gap-4 rounded-2xl bg-white/10 px-5 py-3">
              {tournament.sponsorLogoUrl ? (
                <span className="h-12 w-28 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${tournament.sponsorLogoUrl})` }} />
              ) : null}
              {tournament.sponsorName ? <span className="text-xl font-black">{tournament.sponsorName}</span> : null}
            </div>
          ) : null}
        </div>
      </footer>
    </div>
  );
}
