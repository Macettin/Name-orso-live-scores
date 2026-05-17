"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Activity, CalendarDays, FileText, ShieldAlert, Trophy } from "lucide-react";
import { MatchCard } from "@/components/match-card";
import { Card, PageHeader, TeamLogo } from "@/components/ui";
import { teamMatches, teamPlayers } from "@/lib/data-store";
import { disciplinaryRows } from "@/lib/disciplinary";
import { useTournamentData } from "@/hooks/use-tournament-data";
import type { Player, PlayerStatKey } from "@/lib/types";

function playerInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "P";
}

function PlayerAvatar({ player }: { player: Player }) {
  if (player.photoUrl) {
    return <span aria-hidden="true" className="h-12 w-12 shrink-0 rounded-full bg-cover bg-center ring-2 ring-blue-100" style={{ backgroundImage: `url(${player.photoUrl})` }} />;
  }

  return <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-black text-blue-700 ring-1 ring-blue-100">{playerInitials(player.name)}</span>;
}

function scoringStatForSport(sport: string): PlayerStatKey {
  return sport === "Football" ? "goals" : "points";
}

function PlayerLeaderList({ title, label, rows }: { title: string; label: string; rows: { player: Player; total: number }[] }) {
  return (
    <Card>
      <h2 className="text-lg font-black text-slate-950">{title}</h2>
      <div className="mt-4 grid gap-3">
        {rows.map((row, index) => (
          <div key={row.player.id} className="flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-sm font-black text-white">{index + 1}</span>
            <PlayerAvatar player={row.player} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-black text-slate-950">{row.player.name}</p>
              <p className="text-xs font-semibold text-slate-500">#{row.player.number} / {row.player.position || "Player"}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-blue-700">{row.total}</p>
              <p className="text-[10px] font-black uppercase tracking-wide text-blue-500">{label}</p>
            </div>
          </div>
        ))}
        {rows.length === 0 ? <p className="rounded-lg border border-slate-200 px-4 py-5 text-sm font-semibold text-slate-400">No leaders available yet.</p> : null}
      </div>
    </Card>
  );
}

export default function TeamPage() {
  const params = useParams<{ teamId: string }>();
  const { data, canManageAll, canManageClub, clubAdminTeamIds } = useTournamentData();
  const team = data.teams.find((item) => item.id === params.teamId);

  if (!team) {
    return <PageHeader title="Team not found" description="This team does not exist in the tournament data." />;
  }

  const tournament = data.tournaments.find((item) => item.id === team.tournamentId);
  const roster = teamPlayers(data, team.id).sort((first, second) => first.number - second.number || first.name.localeCompare(second.name));
  const matches = teamMatches(data, team.id).sort((first, second) => `${first.date} ${first.time}`.localeCompare(`${second.date} ${second.time}`));
  const recentMatches = matches.filter((match) => match.status === "Final").slice(-3).reverse();
  const upcomingFixtures = matches.filter((match) => match.status !== "Final").slice(0, 3);
  const rosterApproved = team.rosterStatus === "Approved";
  const canManageThisTeam = canManageAll || (canManageClub && clubAdminTeamIds.includes(team.id));
  const visibleRoster = rosterApproved || canManageThisTeam ? roster : [];
  const scoringStat = scoringStatForSport(team.sport);
  const topScorers = visibleRoster
    .map((player) => ({ player, total: player.stats[scoringStat] ?? 0 }))
    .filter((row) => row.total > 0)
    .sort((first, second) => second.total - first.total || first.player.name.localeCompare(second.player.name))
    .slice(0, 5);
  const assistLeaders = visibleRoster
    .map((player) => ({ player, total: player.stats.assists ?? 0 }))
    .filter((row) => row.total > 0)
    .sort((first, second) => second.total - first.total || first.player.name.localeCompare(second.player.name))
    .slice(0, 5);
  const disciplinary = disciplinaryRows({ players: visibleRoster, teams: data.teams, matches: data.matches, events: data.events });

  return (
    <div className="grid gap-8">
      <section className="overflow-hidden rounded-lg border border-blue-100 bg-white shadow-[0_20px_58px_rgba(37,99,235,0.12)]">
        <div className="relative bg-gradient-to-br from-blue-950 via-blue-700 to-blue-500 p-5 text-white sm:p-7">
          <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_85%_12%,rgba(255,255,255,0.22),transparent_26%),linear-gradient(135deg,rgba(15,23,42,0.24),rgba(37,99,235,0.06))]" />
          <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
              <TeamLogo team={team} size="h-24 w-24" className="bg-white/95 text-3xl shadow-xl ring-white/25" />
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-100">{tournament?.name ?? "Tournament"}</p>
                <h1 className="mt-2 break-words text-4xl font-black tracking-tight sm:text-5xl">{team.name}</h1>
                <p className="mt-3 text-sm font-bold text-blue-50/90">{team.sport} / {team.group} / {team.city || "City TBA"}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {rosterApproved ? <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-black uppercase text-emerald-50 ring-1 ring-emerald-200/50">Approved roster</span> : null}
                  <span className="rounded-full bg-white/12 px-3 py-1 text-xs font-black uppercase text-blue-50 ring-1 ring-white/20">{visibleRoster.length} players</span>
                </div>
              </div>
            </div>
            {canManageThisTeam ? (
              <Link href={`/reports/team-roster/${team.id}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/30 bg-white/12 px-4 py-2 text-sm font-black text-white shadow-sm backdrop-blur transition hover:bg-white/20">
                <FileText size={16} aria-hidden="true" />
                Printable roster
              </Link>
            ) : null}
          </div>
        </div>
        <div className="grid border-t border-blue-100 bg-white sm:grid-cols-4">
          {[
            ["Coach", team.coach || "-"],
            ["Colors", team.colors || "-"],
            ["Recent finals", recentMatches.length.toString()],
            ["Upcoming", upcomingFixtures.length.toString()]
          ].map(([label, value]) => (
            <div key={label} className="border-b border-blue-100 px-5 py-4 sm:border-b-0 sm:border-r last:border-r-0">
              <p className="text-xs font-black uppercase tracking-wide text-blue-700">{label}</p>
              <p className="mt-1 break-words text-lg font-black text-slate-950">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-black text-slate-950">Player roster</h2>
            {rosterApproved ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase text-emerald-700 ring-1 ring-emerald-100">Public</span> : null}
          </div>
          {visibleRoster.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {visibleRoster.map((player) => (
                <article key={player.id} className="flex min-w-0 items-center gap-3 rounded-lg border border-blue-100 bg-blue-50/40 px-3 py-3">
                  <PlayerAvatar player={player} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-black text-slate-950">#{player.number} {player.name}</p>
                    <p className="text-sm font-semibold text-slate-500">{player.position || "Player"}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-400">{[player.country, player.birthdate].filter(Boolean).join(" / ") || "Profile details pending"}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-5 text-sm font-semibold text-slate-500">Roster will be published after approval.</p>
          )}
        </Card>

        <div className="grid gap-5">
          <PlayerLeaderList title="Top scorers" label={scoringStat === "goals" ? "Goals" : "Points"} rows={topScorers} />
          <PlayerLeaderList title="Assist leaders" label="Assists" rows={assistLeaders} />
        </div>
      </section>

      {disciplinary.length > 0 ? (
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <ShieldAlert size={20} className="text-amber-600" aria-hidden="true" />
            <h2 className="text-xl font-black text-slate-950">Disciplinary summary</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {disciplinary.map((row) => (
              <div key={row.player.id} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm">
                <p className="font-black text-amber-900">#{row.player.number} {row.player.name}</p>
                <p className="mt-1 font-semibold text-amber-800">{row.yellowCards} yellow / {row.redCards} red{row.isSuspended ? ` / suspended ${row.matchesSuspended}` : ""}</p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-lg border border-blue-100 bg-blue-50/40 p-4">
          <div className="mb-4 flex items-center gap-2">
            <Activity size={20} className="text-blue-700" aria-hidden="true" />
            <h2 className="text-xl font-black text-slate-950">Recent matches</h2>
          </div>
          <div className="grid gap-4">
            {recentMatches.map((match) => <MatchCard key={match.id} match={match} teams={data.teams} />)}
            {recentMatches.length === 0 ? <p className="rounded-lg bg-slate-50 px-4 py-5 text-sm font-semibold text-slate-500">No final matches yet.</p> : null}
          </div>
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays size={20} className="text-blue-700" aria-hidden="true" />
            <h2 className="text-xl font-black text-slate-950">Upcoming fixtures</h2>
          </div>
          <div className="grid gap-4">
            {upcomingFixtures.map((match) => <MatchCard key={match.id} match={match} teams={data.teams} />)}
            {upcomingFixtures.length === 0 ? <p className="rounded-lg bg-slate-50 px-4 py-5 text-sm font-semibold text-slate-500">No upcoming fixtures listed.</p> : null}
          </div>
        </section>
      </section>

      <section className="rounded-lg border border-blue-100 bg-blue-50 px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <Trophy size={20} className="text-blue-700" aria-hidden="true" />
          <p className="text-sm font-black text-blue-950">{team.name} is part of {tournament?.name ?? "the selected tournament"}.</p>
          <Link href="/standings" className="rounded-lg bg-white px-3 py-2 text-sm font-black text-blue-700 ring-1 ring-blue-100 hover:bg-blue-100">View standings</Link>
        </div>
      </section>
    </div>
  );
}
