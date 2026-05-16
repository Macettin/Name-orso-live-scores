"use client";

import Link from "next/link";
import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { PageHeader, TeamLogo } from "@/components/ui";
import { useTournamentData } from "@/hooks/use-tournament-data";
import { disciplinaryRows, readYellowCardSuspensionThreshold } from "@/lib/disciplinary";
import type { Player } from "@/lib/types";

function PlayerAvatar({ player }: { player: Player }) {
  if (player.photoUrl) {
    return <span aria-hidden="true" className="h-11 w-11 shrink-0 rounded-xl bg-cover bg-center" style={{ backgroundImage: `url(${player.photoUrl})` }} />;
  }

  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-black text-blue-700 ring-1 ring-blue-100">
      {player.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "P"}
    </span>
  );
}

export default function DisciplinaryPage() {
  const { data, selectedTournamentId } = useTournamentData();
  const [yellowSuspensionThreshold] = useState(readYellowCardSuspensionThreshold);
  const teams = data.teams.filter((team) => !selectedTournamentId || team.tournamentId === selectedTournamentId);
  const teamIds = new Set(teams.map((team) => team.id));
  const players = data.players.filter((player) => teamIds.has(player.teamId));
  const matches = data.matches.filter((match) => !selectedTournamentId || match.tournamentId === selectedTournamentId || teamIds.has(match.homeTeamId) || teamIds.has(match.awayTeamId));
  const events = data.events.filter((event) => !selectedTournamentId || event.tournamentId === selectedTournamentId || matches.some((match) => match.id === event.matchId));
  const rows = disciplinaryRows({ players, teams, matches, events, yellowThreshold: yellowSuspensionThreshold });

  return (
    <div className="grid gap-5">
      <PageHeader title="Disciplinary Center" description={`Tournament cards and automatic suspensions. Current accumulation rule: ${yellowSuspensionThreshold} yellow cards = 1 match suspension.`} />

      <section className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-[0_18px_44px_rgba(37,99,235,0.08)]">
        <div className="flex flex-col gap-3 border-b border-blue-100 bg-blue-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Cards and bans</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">Disciplinary table</h2>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-black text-blue-700 ring-1 ring-blue-100">
            <ShieldAlert size={17} />
            {rows.filter((row) => row.isSuspended).length} suspended
          </div>
        </div>

        <div className="grid gap-3 p-3 md:hidden">
          {rows.map((row) => (
            <div key={row.player.id} className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="flex min-w-0 items-center gap-3">
                <PlayerAvatar player={row.player} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-950">{row.player.name}</p>
                  <p className="truncate text-xs font-bold text-slate-500">{row.team?.name ?? "Team"}</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <span className="rounded-xl bg-yellow-50 px-2 py-2 text-sm font-black text-yellow-700">{row.yellowCards} YC</span>
                <span className="rounded-xl bg-red-50 px-2 py-2 text-sm font-black text-red-700">{row.redCards} RC</span>
                <span className={`rounded-xl px-2 py-2 text-sm font-black ${row.isSuspended ? "bg-red-600 text-white" : "bg-emerald-50 text-emerald-700"}`}>{row.isSuspended ? `${row.matchesSuspended} ban` : "Eligible"}</span>
              </div>
              <p className="mt-3 text-xs font-bold text-slate-500">Next eligible: {row.nextEligibleMatch ? `${row.nextEligibleMatch.date} ${row.nextEligibleMatch.time}` : "Not scheduled"}</p>
            </div>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3 text-center">Yellow</th>
                <th className="px-4 py-3 text-center">Red</th>
                <th className="px-4 py-3">Suspension</th>
                <th className="px-4 py-3">Next eligible</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.player.id}>
                  <td className="px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <PlayerAvatar player={row.player} />
                      <span className="font-black text-slate-950">{row.player.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <TeamLogo team={row.team} size="h-8 w-8" />
                      <span className="font-bold text-slate-700">{row.team?.name ?? "Team"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center font-black text-yellow-700">{row.yellowCards}</td>
                  <td className="px-4 py-3 text-center font-black text-red-700">{row.redCards}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${row.isSuspended ? "bg-red-600 text-white" : "bg-emerald-50 text-emerald-700"}`}>
                      {row.isSuspended ? `Suspended ${row.matchesSuspended} match${row.matchesSuspended === 1 ? "" : "es"}` : "Eligible"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-600">
                    {row.nextEligibleMatch ? <Link href={`/matches/${row.nextEligibleMatch.id}`} className="text-blue-700 hover:underline">{row.nextEligibleMatch.date} {row.nextEligibleMatch.time}</Link> : "Not scheduled"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rows.length === 0 ? <p className="p-5 text-sm font-bold text-slate-500">No disciplinary records yet.</p> : null}
      </section>
    </div>
  );
}
