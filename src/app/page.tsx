"use client";

import Link from "next/link";
import { Activity, CalendarDays, FileText, ShieldCheck } from "lucide-react";
import { MatchCard } from "@/components/match-card";
import { Card } from "@/components/ui";
import { buildStandings } from "@/lib/data-store";
import { useTournamentData } from "@/hooks/use-tournament-data";

export default function Home() {
  const { data } = useTournamentData();
  const liveMatches = data.matches.filter((match) => match.status === "Live");
  const nextFixtures = data.matches.filter((match) => match.status === "Scheduled").slice(0, 3);
  const standings = buildStandings(data);

  return (
    <>
      <section className="mb-8 overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-sky-100 px-5 py-6 shadow-[0_18px_50px_rgba(37,99,235,0.10)] sm:px-7 lg:px-8 lg:py-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-blue-700">Tournament dashboard</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">Orso Live Scores</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
              Follow volleyball and basketball fixtures, live scoreboards, group tables, team pages, player stats, match reports, and court-specific QR pages from one tournament hub.
            </p>
          </div>
          <Link
            href="/live"
            className="inline-flex w-fit items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-blue-900/15 transition hover:bg-blue-700"
          >
            View live scores
          </Link>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex items-center gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <Activity size={22} aria-hidden="true" />
          </span>
          <div>
            <p className="text-3xl font-black text-slate-900">{liveMatches.length}</p>
            <p className="text-sm font-medium text-slate-400">Live matches</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <CalendarDays size={22} aria-hidden="true" />
          </span>
          <div>
            <p className="text-3xl font-black text-slate-900">{data.matches.length}</p>
            <p className="text-sm font-medium text-slate-400">Fixtures</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <ShieldCheck size={22} aria-hidden="true" />
          </span>
          <div>
            <p className="text-3xl font-black text-slate-900">{data.teams.length}</p>
            <p className="text-sm font-medium text-slate-400">Teams</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <FileText size={22} aria-hidden="true" />
          </span>
          <div>
            <p className="text-3xl font-black text-slate-900">{standings.length}</p>
            <p className="text-sm font-medium text-slate-400">Table entries</p>
          </div>
        </Card>
      </div>
      <section className="mt-8 grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <div>
          <h2 className="mb-4 text-xl font-bold text-slate-900">Live now</h2>
          <div className="grid gap-4">
            {liveMatches.map((match) => (
              <MatchCard key={match.id} match={match} teams={data.teams} />
            ))}
          </div>
        </div>
        <div>
          <h2 className="mb-4 text-xl font-bold text-slate-900">Coming up</h2>
          <div className="grid gap-4">
            {nextFixtures.map((match) => (
              <MatchCard key={match.id} match={match} teams={data.teams} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
