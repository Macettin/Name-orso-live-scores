"use client";

import Link from "next/link";
import { useState } from "react";
import { clsx } from "clsx";
import { LiveUpdateIndicator } from "@/components/live-update-indicator";
import { PageHeader, TeamLogo } from "@/components/ui";
import { buildStandings, getTeam, type TournamentData } from "@/lib/data-store";
import { useTournamentData } from "@/hooks/use-tournament-data";
import type { Player, PlayerStatKey, Team } from "@/lib/types";

type StandingsTab = "teams" | "scorers" | "assists";

const tabs: { id: StandingsTab; label: string }[] = [
  { id: "teams", label: "Team Standings" },
  { id: "scorers", label: "Top Scorers" },
  { id: "assists", label: "Assist Leaders" }
];

function playerInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "P";
}

function PlayerAvatar({ player }: { player: Player }) {
  if (player.photoUrl) {
    return <span aria-hidden="true" className="h-11 w-11 shrink-0 rounded-full bg-cover bg-center ring-1 ring-blue-100" style={{ backgroundImage: `url(${player.photoUrl})` }} />;
  }

  return <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-black text-blue-700 ring-1 ring-blue-100">{playerInitials(player.name)}</span>;
}

function scoringStatForTeam(team?: Team): PlayerStatKey {
  return team?.sport === "Football" ? "goals" : "points";
}

function TeamStandingsTable({ data }: { data: TournamentData }) {
  const standings = buildStandings(data);

  return (
    <>
    <div className="grid gap-3 sm:hidden">
      {standings.map((row, index) => {
        const team = getTeam(data, row.teamId);
        return (
          <Link key={row.teamId} href={team ? `/teams/${team.id}` : "/teams"} className="orso-card block p-4 transition hover:border-blue-200 hover:bg-blue-50/30">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-sm font-black text-white">{index + 1}</span>
              <TeamLogo team={team} size="h-10 w-10" />
              <div className="min-w-0 flex-1">
                <h2 className="orso-team-name orso-team-name-2 text-base font-black leading-tight text-slate-950">{team?.name}</h2>
                <p className="mt-1 text-xs font-bold text-slate-500">{team?.sport} / {team?.group}</p>
              </div>
              <div className="rounded-lg bg-blue-50 px-3 py-2 text-center">
                <p className="text-[10px] font-black uppercase tracking-wide text-blue-500">Pts</p>
                <p className="text-xl font-black text-blue-700">{row.tournamentPoints}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-5 gap-2 text-center text-xs">
              {[
                ["P", row.played],
                ["W", row.won],
                ["L", row.lost],
                ["For", row.pointsFor],
                ["Ag", row.pointsAgainst]
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-slate-50 px-2 py-2">
                  <p className="font-black uppercase text-slate-400">{label}</p>
                  <p className="mt-1 text-sm font-black text-slate-900">{value}</p>
                </div>
              ))}
            </div>
          </Link>
        );
      })}
    </div>
    <div className="orso-card hidden overflow-x-auto sm:block">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
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
              <tr key={row.teamId} className="transition hover:bg-blue-50/40">
                <td className="px-4 py-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-sm font-black text-blue-700 ring-1 ring-blue-100">
                    {index + 1}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold text-slate-900">
                  <Link href={team ? `/teams/${team.id}` : "/teams"} className="flex min-w-56 items-center gap-3 rounded-lg transition hover:text-blue-700">
                    <TeamLogo team={team} size="h-9 w-9" />
                    <span className="orso-team-name orso-team-name-2">{team?.name}</span>
                  </Link>
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

function Leaderboard({ data, type }: { data: TournamentData; type: "scoring" | "assists" }) {
  const rows = data.players
    .map((player) => {
      const team = getTeam(data, player.teamId);
      const statKey = type === "assists" ? "assists" : scoringStatForTeam(team);

      return {
        player,
        team,
        statKey,
        total: player.stats[statKey] ?? 0
      };
    })
    .sort((first, second) => second.total - first.total || first.player.name.localeCompare(second.player.name));

  return (
    <div className="grid gap-3">
      {rows.map((row, index) => (
        <div key={row.player.id} className="orso-card grid gap-3 p-4 transition hover:border-blue-200 hover:bg-blue-50/30 sm:grid-cols-[auto_1fr_auto] sm:items-center">
          <div className="flex items-center gap-3">
            <span className={clsx("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-black", index < 3 ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700")}>
              {index + 1}
            </span>
            <PlayerAvatar player={row.player} />
          </div>
          <div className="min-w-0">
            <p className="break-words text-base font-black text-slate-950">{row.player.name}</p>
            <div className="mt-1 flex min-w-0 items-center gap-2">
              <TeamLogo team={row.team} size="h-7 w-7" />
              <Link href={row.team ? `/teams/${row.team.id}` : "/teams"} className="orso-team-name orso-team-name-2 text-sm font-semibold text-slate-500 hover:text-blue-700">{row.team?.name ?? "Team unavailable"}</Link>
            </div>
          </div>
          <div className="rounded-lg bg-blue-50 px-4 py-3 text-left sm:text-right">
            <p className="text-xs font-black uppercase tracking-wide text-blue-500">{type === "assists" ? "Assists" : row.statKey === "goals" ? "Goals" : "Points"}</p>
            <p className="mt-1 text-3xl font-black text-blue-700">{row.total}</p>
          </div>
        </div>
      ))}
      {rows.length === 0 ? <p className="rounded-lg border border-slate-200 bg-white px-4 py-5 text-sm font-semibold text-slate-400">No players available.</p> : null}
    </div>
  );
}

export default function StandingsPage() {
  const { data, lastUpdatedAt } = useTournamentData();
  const [activeTab, setActiveTab] = useState<StandingsTab>("teams");

  return (
    <>
      <PageHeader title="Group standings" description="Tournament tables and player leaderboards for the selected tournament." action={<LiveUpdateIndicator lastUpdatedAt={lastUpdatedAt} />} />

      <nav className="orso-tabbar mb-5">
        <div className="grid min-w-max grid-cols-3 gap-1 sm:min-w-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "orso-tab",
                activeTab === tab.id ? "orso-tab-active" : "orso-tab-inactive"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {activeTab === "teams" ? <TeamStandingsTable data={data} /> : null}
      {activeTab === "scorers" ? <Leaderboard data={data} type="scoring" /> : null}
      {activeTab === "assists" ? <Leaderboard data={data} type="assists" /> : null}
    </>
  );
}
