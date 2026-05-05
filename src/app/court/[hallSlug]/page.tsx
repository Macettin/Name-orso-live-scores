"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { MatchQrCode } from "@/components/qr-code";
import { Card, PageHeader, StatusPill } from "@/components/ui";
import { getTeam } from "@/lib/data-store";
import { useTournamentData } from "@/hooks/use-tournament-data";

export default function CourtPage() {
  const params = useParams<{ hallSlug: string }>();
  const { data } = useTournamentData();
  const hallMatches = data.matches
    .filter((match) => match.hallSlug === params.hallSlug)
    .sort((first, second) => `${first.date} ${first.time}`.localeCompare(`${second.date} ${second.time}`));

  if (hallMatches.length === 0) {
    return <PageHeader title="Court not found" description="No matches exist for this court in the tournament data." />;
  }

  const hallName = params.hallSlug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  const featuredMatch = hallMatches.find((match) => match.status === "Live") ?? hallMatches.find((match) => match.status === "Scheduled") ?? hallMatches[0];
  const featuredHome = getTeam(data, featuredMatch.homeTeamId);
  const featuredAway = getTeam(data, featuredMatch.awayTeamId);

  return (
    <>
      <PageHeader title={`${hallName} match board`} description="QR-code-ready court and hall page for spectators and staff." />
      <Card className="mb-5 border-blue-100 bg-blue-50/40">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-blue-700">
              {featuredMatch.status === "Live" ? "Current match" : "Next match"}
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">
              {featuredHome?.name} vs {featuredAway?.name}
            </h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              {featuredMatch.date} {featuredMatch.time} - {featuredMatch.court} - {featuredMatch.periodLabel}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill status={featuredMatch.status} />
            <Link href={`/matches/${featuredMatch.id}`} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-blue-700">
              Open match page
            </Link>
          </div>
        </div>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        {hallMatches.map((match) => {
          const home = getTeam(data, match.homeTeamId);
          const away = getTeam(data, match.awayTeamId);
          return (
            <Card key={match.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-400">
                    {match.court} - {match.sport}
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-slate-900">
                    {home?.name} vs {away?.name}
                  </h2>
                </div>
                <StatusPill status={match.status} />
              </div>
              <div className="mt-4 flex items-center justify-between gap-4">
                <Link href={`/matches/${match.id}`} className="rounded-lg bg-slate-950 px-5 py-3 text-2xl font-black text-white">
                  {match.homeScore} - {match.awayScore}
                </Link>
                <MatchQrCode value={`/matches/${match.id}`} />
              </div>
              <p className="mt-3 text-sm font-medium text-slate-600">{match.periodLabel}</p>
            </Card>
          );
        })}
      </div>
    </>
  );
}
