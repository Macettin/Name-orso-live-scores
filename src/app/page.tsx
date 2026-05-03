"use client";

import Link from "next/link";
import { Activity, CalendarDays, FileText, ShieldCheck } from "lucide-react";
import { MatchCard } from "@/components/match-card";
import { Card, PageHeader } from "@/components/ui";
import { buildStandings } from "@/lib/data-store";
import { useTournamentData } from "@/hooks/use-tournament-data";

export default function Home() {
  const { data } = useTournamentData();
  const liveMatches = data.matches.filter((match) => match.status === "Live");
  const nextFixtures = data.matches.filter((match) => match.status === "Scheduled").slice(0, 3);
  const standings = buildStandings(data);

  return (
    <>
      <PageHeader
        eyebrow="Tournament dashboard"
        title="Orso Live Scores"
        description="Follow volleyball and basketball fixtures, live scoreboards, group tables, team pages, player stats, match reports, and court-specific QR pages from one tournament hub."
        action={
          <Link href="/live" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
            View live scores
          </Link>
        }
      />
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <Activity className="mb-3 text-emerald-700" aria-hidden="true" />
          <p className="text-3xl font-bold">{liveMatches.length}</p>
          <p className="text-sm text-slate-500">Live matches</p>
        </Card>
        <Card>
          <CalendarDays className="mb-3 text-emerald-700" aria-hidden="true" />
          <p className="text-3xl font-bold">{data.matches.length}</p>
          <p className="text-sm text-slate-500">Fixtures</p>
        </Card>
        <Card>
          <ShieldCheck className="mb-3 text-emerald-700" aria-hidden="true" />
          <p className="text-3xl font-bold">{data.teams.length}</p>
          <p className="text-sm text-slate-500">Teams</p>
        </Card>
        <Card>
          <FileText className="mb-3 text-emerald-700" aria-hidden="true" />
          <p className="text-3xl font-bold">{standings.length}</p>
          <p className="text-sm text-slate-500">Table entries</p>
        </Card>
      </div>
      <section className="mt-8 grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <div>
          <h2 className="mb-4 text-xl font-bold text-slate-950">Live now</h2>
          <div className="grid gap-4">
            {liveMatches.map((match) => (
              <MatchCard key={match.id} match={match} teams={data.teams} />
            ))}
          </div>
        </div>
        <div>
          <h2 className="mb-4 text-xl font-bold text-slate-950">Coming up</h2>
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
