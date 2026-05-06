"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { PageHeader, TeamLogo } from "@/components/ui";
import { YouTubeEmbed } from "@/components/youtube-embed";
import { getTeam } from "@/lib/data-store";
import { groupGoalEventsByScorer } from "@/lib/goal-scorers";
import { useTournamentData } from "@/hooks/use-tournament-data";
import { formatMatchClock } from "@/lib/match-clock";
import { playerStatLabels, playerStatsBySport, type MatchEvent, type MatchEventType, type Player, type PlayerStatKey, type Team } from "@/lib/types";

type MatchTab = "timeline" | "lineups" | "stats" | "stream";

const matchTabs: { id: MatchTab; label: string }[] = [
  { id: "timeline", label: "Timeline" },
  { id: "lineups", label: "Lineups" },
  { id: "stats", label: "Stats" },
  { id: "stream", label: "Stream" }
];

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
    return <span aria-hidden="true" className={clsx("shrink-0 rounded-full bg-cover bg-center ring-1 ring-blue-100", size)} style={{ backgroundImage: `url(${player.photoUrl})` }} />;
  }

  return (
    <span className={clsx("flex shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-black text-blue-700 ring-1 ring-blue-100", size)}>
      {player ? playerInitials(player.name) : "?"}
    </span>
  );
}

function Panel({ title, eyebrow, children, className }: { title: string; eyebrow?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={clsx("overflow-hidden rounded-lg border border-blue-100 bg-white shadow-[0_16px_42px_rgba(37,99,235,0.09)]", className)}>
      <div className="border-b border-blue-50 px-4 py-4 sm:px-5">
        {eyebrow ? <p className="text-xs font-black uppercase tracking-wide text-blue-600">{eyebrow}</p> : null}
        <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">{title}</h2>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function TeamRoster({ team, players }: { team?: Team; players: Player[] }) {
  if (!team) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex min-w-0 items-center gap-3 bg-blue-50 px-4 py-3">
        <TeamLogo team={team} size="h-12 w-12" />
        <div className="min-w-0">
          <h3 className="break-words text-base font-black text-slate-950">{team.name}</h3>
          <p className="text-sm font-semibold text-blue-700">{players.length} players</p>
        </div>
      </div>
      <div className="grid divide-y divide-slate-100">
        {players.length > 0 ? (
          players.map((player) => (
            <div key={player.id} className="flex min-w-0 items-center gap-3 px-4 py-3">
              <PlayerAvatar player={player} size="h-10 w-10" />
              <div className="min-w-0">
                <p className="break-words text-sm font-black text-slate-950">
                  <span className="mr-2 text-blue-600">#{player.number}</span>
                  {player.name}
                </p>
                <p className="text-sm font-medium text-slate-500">{player.position || "Player"}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="px-4 py-4 text-sm font-semibold text-slate-400">Roster not available.</p>
        )}
      </div>
    </div>
  );
}

function GoalScorerList({ events, players, align = "left" }: { events: MatchEvent[]; players: Player[]; align?: "left" | "right" }) {
  if (events.length === 0) {
    return null;
  }

  return (
    <div className={clsx("mt-3 grid gap-2", align === "right" ? "justify-items-end" : "justify-items-start")}>
      {groupGoalEventsByScorer(events, players).map((scorer) => {
        return (
          <div key={scorer.key} className="flex max-w-full items-center gap-2 rounded-full bg-blue-950/35 px-3 py-2 text-xs font-black text-white ring-1 ring-white/10">
            <span aria-hidden="true">{"\u26bd"}</span>
            {scorer.player ? <PlayerAvatar player={scorer.player} size="h-7 w-7" /> : null}
            <span className="min-w-0 break-words">{scorer.label}</span>
            <span className="shrink-0 rounded-full bg-white/15 px-2 py-0.5">{scorer.minutes.join(", ")}</span>
          </div>
        );
      })}
    </div>
  );
}

function EventIcon({ type }: { type: MatchEventType }) {
  if (type === "yellow" || type === "red") {
    return <span className={clsx("mt-1 h-6 w-4 rounded-sm shadow-sm", type === "yellow" ? "bg-yellow-300" : "bg-red-600")} aria-hidden="true" />;
  }

  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-black text-blue-700 ring-1 ring-blue-100" aria-hidden="true">
      {eventIcons[type]}
    </span>
  );
}

function TimelineEventCard({ event, team, player }: { event: MatchEvent; team?: Team | null; player?: Player | null }) {
  return (
    <article className="grid grid-cols-[auto_1fr] gap-3 rounded-lg border border-blue-100 bg-white px-3 py-3 shadow-[0_10px_28px_rgba(37,99,235,0.08)] sm:grid-cols-[auto_auto_1fr] sm:px-4">
      <span className="rounded-lg bg-blue-600 px-2.5 py-1 text-sm font-black text-white shadow-sm">{event.minute}</span>
      <EventIcon type={event.type} />
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="text-sm font-black text-slate-950">{eventLabels[event.type]}</p>
          {team ? <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">{team.name}</span> : null}
        </div>
        <div className="mt-2 flex min-w-0 items-center gap-2">
          {player ? <PlayerAvatar player={player} size="h-8 w-8" /> : null}
          <p className="min-w-0 break-words text-sm font-medium leading-6 text-slate-600">
            {[player?.name, event.description].filter(Boolean).join(" - ") || "Match event"}
          </p>
        </div>
      </div>
    </article>
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
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center gap-3 bg-blue-50 px-4 py-3">
        <TeamLogo team={team} size="h-10 w-10" />
        <h3 className="break-words font-black text-blue-950">{team.name}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-white text-left text-xs font-black uppercase tracking-wide text-slate-400">
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
                  <div className="flex min-w-52 items-center gap-3">
                    <PlayerAvatar player={player} size="h-8 w-8" />
                    <span className="font-bold text-slate-950">#{player.number} {player.name}</span>
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

function ScoreTeamCard({
  label,
  team,
  events,
  players,
  align = "left"
}: {
  label: string;
  team?: Team;
  events: MatchEvent[];
  players: Player[];
  align?: "left" | "right";
}) {
  return (
    <Link
      href={team ? `/teams/${team.id}` : "/teams"}
      className={clsx(
        "min-w-0 rounded-lg border border-white/15 bg-white/10 p-4 shadow-sm ring-1 ring-white/10 transition hover:bg-white/15",
        align === "right" ? "text-left md:text-right" : "text-left"
      )}
    >
      <div className={clsx("flex min-w-0 items-center gap-3", align === "right" ? "md:justify-end" : "")}>
        <TeamLogo team={team} size="h-14 w-14 sm:h-16 sm:w-16" />
        <div className={clsx("min-w-0", align === "right" ? "md:order-first" : "")}>
          <p className="text-xs font-black uppercase tracking-wide text-white/55">{label}</p>
          <p className="mt-1 break-words text-2xl font-black leading-tight text-white sm:text-3xl">{team?.name ?? label}</p>
        </div>
      </div>
      <GoalScorerList events={events} players={players} align={align} />
    </Link>
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
  const [activeTab, setActiveTab] = useState<MatchTab>("timeline");

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
  const goalEvents = events.filter((event) => event.type === "goal");
  const homeGoalEvents = goalEvents.filter((event) => event.teamId === match.homeTeamId);
  const awayGoalEvents = goalEvents.filter((event) => event.teamId === match.awayTeamId);
  const homePlayers = data.players.filter((player) => player.teamId === match.homeTeamId);
  const awayPlayers = data.players.filter((player) => player.teamId === match.awayTeamId);
  const accent = tournament?.primaryColor || "#2563eb";
  const clockLabel = formatMatchClock(match);

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-5 pb-8 sm:gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Public match center</p>
          <h1 className="mt-1 break-words text-2xl font-black tracking-tight text-slate-950 sm:text-4xl">
            {home?.name ?? "Home"} vs {away?.name ?? "Away"}
          </h1>
        </div>
        <Link href={`/scoreboard/${match.id}`} className="inline-flex w-full items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-black text-blue-700 shadow-sm transition hover:bg-blue-100 sm:w-auto">
          Open scoreboard
        </Link>
      </header>

      <section className="overflow-hidden rounded-lg border border-blue-100 bg-white shadow-[0_22px_58px_rgba(37,99,235,0.14)]">
        <div
          className={clsx(
            "relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-blue-950 p-4 text-white sm:p-6",
            scoreHighlight && "orso-highlight"
          )}
          style={{ background: `linear-gradient(135deg, ${accent}, #2563eb 46%, #0f172a)` }}
        >
          <div className="absolute inset-x-0 top-0 h-px bg-white/35" />
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              {tournament?.logoUrl ? (
                <span className="h-12 w-12 shrink-0 rounded-lg bg-white/15 bg-contain bg-center bg-no-repeat ring-1 ring-white/15" style={{ backgroundImage: `url(${tournament.logoUrl})` }} />
              ) : (
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/15 text-lg font-black ring-1 ring-white/15">
                  {(tournament?.name || "OR").slice(0, 2).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="break-words text-lg font-black sm:text-2xl">{tournament?.name || "Tournament"}</p>
                <p className="text-sm font-bold uppercase tracking-wide text-white/60">{match.sport} / {match.group}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm font-black sm:flex sm:flex-wrap sm:items-center">
              <span className="rounded-full bg-white px-3 py-2 text-center uppercase text-blue-700 shadow-sm">{match.status}</span>
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-2 text-center text-white">{clockLabel}</span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-center text-white/80 sm:col-auto">{match.court}</span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-center text-white/80 sm:col-auto">{match.hallSlug}</span>
            </div>
          </div>

          <div className="mt-5 grid items-stretch gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
            <ScoreTeamCard label="Home" team={home} events={homeGoalEvents} players={homePlayers} />
            <div className="flex items-center justify-center rounded-lg bg-white px-5 py-4 text-blue-700 shadow-xl ring-1 ring-white/80">
              <div className="text-center">
                <p className="mb-1 text-xs font-black uppercase tracking-[0.24em] text-blue-400">Score</p>
                <div className="text-6xl font-black leading-none tracking-tight sm:text-7xl lg:text-8xl">
                  <span>{match.homeScore}</span>
                  <span className="px-3 text-slate-300">-</span>
                  <span>{match.awayScore}</span>
                </div>
              </div>
            </div>
            <ScoreTeamCard label="Away" team={away} events={awayGoalEvents} players={awayPlayers} align="right" />
          </div>

          <div className="mt-4 grid gap-2 text-sm font-bold text-white/75 sm:grid-cols-3">
            <div className="rounded-lg bg-white/10 px-4 py-3 ring-1 ring-white/10">
              <p className="text-xs uppercase tracking-wide text-white/45">Match time</p>
              <p className="mt-1 text-base font-black text-white sm:text-lg">{match.date} {match.time}</p>
            </div>
            <div className="rounded-lg bg-white/10 px-4 py-3 ring-1 ring-white/10">
              <p className="text-xs uppercase tracking-wide text-white/45">Period</p>
              <p className="mt-1 text-base font-black text-white sm:text-lg">{match.periodLabel}</p>
            </div>
            <div className="rounded-lg bg-white/10 px-4 py-3 ring-1 ring-white/10">
              <p className="text-xs uppercase tracking-wide text-white/45">Court / Hall</p>
              <p className="mt-1 break-words text-base font-black text-white sm:text-lg">{match.court} / {match.hallSlug}</p>
            </div>
          </div>
        </div>
      </section>

      <nav className="sticky top-20 z-10 overflow-x-auto rounded-lg border border-blue-100 bg-white/95 p-1 shadow-[0_12px_34px_rgba(37,99,235,0.10)] backdrop-blur">
        <div className="grid min-w-max grid-cols-4 gap-1 sm:min-w-0">
          {matchTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "rounded-md px-4 py-2.5 text-sm font-black transition",
                activeTab === tab.id ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {activeTab === "timeline" ? (
        <Panel title={`Timeline (${events.length})`} eyebrow="Match events">
          <div className={clsx("grid gap-3", eventHighlight && "orso-highlight")}>
            {events.length > 0 ? (
              events.map((event) => {
                const team = event.teamId ? getTeam(data, event.teamId) : null;
                const player = event.playerId ? data.players.find((item) => item.id === event.playerId) : null;

                return <TimelineEventCard key={event.id} event={event} team={team} player={player} />;
              })
            ) : (
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-400">No timeline events yet.</p>
            )}
          </div>
        </Panel>
      ) : null}

      {activeTab === "lineups" ? (
        <Panel title="Lineups" eyebrow="Team rosters">
          <div className="grid gap-4 lg:grid-cols-2">
            <TeamRoster team={home} players={homePlayers} />
            <TeamRoster team={away} players={awayPlayers} />
          </div>
        </Panel>
      ) : null}

      {activeTab === "stats" ? (
        <Panel title="Player stats" eyebrow="Match numbers">
          <div className="grid gap-4">
            <TeamPlayerStats team={home} players={homePlayers} />
            <TeamPlayerStats team={away} players={awayPlayers} />
          </div>
        </Panel>
      ) : null}

      {activeTab === "stream" ? (
        <Panel title="Stream" eyebrow="Live video">
          {match.youtubeUrl ? (
            <YouTubeEmbed url={match.youtubeUrl} title={`${home?.name ?? "Home"} vs ${away?.name ?? "Away"} livestream`} />
          ) : (
            <div className="rounded-lg border border-dashed border-blue-200 bg-blue-50 px-4 py-8 text-center">
              <p className="text-base font-black text-blue-950">No live stream available</p>
              <p className="mt-2 text-sm font-medium text-blue-700">Video will appear here when a YouTube link is added for this match.</p>
            </div>
          )}
        </Panel>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <Panel title="Match info" eyebrow="Details">
          <div className="grid gap-2 text-sm sm:grid-cols-2">
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
                <span className="break-words text-right font-bold text-slate-950">{value}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Match report" eyebrow="Summary">
          <p className="leading-7 text-slate-600">
            {match.report ?? "Report will be published after the match. Scorekeepers can update the match from the admin panel."}
          </p>
        </Panel>
      </div>
    </div>
  );
}
