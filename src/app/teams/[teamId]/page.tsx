"use client";

import { useParams } from "next/navigation";
import { MatchCard } from "@/components/match-card";
import { PlayerStatTable } from "@/components/stat-table";
import { Card, PageHeader, TeamLogo } from "@/components/ui";
import { teamMatches, teamPlayers } from "@/lib/data-store";
import { useTournamentData } from "@/hooks/use-tournament-data";

export default function TeamPage() {
  const params = useParams<{ teamId: string }>();
  const { data, canManageAll, canManageClub, clubAdminTeamIds } = useTournamentData();
  const team = data.teams.find((item) => item.id === params.teamId);

  if (!team) {
    return <PageHeader title="Team not found" description="This team does not exist in the tournament data." />;
  }

  const roster = teamPlayers(data, team.id);
  const matches = teamMatches(data, team.id);
  const rosterApproved = team.rosterStatus === "Approved";
  const canSeeRosterWarning = canManageAll || (canManageClub && clubAdminTeamIds.includes(team.id));
  const visibleRoster = rosterApproved || canSeeRosterWarning ? roster : [];

  return (
    <>
      <div className="mb-8 flex flex-col gap-4 rounded-lg border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-white p-5 shadow-[0_16px_40px_rgba(37,99,235,0.10)] sm:flex-row sm:items-center">
        <TeamLogo team={team} size="h-20 w-20" className="text-2xl" />
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-blue-700">{team.sport} / {team.group}</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">{team.name}</h1>
          <p className="mt-2 text-base text-slate-600">{team.city || "No city set"}</p>
          {rosterApproved ? (
            <span className="mt-3 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-100">Approved roster</span>
          ) : canSeeRosterWarning ? (
            <span className="mt-3 inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-amber-700 ring-1 ring-amber-100">{team.rosterStatus ?? "Draft"} roster</span>
          ) : null}
        </div>
      </div>
      {!rosterApproved && canSeeRosterWarning ? (
        <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
          This roster is not approved for public use yet. Public visitors will not see the roster stats until a main admin approves it.
          {team.rosterNote ? <span className="mt-2 block">{team.rosterNote}</span> : null}
        </div>
      ) : null}
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
              <dd className="font-semibold">{visibleRoster.length}</dd>
            </div>
          </dl>
        </Card>
        <div>
          <h2 className="mb-4 text-lg font-bold text-slate-900">Roster stats</h2>
          {visibleRoster.length > 0 ? (
            <PlayerStatTable players={visibleRoster} teams={data.teams} />
          ) : (
            <Card>
              <p className="text-sm font-semibold text-slate-500">Roster will be published after approval.</p>
            </Card>
          )}
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
