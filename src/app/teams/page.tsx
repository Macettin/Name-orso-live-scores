"use client";

import Link from "next/link";
import { Card, PageHeader, TeamLogo } from "@/components/ui";
import { useTournamentData } from "@/hooks/use-tournament-data";

export default function TeamsPage() {
  const { data, canManageAll, canManageClub, clubAdminTeamIds } = useTournamentData();

  return (
    <>
      <PageHeader title="Team pages" description="Browse team profiles, rosters, match history, and tournament context." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.teams.map((team) => {
          const rosterApproved = team.rosterStatus === "Approved";
          const canSeeRosterStatus = canManageAll || (canManageClub && clubAdminTeamIds.includes(team.id));

          return (
          <Link key={team.id} href={`/teams/${team.id}`}>
            <Card className="h-full hover:border-blue-300">
              <div className="flex items-center gap-3">
                <TeamLogo team={team} size="h-12 w-12" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-blue-700">{team.sport}</p>
                  <h2 className="truncate text-xl font-bold text-slate-900">{team.name}</h2>
                </div>
              </div>
              {rosterApproved ? (
                <span className="mt-4 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-100">Approved roster</span>
              ) : canSeeRosterStatus ? (
                <span className="mt-4 inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-amber-700 ring-1 ring-amber-100">{team.rosterStatus ?? "Draft"} roster</span>
              ) : null}
              <dl className="mt-4 grid gap-2 text-sm text-slate-600">
                <div className="flex justify-between gap-3">
                  <dt>Group</dt>
                  <dd className="font-semibold text-slate-900">{team.group}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>City</dt>
                  <dd className="font-semibold text-slate-900">{team.city || "-"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Coach</dt>
                  <dd className="font-semibold text-slate-900">{team.coach || "-"}</dd>
                </div>
              </dl>
            </Card>
          </Link>
          );
        })}
      </div>
    </>
  );
}
