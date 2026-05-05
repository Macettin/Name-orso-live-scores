"use client";

import { useParams } from "next/navigation";
import { MatchCard } from "@/components/match-card";
import { PlayerStatTable } from "@/components/stat-table";
import { Card, PageHeader, TeamLogo } from "@/components/ui";
import { teamMatches, teamPlayers } from "@/lib/data-store";
import { useTournamentData } from "@/hooks/use-tournament-data";

export default function TeamPage() {
  const params = useParams<{ teamId: string }>();
  const { data } = useTournamentData();
  const team = data.teams.find((item) => item.id === params.teamId);

  if (!team) {
    return <PageHeader title="Team not found" description="This team does not exist in the tournament data." />;
  }

  const roster = teamPlayers(data, team.id);
  const matches = teamMatches(data, team.id);

  return (
    <>
      <div className="mb-8 flex flex-col gap-4 rounded-lg border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-white p-5 shadow-[0_16px_40px_rgba(37,99,235,0.10)] sm:flex-row sm:items-center">
        <TeamLogo team={team} size="h-20 w-20" className="text-2xl" />
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-blue-700">{team.sport} / {team.group}</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">{team.name}</h1>
          <p className="mt-2 text-base text-slate-600">{team.city || "No city set"}</p>
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <h2 className="text-lg font-bold text-slate-900">Team profile</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Coach</dt>
              <dd className="font-semibold">{team.coach || "-"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Colors</dt>
              <dd className="font-semibold">{team.colors || "-"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Roster size</dt>
              <dd className="font-semibold">{roster.length}</dd>
            </div>
          </dl>
        </Card>
        <div>
          <h2 className="mb-4 text-lg font-bold text-slate-900">Roster stats</h2>
          <PlayerStatTable players={roster} teams={data.teams} />
        </div>
      </div>
      <section className="mt-8">
        <h2 className="mb-4 text-lg font-bold text-slate-900">Matches</h2>
        <div className="grid gap-4">
          {matches.map((match) => (
            <MatchCard key={match.id} match={match} teams={data.teams} />
          ))}
        </div>
      </section>
    </>
  );
}
