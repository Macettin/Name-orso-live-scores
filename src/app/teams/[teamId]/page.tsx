"use client";

import { useParams } from "next/navigation";
import { MatchCard } from "@/components/match-card";
import { PlayerStatTable } from "@/components/stat-table";
import { Card, PageHeader } from "@/components/ui";
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
      <PageHeader title={team.name} description={`${team.sport} - ${team.group} - ${team.city || "No city set"}`} />
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
