"use client";

import { PageHeader, TeamLogo } from "@/components/ui";
import { buildStandings, getTeam } from "@/lib/data-store";
import { useTournamentData } from "@/hooks/use-tournament-data";

export default function StandingsPage() {
  const { data } = useTournamentData();
  const standings = buildStandings(data);

  return (
    <>
      <PageHeader title="Group standings" description="Tournament tables calculated from shared match results." />
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Team</th>
              <th className="px-4 py-3">Sport</th>
              <th className="px-4 py-3">Group</th>
              <th className="px-4 py-3 text-right">P</th>
              <th className="px-4 py-3 text-right">W</th>
              <th className="px-4 py-3 text-right">L</th>
              <th className="px-4 py-3 text-right">For</th>
              <th className="px-4 py-3 text-right">Against</th>
              <th className="px-4 py-3 text-right">Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {standings.map((row, index) => {
              const team = getTeam(data, row.teamId);
              return (
                <tr key={row.teamId}>
                  <td className="px-4 py-3">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-sm font-black text-blue-700 ring-1 ring-blue-100">
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    <div className="flex items-center gap-3">
                      <TeamLogo team={team} size="h-9 w-9" />
                      <span>{team?.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{team?.sport}</td>
                  <td className="px-4 py-3 text-slate-600">{team?.group}</td>
                  <td className="px-4 py-3 text-right">{row.played}</td>
                  <td className="px-4 py-3 text-right">{row.won}</td>
                  <td className="px-4 py-3 text-right">{row.lost}</td>
                  <td className="px-4 py-3 text-right">{row.pointsFor}</td>
                  <td className="px-4 py-3 text-right">{row.pointsAgainst}</td>
                  <td className="px-4 py-3 text-right font-bold">{row.tournamentPoints}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
