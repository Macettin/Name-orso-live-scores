"use client";

import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import { useTournamentData } from "@/hooks/use-tournament-data";

export default function TeamsPage() {
  const { data } = useTournamentData();

  return (
    <>
      <PageHeader title="Team pages" description="Browse team profiles, rosters, match history, and tournament context." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.teams.map((team) => (
          <Link key={team.id} href={`/teams/${team.id}`}>
            <Card className="h-full hover:border-blue-300">
              <p className="text-sm font-semibold text-blue-700">{team.sport}</p>
              <h2 className="mt-2 text-xl font-bold text-slate-900">{team.name}</h2>
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
        ))}
      </div>
    </>
  );
}
