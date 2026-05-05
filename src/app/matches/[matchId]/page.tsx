"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { Card, PageHeader, TeamLogo } from "@/components/ui";
import { getTeam } from "@/lib/data-store";
import { useTournamentData } from "@/hooks/use-tournament-data";
import { playerStatLabels, playerStatsBySport, type MatchEvent, type MatchEventType, type Player, type PlayerStatKey, type Team } from "@/lib/types";

const eventIcons: Record<MatchEventType, string> = {
  goal: "\u26bd",
  yellow: "",
  red: "",
  substitution: "\u21c4"
};

const eventLabels: Record<MatchEventType, string> = {
  goal: "Goal",
  yellow: "Yellow card",
  red: "Red card",
  substitution: "Substitution"
};

function minuteSortValue(event: MatchEvent) {
  const normalized = event.minute.toLowerCase().trim();

  if (normalized === "ht") return 45;
  if (normalized === "ft") return 120;

  const [base, stoppage] = normalized.replace("'", "").split("+");
  const baseMinute = Number(base);
  const stoppageMinute = Number(stoppage ?? 0);

  return Number.isFinite(baseMinute) ? baseMinute + stoppageMinute / 100 : 999;
}

function playerInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "P";
}

function PlayerAvatar({ player, size = "h-10 w-10" }: { player?: Player | null; size?: string }) {
  if (player?.photoUrl) {
    return <span aria-hidden="true" className={clsx("shrink-0 rounded-full bg-cover bg-center", size)} style={{ backgroundImage: `url(${player.photoUrl})` }} />;
  }

  return (
    <span className={clsx("flex shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-black text-blue-700", size)}>
      {player ? playerInitials(player.name) : "?"}
    </span>
  );
}

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={clsx("p-4 sm:p-5", className)}>
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <h2 className="text-lg font-black text-slate-900">{title}</h2>
      </div>
      {children}
    </Card>
  );
}

function TeamRoster({ team, players }: { team?: Team; players: Player[] }) {
  if (!team) {
    return null;
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
      <div className="flex min-w-0 items-center gap-3">
        <TeamLogo team={team} size="h-11 w-11" />
        <div className="min-w-0">
          <h3 className="break-words text-base font-black text-slate-900">{team.name}</h3>
          <p className="text-sm font-semibold text-slate-400">{players.length} players</p>
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {players.length > 0 ? (
          players.map((player) => (
            <div key={player.id} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-3">
              <PlayerAvatar player={player} />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900">
                  #{player.number} {player.name}
                </p>
                <p className="truncate text-sm text-slate-500">{player.position || "Player"}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-400">Roster not available.</p>
        )}
      </div>
    </div>
  );
}

function EventIcon({ type }: { type: MatchEventType }) {
  if (type === "yellow" || type === "red") {
    return <span className={clsx("mt-1 h-5 w-3 rounded-sm shadow-sm", type === "yellow" ? "bg-yellow-300" : "bg-red-600")} aria-hidden="true" />;
  }

  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-sm font-black text-blue-700 ring-1 ring-blue-100" aria-hidden="true">
      {eventIcons[type]}
    </span>
  );
}

function statKeysForTeam(team?: Team): readonly PlayerStatKey[] {
  return team ? playerStatsBySport[team.sport] : ["points"];
}

function TeamPlayerStats({ team, players }: { team?: Team; players: Player[] }) {
  if (!team) {
    return null;
  }

  const statKeys = statKeysForTeam(team);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <div className="flex items-center gap-3 bg-blue-50 px-4 py-3">
        <TeamLogo team={team} size="h-9 w-9" />
        <h3 className="break-words font-black text-blue-900">{team.name}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-white text-left text-xs font-bold uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Player</th>
              {statKeys.map((stat) => (
                <th key={stat} className="px-4 py-3 text-right">
                  {playerStatLabels[stat]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {players.map((player) => (
              <tr key={player.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <PlayerAvatar player={player} size="h-8 w-8" />
                    <span className="whitespace-nowrap font-bold text-slate-900">#{player.number} {player.name}</span>
                  </div>
                </td>
                {statKeys.map((stat) => (
                  <td key={stat} className="px-4 py-3 text-right font-semibold text-slate-700">
                    {player.stats[stat]}
                  </td>
                ))}
              </tr>
            ))}
            {players.length === 0 ? (
              <tr>
                <td className="px-4 py-3 text-slate-400" colSpan={statKeys.length + 1}>
                  Stats not available.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function MatchPage() {
  const params = useParams<{ matchId: string }>();
  const { data } = useTournamentData();
  const match = data.matches.find((item) => item.id === params.matchId);
  const scoreSignature = match ? `${match.homeScore}-${match.awayScore}-${match.status}-${match.matchMinute ?? ""}-${match.periodLabel}` : "";
  const eventSignature = data.events
    .filter((event) => event.matchId === params.matchId)
    .map((event) => `${event.id}:${event.minute}:${event.type}`)
    .join("|");
  const previousScoreSignature = useRef(scoreSignature);
  const previousEventSignature = useRef(eventSignature);
  const [scoreHighlight, setScoreHighlight] = useState(false);
  const [eventHighlight, setEventHighlight] = useState(false);

  useEffect(() => {
    if (scoreSignature && previousScoreSignature.current !== scoreSignature) {
      setScoreHighlight(true);
      const timeout = window.setTimeout(() => setScoreHighlight(false), 900);
      previousScoreSignature.current = scoreSignature;
      return () => window.clearTimeout(timeout);
    }

    previousScoreSignature.current = scoreSignature;
  }, [scoreSignature]);

  useEffect(() => {
    if (eventSignature && previousEventSignature.current !== eventSignature) {
      setEventHighlight(true);
      const timeout = window.setTimeout(() => setEventHighlight(false), 900);
      previousEventSignature.current = eventSignature;
      return () => window.clearTimeout(timeout);
    }

    previousEventSignature.current = eventSignature;
  }, [eventSignature]);

  if (!match) {
    return <PageHeader title="Match not found" description="This match does not exist in the tournament data." />;
  }

  const home = getTeam(data, match.homeTeamId);
  const away = getTeam(data, match.awayTeamId);
  const tournament = data.tournaments.find((item) => item.id === match.tournamentId);
  const events = data.events.filter((event) => event.matchId === match.id).sort((first, second) => minuteSortValue(first) - minuteSortValue(second));
  const homePlayers = data.players.filter((player) => player.teamId === match.homeTeamId);
  const awayPlayers = data.players.filter((player) => player.teamId === match.awayTeamId);
  const accent = tournament?.primaryColor || "#2563eb";
  const clockLabel = match.clockLabel || match.matchMinute || match.periodLabel;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-blue-700">Public match center</p>
          <h1 className="mt-1 break-words text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            {home?.name ?? "Home"} vs {away?.name ?? "Away"}
          </h1>
        </div>
        <Link href={`/scoreboard/${match.id}`} className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 shadow-sm transition hover:bg-blue-100">
          Open scoreboard
        </Link>
      </div>
      <div className="grid gap-6">
        <section className="overflow-hidden rounded-lg border border-blue-100 bg-white shadow-[0_18px_44px_rgba(37,99,235,0.12)]">
          <div
            className={clsx(
              "relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-blue-900 p-5 text-white sm:p-7",
              scoreHighlight && "orso-highlight"
            )}
            style={{ background: `linear-gradient(135deg, ${accent}, #1d4ed8 48%, #0f172a)` }}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-white/35" />
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                {tournament?.logoUrl ? (
                  <span className="h-14 w-14 shrink-0 rounded-lg bg-white/15 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${tournament.logoUrl})` }} />
                ) : (
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-white/15 text-lg font-black">
                    {(tournament?.name || "OR").slice(0, 2).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="break-words text-xl font-black sm:text-2xl">{tournament?.name || "Tournament"}</p>
                  <p className="text-sm font-bold uppercase tracking-wide text-white/65">Live match center</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white px-3 py-1.5 text-sm font-black uppercase text-blue-700 shadow-sm">{match.status}</span>
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-black text-white">{clockLabel}</span>
                {match.status === "Live" ? <span className="h-3 w-3 rounded-full bg-red-400 shadow-[0_0_18px_rgba(248,113,113,0.9)]" /> : null}
              </div>
            </div>

            <div className="mt-8 grid items-center gap-5 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
              <Link href={home ? `/teams/${home.id}` : "/teams"} className="min-w-0 rounded-lg border border-white/15 bg-white/10 p-4 text-left shadow-sm transition hover:bg-white/15">
                <div className="flex items-center gap-3">
                  <TeamLogo team={home} size="h-14 w-14" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold uppercase tracking-wide text-white/60">Home</p>
                    <p className="mt-1 break-words text-2xl font-black sm:text-4xl">{home?.name ?? "Home"}</p>
                  </div>
                </div>
              </Link>
              <div className="rounded-lg bg-white px-5 py-4 text-center text-6xl font-black leading-none text-blue-700 shadow-xl ring-1 ring-white/80 sm:px-8 sm:text-7xl lg:text-8xl">
                <span>{match.homeScore}</span>
                <span className="px-3 text-slate-300">-</span>
                <span>{match.awayScore}</span>
              </div>
              <Link href={away ? `/teams/${away.id}` : "/teams"} className="min-w-0 rounded-lg border border-white/15 bg-white/10 p-4 text-left shadow-sm transition hover:bg-white/15 md:text-right">
                <div className="flex items-center justify-end gap-3">
                  <div className="min-w-0 order-2 md:order-1">
                    <p className="text-sm font-bold uppercase tracking-wide text-white/60">Away</p>
                    <p className="mt-1 break-words text-2xl font-black sm:text-4xl">{away?.name ?? "Away"}</p>
                  </div>
                  <TeamLogo team={away} size="h-14 w-14" className="order-1 md:order-2" />
                </div>
              </Link>
            </div>

            <div className="mt-6 grid gap-3 text-sm font-bold text-white/75 sm:grid-cols-3">
              <div className="rounded-lg bg-white/10 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-white/45">Clock</p>
                <p className="mt-1 text-xl font-black text-white">{clockLabel}</p>
              </div>
              <div className="rounded-lg bg-white/10 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-white/45">Court / Hall</p>
                <p className="mt-1 text-xl font-black text-white">{match.court} / {match.hallSlug}</p>
              </div>
              <div className="rounded-lg bg-white/10 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-white/45">Match time</p>
                <p className="mt-1 text-xl font-black text-white">{match.date} {match.time}</p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="grid gap-6">
            <Section title={`Timeline (${events.length})`}>
              <div className={clsx("grid gap-3", eventHighlight && "orso-highlight")}>
                {events.length > 0 ? (
                  events.map((event) => {
                    const team = event.teamId ? getTeam(data, event.teamId) : null;
                    const player = event.playerId ? data.players.find((item) => item.id === event.playerId) : null;

                    return (
                      <div key={event.id} className="flex gap-3 rounded-lg border border-blue-100 bg-blue-50/40 px-3 py-3 shadow-sm sm:px-4">
                        <span className="shrink-0 self-start rounded-lg bg-white px-2.5 py-1 text-sm font-black text-blue-700 shadow-sm">{event.minute}</span>
                        <EventIcon type={event.type} />
                        <PlayerAvatar player={player} size="h-9 w-9" />
                        <div className="min-w-0">
                          <p className="text-sm font-black text-slate-900">{eventLabels[event.type]}</p>
                          <p className="mt-1 text-sm text-slate-600">
                            {[team?.name, player?.name, event.description].filter(Boolean).join(" - ") || "Match event"}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-400">No timeline events yet.</p>
                )}
              </div>
            </Section>

            <Section title="Team rosters">
              <div className="grid gap-4 lg:grid-cols-2">
                <TeamRoster team={home} players={homePlayers} />
                <TeamRoster team={away} players={awayPlayers} />
              </div>
            </Section>

            <Section title="Player stats">
              <div className="grid gap-4">
                <TeamPlayerStats team={home} players={homePlayers} />
                <TeamPlayerStats team={away} players={awayPlayers} />
              </div>
            </Section>
          </div>

          <aside className="grid gap-6 self-start">
            <Section title="Match info">
              <div className="grid gap-3 text-sm">
                {[
                  ["Status", match.status],
                  ["Sport", match.sport],
                  ["Group", match.group],
                  ["Clock", clockLabel],
                  ["Period", match.periodLabel],
                  ["Court", match.court],
                  ["Hall", match.hallSlug],
                  ["Date", match.date],
                  ["Time", match.time]
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-4 rounded-lg bg-slate-50 px-3 py-2">
                    <span className="font-semibold text-slate-500">{label}</span>
                    <span className="break-words text-right font-bold text-slate-900">{value}</span>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Match report">
              <p className="leading-7 text-slate-600">
                {match.report ?? "Report will be published after the match. Scorekeepers can update the match from the admin panel."}
              </p>
            </Section>
          </aside>
        </div>
      </div>
    </>
  );
}
