"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { CalendarDays, CircleDot, FileText, MapPin, Radio, RotateCcw, Square, Target, Trophy } from "lucide-react";
import { LiveUpdateIndicator } from "@/components/live-update-indicator";
import { PageHeader, TeamLogo } from "@/components/ui";
import { YouTubeEmbed } from "@/components/youtube-embed";
import { buildStandings, getMatchTeamStats, getTeam, type TournamentData } from "@/lib/data-store";
import { groupGoalEventsByScorer } from "@/lib/goal-scorers";
import { useTournamentData } from "@/hooks/use-tournament-data";
import { formatMatchClock } from "@/lib/match-clock";
import { matchTeamStatKeys, matchTeamStatLabels, playerStatLabels, playerStatsBySport, type Match, type MatchEvent, type MatchEventType, type MatchTeamStatKey, type Player, type PlayerMatchStat, type PlayerStatKey, type Team } from "@/lib/types";

type MatchTab = "overview" | "timeline" | "lineups" | "analysis" | "stats" | "standings" | "report";

const matchTabs: { id: MatchTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "timeline", label: "Timeline" },
  { id: "lineups", label: "Lineups" },
  { id: "analysis", label: "Analysis" },
  { id: "stats", label: "Stats" },
  { id: "standings", label: "Standings" },
  { id: "report", label: "Report" }
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

function normalizeVenuePart(value?: string) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function venueLabel(court: string, hallSlug: string) {
  const courtValue = court.trim();
  const hallValue = hallSlug.trim();

  if (!courtValue) {
    return hallValue;
  }

  if (!hallValue || normalizeVenuePart(courtValue) === normalizeVenuePart(hallValue) || hallValue.includes("-")) {
    return courtValue;
  }

  return `${courtValue} / ${hallValue}`;
}

function statusDisplay(match: Match, clockLabel: string) {
  if (match.status === "Final") {
    return "FULL TIME";
  }

  if (match.status === "Live") {
    return `LIVE${clockLabel ? ` ${clockLabel}` : ""}`;
  }

  return match.status.toUpperCase();
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
    <section className={clsx("orso-card overflow-hidden", className)}>
      <div className="orso-section-header">
        {eyebrow ? <p className="text-xs font-black uppercase tracking-wide text-blue-600">{eyebrow}</p> : null}
        <h2 className="mt-1 text-lg font-black tracking-tight text-slate-950 sm:text-xl">{title}</h2>
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
          <h3 className="orso-team-name orso-team-name-2 text-base font-black text-slate-950">{team.name}</h3>
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
    return (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm" aria-hidden="true">
        <span className={clsx("h-6 w-4 rounded-sm shadow-sm", type === "yellow" ? "bg-yellow-300" : "bg-red-600")} />
      </span>
    );
  }

  return (
    <span
      className={clsx(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-base font-black shadow-sm",
        type === "goal" ? "border-blue-600 bg-blue-600 text-white" : "border-blue-100 bg-blue-50 text-blue-700"
      )}
      aria-hidden="true"
    >
      {eventIcons[type]}
    </span>
  );
}

function TimelineEventCard({ event, team, player }: { event: MatchEvent; team?: Team | null; player?: Player | null }) {
  const isGoal = event.type === "goal";

  return (
    <article
      className={clsx(
        "grid grid-cols-[auto_1fr] gap-3 rounded-lg border bg-white px-4 py-4 shadow-[0_14px_32px_rgba(15,23,42,0.10)] ring-1 ring-white print:border-slate-400 print:bg-white print:shadow-none sm:grid-cols-[auto_auto_1fr]",
        isGoal ? "border-blue-300 border-l-4 shadow-[0_16px_36px_rgba(37,99,235,0.16)]" : "border-slate-200"
      )}
    >
      <span
        className={clsx(
          "inline-flex h-10 min-w-14 items-center justify-center rounded-lg px-3 text-sm font-black shadow-sm print:border print:bg-white",
          isGoal ? "bg-blue-700 text-white print:border-blue-700 print:text-blue-700" : "bg-blue-600 text-white print:border-blue-700 print:text-blue-700"
        )}
      >
        {event.minute}
      </span>
      <EventIcon type={event.type} />
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className={clsx("text-sm font-black", isGoal ? "text-blue-800" : "text-slate-950")}>{eventLabels[event.type]}</p>
          {team ? <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 print:border-slate-300 print:bg-white">{team.name}</span> : null}
        </div>
        <div className="mt-2 flex min-w-0 items-center gap-2">
          {player ? <PlayerAvatar player={player} size="h-8 w-8" /> : null}
          <p className="min-w-0 break-words text-sm font-semibold leading-6 text-slate-700">
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
        <h3 className="orso-team-name orso-team-name-2 font-black text-blue-950">{team.name}</h3>
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

function comparisonPercent(homeValue: number, awayValue: number, statKey: MatchTeamStatKey) {
  if (statKey === "possession") {
    return Math.max(0, Math.min(100, homeValue));
  }

  const total = homeValue + awayValue;
  return total > 0 ? (homeValue / total) * 100 : 50;
}

function MatchStatisticsPanel({ data, match, home, away }: { data: TournamentData; match: Match; home?: Team; away?: Team }) {
  const homeStats = getMatchTeamStats(data, match.id, match.homeTeamId);
  const awayStats = getMatchTeamStats(data, match.id, match.awayTeamId);

  return (
    <Panel title="Match Statistics" eyebrow="Team comparison">
      <div className="grid gap-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 rounded-lg bg-blue-50 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <TeamLogo team={home} size="h-9 w-9" />
            <span className="orso-team-name orso-team-name-2 text-sm font-black text-blue-950">{home?.name ?? "Home"}</span>
          </div>
          <span className="text-xs font-black uppercase tracking-wide text-blue-500">Stats</span>
          <div className="flex min-w-0 items-center justify-end gap-2 text-right">
            <span className="orso-team-name orso-team-name-2 text-sm font-black text-blue-950">{away?.name ?? "Away"}</span>
            <TeamLogo team={away} size="h-9 w-9" />
          </div>
        </div>
        {matchTeamStatKeys.map((statKey) => {
          const homeValue = homeStats.stats[statKey];
          const awayValue = awayStats.stats[statKey];
          const homePercent = comparisonPercent(homeValue, awayValue, statKey);
          const awayPercent = 100 - homePercent;

          return (
            <div key={statKey} className="grid gap-2 rounded-lg border border-slate-100 bg-white px-3 py-3">
              <div className="grid grid-cols-[3rem_1fr_3rem] items-center gap-3 text-sm">
                <span className="font-black text-slate-950">{statKey === "possession" ? `${homeValue}%` : homeValue}</span>
                <span className="text-center text-xs font-black uppercase tracking-wide text-slate-500">{matchTeamStatLabels[statKey]}</span>
                <span className="text-right font-black text-slate-950">{statKey === "possession" ? `${awayValue}%` : awayValue}</span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <div className="flex h-2 justify-end rounded-full bg-slate-100">
                  <span className="h-2 rounded-full bg-blue-600" style={{ width: `${homePercent}%` }} />
                </div>
                <div className="flex h-2 justify-start rounded-full bg-slate-100">
                  <span className="h-2 rounded-full bg-slate-900" style={{ width: `${awayPercent}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function TopPerformerCard({ title, stat, player, team, value }: { title: string; stat: string; player?: Player; team?: Team; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
      <p className="text-xs font-black uppercase tracking-wide text-blue-600">{title}</p>
      {player ? (
        <div className="mt-3 flex min-w-0 items-center gap-3">
          <PlayerAvatar player={player} size="h-12 w-12" />
          <div className="min-w-0 flex-1">
            <p className="break-words text-base font-black text-slate-950">{player.name}</p>
            <div className="mt-1 flex min-w-0 items-center gap-2">
              <TeamLogo team={team} size="h-6 w-6" />
              <p className="orso-team-name orso-team-name-2 text-sm font-semibold text-slate-500">{team?.name ?? "Team"}</p>
            </div>
          </div>
          <div className="rounded-lg bg-blue-50 px-3 py-2 text-right">
            <p className="text-2xl font-black text-blue-700">{value}</p>
            <p className="text-xs font-black uppercase text-blue-500">{stat}</p>
          </div>
        </div>
      ) : (
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-400">No data yet.</p>
      )}
    </div>
  );
}

function topPlayerForStat(stats: PlayerMatchStat[], players: Player[], statKey: PlayerStatKey) {
  const totals = new Map<string, number>();

  stats
    .filter((stat) => stat.statKey === statKey)
    .forEach((stat) => totals.set(stat.playerId, (totals.get(stat.playerId) ?? 0) + stat.value));

  const [playerId, value] = Array.from(totals.entries()).sort((first, second) => second[1] - first[1])[0] ?? [];
  const player = playerId ? players.find((item) => item.id === playerId) : undefined;

  return { player, value: value ?? 0 };
}

function topPlayerForCards(stats: PlayerMatchStat[], players: Player[]) {
  const totals = new Map<string, number>();

  stats
    .filter((stat) => stat.statKey === "yellow_cards" || stat.statKey === "red_cards")
    .forEach((stat) => totals.set(stat.playerId, (totals.get(stat.playerId) ?? 0) + stat.value));

  const [playerId, value] = Array.from(totals.entries()).sort((first, second) => second[1] - first[1])[0] ?? [];
  const player = playerId ? players.find((item) => item.id === playerId) : undefined;

  return { player, value: value ?? 0 };
}

function TopPerformers({ data, match, players }: { data: TournamentData; match: Match; players: Player[] }) {
  const matchStats = data.playerMatchStats.filter((stat) => stat.matchId === match.id);
  const scoringStat: PlayerStatKey = match.sport === "Football" ? "goals" : "points";
  const topScorer = topPlayerForStat(matchStats, players, scoringStat);
  const assistLeader = topPlayerForStat(matchStats, players, "assists");
  const cardsLeader = topPlayerForCards(matchStats, players);

  return (
    <Panel title="Top Performers" eyebrow="Player impact">
      <div className="grid gap-4 lg:grid-cols-3">
        <TopPerformerCard title="Top scorer" stat={scoringStat === "goals" ? "Goals" : "Points"} player={topScorer.player} team={topScorer.player ? getTeam(data, topScorer.player.teamId) : undefined} value={topScorer.value} />
        <TopPerformerCard title="Assist leader" stat="Assists" player={assistLeader.player} team={assistLeader.player ? getTeam(data, assistLeader.player.teamId) : undefined} value={assistLeader.value} />
        <TopPerformerCard title="Most cards" stat="Cards" player={cardsLeader.player} team={cardsLeader.player ? getTeam(data, cardsLeader.player.teamId) : undefined} value={cardsLeader.value} />
      </div>
    </Panel>
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
          <p className="orso-team-name orso-team-name-2 mt-1 text-2xl font-black leading-tight text-white sm:text-3xl">{team?.name ?? label}</p>
        </div>
      </div>
      <GoalScorerList events={events} players={players} align={align} />
    </Link>
  );
}

function MatchHeroTeam({
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
        "group flex min-w-0 flex-col items-center gap-3 rounded-lg border border-white/15 bg-white/10 px-3 py-4 text-center ring-1 ring-white/10 transition hover:bg-white/15 sm:px-4",
        align === "right" ? "md:items-end md:text-right" : "md:items-start md:text-left"
      )}
    >
      <TeamLogo team={team} size="h-16 w-16 sm:h-20 sm:w-20" className="bg-white/95 shadow-lg transition group-hover:scale-[1.03]" />
      <div className="min-w-0">
        <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-white/50">{label}</p>
        <h2 className="orso-team-name orso-team-name-2 mt-1 text-base font-black leading-tight text-white sm:text-2xl md:text-3xl">
          {team?.name ?? label}
        </h2>
      </div>
      <GoalScorerList events={events} players={players} align={align} />
    </Link>
  );
}

function InfoTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-lg border border-blue-100 bg-white px-3 py-3 shadow-[0_10px_26px_rgba(37,99,235,0.06)]">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">{icon}</span>
      <div className="min-w-0">
        <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
        <p className="mt-0.5 break-words text-sm font-black text-slate-950">{value}</p>
      </div>
    </div>
  );
}

function SectionEmpty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-blue-200 bg-blue-50 px-4 py-5 text-center text-sm font-bold text-blue-700">
      {children}
    </p>
  );
}

function OverviewTab({
  data,
  match,
  home,
  away,
  events,
  homeGoalEvents,
  awayGoalEvents,
  homePlayers,
  awayPlayers,
  matchPlayers,
  venue,
  clockLabel,
  eventHighlight
}: {
  data: TournamentData;
  match: Match;
  home?: Team;
  away?: Team;
  events: MatchEvent[];
  homeGoalEvents: MatchEvent[];
  awayGoalEvents: MatchEvent[];
  homePlayers: Player[];
  awayPlayers: Player[];
  matchPlayers: Player[];
  venue: string;
  clockLabel: string;
  eventHighlight: boolean;
}) {
  const latestEvents = [...events].reverse().slice(0, 4);

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <InfoTile icon={<Trophy size={18} />} label="Score" value={`${match.homeScore} - ${match.awayScore}`} />
        <InfoTile icon={<Radio size={18} />} label="Live status" value={match.status === "Live" ? `Live ${clockLabel}` : match.status} />
        <InfoTile icon={<CalendarDays size={18} />} label="Kickoff" value={`${match.date} ${match.time}`} />
        <InfoTile icon={<MapPin size={18} />} label="Venue" value={venue} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <Panel title="Scorers" eyebrow="Current score">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-blue-100 bg-blue-50/70 p-4">
              <div className="flex min-w-0 items-center gap-3">
                <TeamLogo team={home} size="h-10 w-10" />
                <p className="orso-team-name orso-team-name-2 font-black text-blue-950">{home?.name ?? "Home"}</p>
              </div>
              <GoalScorerList events={homeGoalEvents} players={homePlayers} />
              {homeGoalEvents.length === 0 ? <p className="mt-3 text-sm font-bold text-blue-700/60">No goals recorded.</p> : null}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex min-w-0 items-center gap-3">
                <TeamLogo team={away} size="h-10 w-10" />
                <p className="orso-team-name orso-team-name-2 font-black text-slate-950">{away?.name ?? "Away"}</p>
              </div>
              <GoalScorerList events={awayGoalEvents} players={awayPlayers} />
              {awayGoalEvents.length === 0 ? <p className="mt-3 text-sm font-bold text-slate-500">No goals recorded.</p> : null}
            </div>
          </div>
        </Panel>

        <Panel title="Latest events" eyebrow="Live feed">
          <div className={clsx("grid gap-3", eventHighlight && "orso-highlight")}>
            {latestEvents.length > 0 ? (
              latestEvents.map((event) => {
                const team = event.teamId ? getTeam(data, event.teamId) : null;
                const player = event.playerId ? data.players.find((item) => item.id === event.playerId) : null;
                return <TimelineEventCard key={event.id} event={event} team={team} player={player} />;
              })
            ) : (
              <SectionEmpty>No live events yet.</SectionEmpty>
            )}
          </div>
        </Panel>
      </div>

      <TopPerformers data={data} match={match} players={matchPlayers} />

      {match.youtubeUrl ? (
        <Panel title="Live stream" eyebrow="Video">
          <YouTubeEmbed url={match.youtubeUrl} title={`${home?.name ?? "Home"} vs ${away?.name ?? "Away"} livestream`} />
        </Panel>
      ) : null}
    </div>
  );
}

function TimelineTab({ data, events, eventHighlight }: { data: TournamentData; events: MatchEvent[]; eventHighlight: boolean }) {
  const grouped = events.reduce<Record<string, MatchEvent[]>>((groups, event) => {
    const sortValue = minuteSortValue(event);
    const key = sortValue <= 45 ? "First half" : sortValue >= 120 ? "Full time" : "Second half";
    return { ...groups, [key]: [...(groups[key] ?? []), event] };
  }, {});

  const orderedGroups = ["First half", "Second half", "Full time"].filter((group) => grouped[group]?.length);

  return (
    <Panel title={`Timeline (${events.length})`} eyebrow="Match events">
      <div className={clsx("grid gap-5", eventHighlight && "orso-highlight")}>
        {orderedGroups.length > 0 ? (
          orderedGroups.map((group) => (
            <div key={group} className="grid gap-3">
              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-blue-100" />
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-blue-700">{group}</span>
                <span className="h-px flex-1 bg-blue-100" />
              </div>
              {grouped[group].map((event) => {
                const team = event.teamId ? getTeam(data, event.teamId) : null;
                const player = event.playerId ? data.players.find((item) => item.id === event.playerId) : null;
                return <TimelineEventCard key={event.id} event={event} team={team} player={player} />;
              })}
            </div>
          ))
        ) : (
          <SectionEmpty>No timeline events yet.</SectionEmpty>
        )}
      </div>
    </Panel>
  );
}

function PlayerChip({ player, index }: { player: Player; index: number }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white">{player.number || index + 1}</span>
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-slate-950">{player.name}</p>
        <p className="truncate text-xs font-bold text-slate-400">{player.position || "Player"}</p>
      </div>
    </div>
  );
}

function spreadPlayers(line: Player[], y: number) {
  const slots = line.length;

  return line.map((player, index) => {
    const x = slots === 1 ? 50 : 18 + (index * 64) / (slots - 1);
    return { player, x, y };
  });
}

function LineupPitch({ players, team, mode = "full" }: { players: Player[]; team?: Team; mode?: "full" | "half" }) {
  const starters = players.slice(0, 11);
  const lines = [starters.slice(0, 1), starters.slice(1, 5), starters.slice(5, 8), starters.slice(8, 11)].filter((line) => line.length);
  const yPositions = mode === "half" ? [88, 70, 48, 24] : [88, 66, 43, 18];
  const positionedPlayers = lines.flatMap((line, lineIndex) => spreadPlayers(line, yPositions[lineIndex] ?? 50));

  return (
    <div className="overflow-hidden rounded-lg border border-emerald-200 bg-white p-2 shadow-[0_18px_42px_rgba(5,150,105,0.14)] sm:p-3">
      <div className="relative mx-auto aspect-[68/105] min-h-[34rem] max-h-[46rem] w-full overflow-hidden rounded-lg border border-emerald-900/20 bg-emerald-700 text-white sm:aspect-[68/96]">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.07)_0_12.5%,rgba(255,255,255,0.02)_12.5%_25%,rgba(255,255,255,0.07)_25%_37.5%,rgba(255,255,255,0.02)_37.5%_50%,rgba(255,255,255,0.07)_50%_62.5%,rgba(255,255,255,0.02)_62.5%_75%,rgba(255,255,255,0.07)_75%_87.5%,rgba(255,255,255,0.02)_87.5%_100%),linear-gradient(180deg,#167a3a,#0f6f39_48%,#0b5f34)]" />
        <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(rgba(255,255,255,0.18)_0.7px,transparent_0.7px)] [background-size:9px_9px]" />
        <div className="absolute inset-[4%] rounded-sm border-2 border-white/55" />
        <div className="absolute left-[4%] right-[4%] top-1/2 h-0.5 -translate-y-1/2 bg-white/55" />
        <div className="absolute left-1/2 top-1/2 h-[18%] w-[28%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/55" />
        <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70" />

        <div className="absolute left-1/2 top-[4%] h-[15%] w-[50%] -translate-x-1/2 border-x-2 border-b-2 border-white/55" />
        <div className="absolute left-1/2 top-[4%] h-[7%] w-[23%] -translate-x-1/2 border-x-2 border-b-2 border-white/55" />
        <div className="absolute left-1/2 top-[18.5%] h-2 w-2 -translate-x-1/2 rounded-full bg-white/70" />
        <div className="absolute left-1/2 top-[2.2%] h-[2.2%] w-[18%] -translate-x-1/2 rounded-t-sm border-x-2 border-t-2 border-white/55" />

        <div className="absolute bottom-[4%] left-1/2 h-[15%] w-[50%] -translate-x-1/2 border-x-2 border-t-2 border-white/55" />
        <div className="absolute bottom-[4%] left-1/2 h-[7%] w-[23%] -translate-x-1/2 border-x-2 border-t-2 border-white/55" />
        <div className="absolute bottom-[18.5%] left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-white/70" />
        <div className="absolute bottom-[2.2%] left-1/2 h-[2.2%] w-[18%] -translate-x-1/2 rounded-b-sm border-x-2 border-b-2 border-white/55" />

        <div className="absolute left-1/2 top-[4%] h-10 w-24 -translate-x-1/2 rounded-b-full border-b-2 border-white/45" />
        <div className="absolute bottom-[4%] left-1/2 h-10 w-24 -translate-x-1/2 rounded-t-full border-t-2 border-white/45" />

        {positionedPlayers.map(({ player, x, y }) => (
          <div
            key={player.id}
            className="absolute z-[2] w-[5.4rem] -translate-x-1/2 -translate-y-1/2 text-center sm:w-[6.2rem]"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/95 shadow-[0_8px_22px_rgba(15,23,42,0.28)] ring-2 ring-blue-500/75 sm:h-11 sm:w-11">
              <PlayerAvatar player={player} size="h-9 w-9 sm:h-10 sm:w-10" />
            </div>
            <p className="mt-1 truncate rounded-full border border-white/15 bg-slate-950/55 px-2 py-1 text-[0.66rem] font-black leading-tight text-white shadow-sm backdrop-blur sm:text-[0.72rem]">
              {player.number}. {player.name}
            </p>
          </div>
        ))}

        {starters.length === 0 ? (
          <div className="absolute inset-0 z-[2] flex items-center justify-center p-6 text-center">
            <p className="rounded-lg border border-white/20 bg-black/25 px-4 py-3 text-sm font-black text-white/80 backdrop-blur">Lineup not available</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LineupTeam({ team, players }: { team?: Team; players: Player[] }) {
  const starters = players.slice(0, 11);
  const substitutes = players.slice(11);

  return (
    <div className="grid gap-4">
      <div className="flex min-w-0 items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
        <TeamLogo team={team} size="h-12 w-12" />
        <div className="min-w-0">
          <h3 className="orso-team-name orso-team-name-2 text-lg font-black text-blue-950">{team?.name ?? "Team"}</h3>
          <p className="text-sm font-bold text-blue-700">4-3-3 / Starting XI</p>
        </div>
      </div>
      <LineupPitch team={team} players={players} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">Starting XI</p>
          <div className="grid gap-2">{starters.length > 0 ? starters.map((player, index) => <PlayerChip key={player.id} player={player} index={index} />) : <SectionEmpty>No starters available.</SectionEmpty>}</div>
        </div>
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">Substitutes</p>
          <div className="grid gap-2">{substitutes.length > 0 ? substitutes.map((player, index) => <PlayerChip key={player.id} player={player} index={index + 11} />) : <SectionEmpty>No substitutes listed.</SectionEmpty>}</div>
        </div>
      </div>
    </div>
  );
}

function LineupsTab({ home, away, homePlayers, awayPlayers }: { home?: Team; away?: Team; homePlayers: Player[]; awayPlayers: Player[] }) {
  return (
    <Panel title="Lineups" eyebrow="Formation and squads">
      <div className="grid gap-6 xl:grid-cols-2">
        <LineupTeam team={home} players={homePlayers} />
        <LineupTeam team={away} players={awayPlayers} />
      </div>
    </Panel>
  );
}

type TeamFilter = "all" | "home" | "away";
type AnalysisEventKind = MatchEventType | "shot";
type AnalysisEvent = Omit<MatchEvent, "type"> & {
  type: AnalysisEventKind;
  x?: number | string;
  y?: number | string;
  pitchX?: number | string;
  pitchY?: number | string;
  coordinateX?: number | string;
  coordinateY?: number | string;
};

function analysisEventKind(event: MatchEvent): AnalysisEventKind {
  const rawType = String((event as { type?: string }).type ?? "").toLowerCase();
  const description = (event.description ?? "").toLowerCase();

  if (rawType.includes("shot") || description.includes("shot")) {
    return "shot";
  }

  return event.type;
}

function analysisEventLabel(type: AnalysisEventKind) {
  if (type === "shot") return "Shot";
  return eventLabels[type];
}

function analysisEventIcon(type: AnalysisEventKind, size = 15) {
  if (type === "goal") return <CircleDot size={size} />;
  if (type === "yellow") return <Square size={size} className="fill-yellow-300 text-yellow-300" />;
  if (type === "red") return <Square size={size} className="fill-red-600 text-red-600" />;
  if (type === "substitution") return <RotateCcw size={size} />;
  return <Target size={size} />;
}

function analysisEventClasses(type: AnalysisEventKind) {
  if (type === "goal") return "border-blue-500 bg-blue-600 text-white shadow-[0_10px_24px_rgba(37,99,235,0.35)]";
  if (type === "yellow") return "border-yellow-300 bg-yellow-200 text-yellow-950 shadow-[0_10px_24px_rgba(202,138,4,0.22)]";
  if (type === "red") return "border-red-500 bg-red-600 text-white shadow-[0_10px_24px_rgba(220,38,38,0.28)]";
  if (type === "substitution") return "border-emerald-300 bg-emerald-500 text-white shadow-[0_10px_24px_rgba(5,150,105,0.22)]";
  return "border-slate-300 bg-white text-slate-950 shadow-[0_10px_24px_rgba(15,23,42,0.16)]";
}

function normalizePitchCoordinate(value: unknown) {
  const numberValue = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;

  if (!Number.isFinite(numberValue)) {
    return null;
  }

  const percent = numberValue <= 1 ? numberValue * 100 : numberValue;
  return Math.max(5, Math.min(95, percent));
}

function eventPitchPosition(event: AnalysisEvent) {
  const x = normalizePitchCoordinate(event.pitchX ?? event.coordinateX ?? event.x);
  const y = normalizePitchCoordinate(event.pitchY ?? event.coordinateY ?? event.y);

  return x === null || y === null ? null : { x, y };
}

function keyMomentCount(events: AnalysisEvent[], type: "goals" | "cards" | "subs") {
  if (type === "goals") return events.filter((event) => event.type === "goal").length;
  if (type === "cards") return events.filter((event) => event.type === "yellow" || event.type === "red").length;
  return events.filter((event) => event.type === "substitution").length;
}

function AnalysisEventRow({ event, team, player }: { event: AnalysisEvent; team?: Team | null; player?: Player | null }) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
      <span className={clsx("flex h-10 w-10 items-center justify-center rounded-lg border", analysisEventClasses(event.type))}>
        {analysisEventIcon(event.type, 17)}
      </span>
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-black text-blue-700">{event.minute}</span>
          <p className="text-sm font-black text-slate-950">{analysisEventLabel(event.type)}</p>
          {team ? <span className="rounded-full border border-slate-200 px-2 py-0.5 text-xs font-bold text-slate-500">{team.name}</span> : null}
        </div>
        <p className="mt-1 min-w-0 break-words text-sm font-semibold leading-6 text-slate-600">
          {[player?.name, event.description].filter(Boolean).join(" - ") || "Match event"}
        </p>
      </div>
    </div>
  );
}

function KeyMomentCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-lg border border-blue-100 bg-white p-4 shadow-[0_12px_30px_rgba(37,99,235,0.07)]">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className={clsx("mt-2 text-3xl font-black", accent)}>{value}</p>
    </div>
  );
}

function AnalysisTab({
  data,
  match,
  home,
  away,
  events
}: {
  data: TournamentData;
  match: Match;
  home?: Team;
  away?: Team;
  events: MatchEvent[];
}) {
  const [teamFilter, setTeamFilter] = useState<TeamFilter>("all");
  const analysisEvents = events
    .map((event) => ({ ...event, type: analysisEventKind(event) }) as AnalysisEvent)
    .filter((event) => ["goal", "yellow", "red", "substitution", "shot"].includes(event.type));
  const filteredEvents = analysisEvents.filter((event) => {
    if (teamFilter === "home") return event.teamId === match.homeTeamId;
    if (teamFilter === "away") return event.teamId === match.awayTeamId;
    return true;
  });
  const positionedEvents = filteredEvents.filter((event) => eventPitchPosition(event));
  const unpositionedEvents = filteredEvents.filter((event) => !eventPitchPosition(event));
  const filterOptions: { id: TeamFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "home", label: home?.name ?? "Home" },
    { id: "away", label: away?.name ?? "Away" }
  ];

  return (
    <Panel title="Analysis" eyebrow="Pitch map and key moments">
      <div className="grid gap-5">
        {match.sport !== "Football" ? (
          <SectionEmpty>Football pitch analysis is optimized for football matches.</SectionEmpty>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-3">
          <KeyMomentCard label="Goals" value={keyMomentCount(filteredEvents, "goals")} accent="text-blue-700" />
          <KeyMomentCard label="Cards" value={keyMomentCount(filteredEvents, "cards")} accent="text-amber-600" />
          <KeyMomentCard label="Substitutions" value={keyMomentCount(filteredEvents, "subs")} accent="text-emerald-600" />
        </div>

        <div className="flex gap-2 overflow-x-auto rounded-lg border border-blue-100 bg-blue-50 p-1">
          {filterOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setTeamFilter(option.id)}
              className={clsx(
                "min-h-11 min-w-fit rounded-lg px-4 text-sm font-black transition",
                teamFilter === option.id ? "bg-blue-600 text-white shadow-sm" : "bg-white text-blue-700 hover:bg-blue-100"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
          <div className="overflow-hidden rounded-lg border border-blue-100 bg-white p-3 shadow-[0_18px_42px_rgba(37,99,235,0.08)]">
            <div className="relative aspect-[3/4] min-h-[32rem] overflow-hidden rounded-lg border-2 border-white bg-emerald-700 sm:aspect-[16/10] sm:min-h-[28rem]">
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.08)_50%,transparent_50%),linear-gradient(180deg,#15803d,#047857)] bg-[length:48px_48px]" />
              <div className="absolute inset-4 rounded-lg border-2 border-white/45" />
              <div className="absolute left-1/2 top-4 bottom-4 w-px -translate-x-1/2 bg-white/45" />
              <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/45" />
              <div className="absolute left-4 top-1/2 h-32 w-16 -translate-y-1/2 rounded-r-lg border-y-2 border-r-2 border-white/45" />
              <div className="absolute right-4 top-1/2 h-32 w-16 -translate-y-1/2 rounded-l-lg border-y-2 border-l-2 border-white/45" />
              <div className="absolute left-0 top-1/2 h-16 w-7 -translate-y-1/2 rounded-r-lg border-y-2 border-r-2 border-white/45" />
              <div className="absolute right-0 top-1/2 h-16 w-7 -translate-y-1/2 rounded-l-lg border-y-2 border-l-2 border-white/45" />

              {positionedEvents.map((event) => {
                const position = eventPitchPosition(event);
                if (!position) return null;

                return (
                  <div
                    key={event.id}
                    className="absolute z-[2] -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${position.x}%`, top: `${position.y}%` }}
                  >
                    <div className={clsx("flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-full border px-2 text-xs font-black", analysisEventClasses(event.type))}>
                      {analysisEventIcon(event.type, 14)}
                      <span>{event.minute}</span>
                    </div>
                  </div>
                );
              })}

              {positionedEvents.length === 0 ? (
                <div className="absolute inset-0 z-[1] flex items-center justify-center p-6 text-center">
                  <div className="rounded-lg border border-white/20 bg-black/20 px-4 py-3 text-sm font-black text-white backdrop-blur">
                    No coordinate-based events available yet.
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid content-start gap-3">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-blue-600">Event list</p>
                <h3 className="text-lg font-black text-slate-950">Unmapped moments</h3>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-black text-blue-700">{unpositionedEvents.length}</span>
            </div>
            {unpositionedEvents.length > 0 ? (
              unpositionedEvents.map((event) => {
                const team = event.teamId ? getTeam(data, event.teamId) : null;
                const player = event.playerId ? data.players.find((item) => item.id === event.playerId) : null;
                return <AnalysisEventRow key={event.id} event={event} team={team} player={player} />;
              })
            ) : (
              <SectionEmpty>All filtered events with coordinates are shown on the pitch.</SectionEmpty>
            )}
          </div>
        </div>
      </div>
    </Panel>
  );
}

function StandingsTab({ data, match }: { data: TournamentData; match: Match }) {
  const standings = buildStandings(data)
    .map((standing) => ({ standing, team: getTeam(data, standing.teamId) }))
    .filter(({ team }) => team?.group === match.group && (!match.tournamentId || team?.tournamentId === match.tournamentId))
    .sort((first, second) => second.standing.tournamentPoints - first.standing.tournamentPoints || second.standing.pointsFor - first.standing.pointsFor);

  return (
    <Panel title={`${match.group} standings`} eyebrow="Tournament table">
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-blue-50 text-left text-xs font-black uppercase tracking-wide text-blue-700">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Team</th>
              <th className="px-4 py-3 text-center">P</th>
              <th className="px-4 py-3 text-center">W</th>
              <th className="px-4 py-3 text-center">L</th>
              <th className="px-4 py-3 text-center">PF</th>
              <th className="px-4 py-3 text-center">PA</th>
              <th className="px-4 py-3 text-center">Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {standings.map(({ standing, team }, index) => (
              <tr key={standing.teamId} className={clsx(team?.id === match.homeTeamId || team?.id === match.awayTeamId ? "bg-blue-50/45" : "bg-white")}>
                <td className="px-4 py-3 font-black text-slate-500">{index + 1}</td>
                <td className="px-4 py-3">
                  <div className="flex min-w-56 items-center gap-3">
                    <TeamLogo team={team ?? undefined} size="h-8 w-8" />
                    <span className="font-black text-slate-950">{team?.name ?? "Team"}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center font-bold">{standing.played}</td>
                <td className="px-4 py-3 text-center font-bold">{standing.won}</td>
                <td className="px-4 py-3 text-center font-bold">{standing.lost}</td>
                <td className="px-4 py-3 text-center font-bold">{standing.pointsFor}</td>
                <td className="px-4 py-3 text-center font-bold">{standing.pointsAgainst}</td>
                <td className="px-4 py-3 text-center font-black text-blue-700">{standing.tournamentPoints}</td>
              </tr>
            ))}
            {standings.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-sm font-bold text-slate-400">No standings available for this group.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function ReportTab({
  data,
  match,
  home,
  away,
  events,
  homePlayers,
  awayPlayers,
  venue,
  clockLabel
}: {
  data: TournamentData;
  match: Match;
  home?: Team;
  away?: Team;
  events: MatchEvent[];
  homePlayers: Player[];
  awayPlayers: Player[];
  venue: string;
  clockLabel: string;
}) {
  const homeStats = getMatchTeamStats(data, match.id, match.homeTeamId);
  const awayStats = getMatchTeamStats(data, match.id, match.awayTeamId);

  return (
    <Panel title="Printable report" eyebrow="PDF style match sheet">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)] sm:p-6">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Official match report</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">{home?.name ?? "Home"} vs {away?.name ?? "Away"}</h2>
            <p className="mt-2 text-sm font-bold text-slate-500">{match.date} {match.time} / {venue} / {match.status} {clockLabel}</p>
          </div>
          <Link href={`/reports/match/${match.id}`} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-blue-700">
            <FileText size={16} />
            Open print report
          </Link>
        </div>

        <div className="my-5 grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
          <TeamRoster team={home} players={homePlayers.slice(0, 3)} />
          <div className="rounded-lg bg-blue-600 px-6 py-4 text-center text-5xl font-black leading-none text-white shadow-lg">
            {match.homeScore} - {match.awayScore}
          </div>
          <TeamRoster team={away} players={awayPlayers.slice(0, 3)} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200 p-4">
            <h3 className="font-black text-slate-950">Timeline</h3>
            <div className="mt-3 grid gap-2">
              {events.slice(0, 8).map((event) => {
                const team = event.teamId ? getTeam(data, event.teamId) : null;
                const player = event.playerId ? data.players.find((item) => item.id === event.playerId) : null;
                return (
                  <div key={event.id} className="grid grid-cols-[3.5rem_1fr] gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <span className="font-black text-blue-700">{event.minute}</span>
                    <span className="font-semibold text-slate-700">{eventLabels[event.type]} / {team?.name ?? "Team"} / {[player?.name, event.description].filter(Boolean).join(" - ") || "Match event"}</span>
                  </div>
                );
              })}
              {events.length === 0 ? <SectionEmpty>No events recorded.</SectionEmpty> : null}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 p-4">
            <h3 className="font-black text-slate-950">Stats</h3>
            <div className="mt-3 grid gap-2">
              {matchTeamStatKeys.map((statKey) => (
                <div key={statKey} className="grid grid-cols-[3rem_1fr_3rem] items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <span className="font-black text-slate-950">{homeStats.stats[statKey]}</span>
                  <span className="text-center text-xs font-black uppercase text-slate-500">{matchTeamStatLabels[statKey]}</span>
                  <span className="text-right font-black text-slate-950">{awayStats.stats[statKey]}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 p-4">
            <h3 className="font-black text-slate-950">Lineups</h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
              {home?.name ?? "Home"}: {homePlayers.slice(0, 11).map((player) => player.name).join(", ") || "Not available"}
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
              {away?.name ?? "Away"}: {awayPlayers.slice(0, 11).map((player) => player.name).join(", ") || "Not available"}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 p-4">
            <h3 className="font-black text-slate-950">Officials and notes</h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">Officials: To be confirmed by tournament administration.</p>
            <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-600">{match.report ?? "Report will be published after the match."}</p>
          </div>
        </div>
      </div>
    </Panel>
  );
}

export default function MatchPage() {
  const params = useParams<{ matchId: string }>();
  const { data, lastUpdatedAt } = useTournamentData();
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
  const [activeTab, setActiveTab] = useState<MatchTab>("overview");

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
  const matchPlayers = [...homePlayers, ...awayPlayers];
  const accent = tournament?.primaryColor || "#2563eb";
  const clockLabel = formatMatchClock(match);
  const matchStatusLabel = statusDisplay(match, clockLabel);
  const matchVenueLabel = venueLabel(match.court, match.hallSlug);

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-5 pb-8 sm:gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Orso Match Center</p>
          <h1 className="mt-1 break-words text-xl font-black tracking-tight text-slate-950 sm:text-3xl">
            {home?.name ?? "Home"} vs {away?.name ?? "Away"}
          </h1>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <LiveUpdateIndicator lastUpdatedAt={lastUpdatedAt} />
          <Link href={`/reports/match/${match.id}`} className="inline-flex w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 sm:w-auto">
            Match report
          </Link>
          <Link href={`/scoreboard/${match.id}`} className="inline-flex w-full items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-black text-blue-700 shadow-sm transition hover:bg-blue-100 sm:w-auto">
            Open scoreboard
          </Link>
        </div>
      </header>

      <section className="overflow-hidden rounded-lg border border-blue-100 bg-white shadow-[0_24px_60px_rgba(37,99,235,0.16)]">
        <div
          className={clsx(
            "relative overflow-hidden p-4 text-white sm:p-6",
            scoreHighlight && "orso-highlight"
          )}
          style={{ background: `linear-gradient(135deg, ${accent}, #2563eb 46%, #0f172a)` }}
        >
          <div className="absolute inset-x-0 top-0 h-px bg-white/35" />
          <div className="absolute -right-16 top-6 h-48 w-48 rounded-full border border-white/10" />
          <div className="absolute -left-20 bottom-0 h-56 w-56 rounded-full border border-white/10" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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
                <p className="text-sm font-bold uppercase tracking-wide text-white/60">{match.sport} / {match.group} / {matchVenueLabel}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm font-black sm:flex sm:flex-wrap sm:items-center sm:justify-end">
              <span className="rounded-full bg-white px-3 py-2 text-center uppercase text-blue-700 shadow-sm">{matchStatusLabel}</span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-center text-white/85">{clockLabel || match.periodLabel}</span>
            </div>
          </div>

          <div className="relative mt-5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-2 sm:gap-4">
            <MatchHeroTeam label="Home" team={home} events={homeGoalEvents} players={homePlayers} />
            <div className="flex min-w-[6.25rem] items-center justify-center rounded-lg bg-white px-3 py-4 text-blue-700 shadow-xl ring-1 ring-white/80 sm:min-w-40 sm:px-5">
              <div className="text-center">
                <p className="mb-1 text-xs font-black uppercase tracking-[0.24em] text-blue-400">Score</p>
                <div className="whitespace-nowrap text-4xl font-black leading-none tracking-tight sm:text-7xl lg:text-8xl">
                  <span>{match.homeScore}</span>
                  <span className="px-2 text-slate-300 sm:px-3">-</span>
                  <span>{match.awayScore}</span>
                </div>
              </div>
            </div>
            <MatchHeroTeam label="Away" team={away} events={awayGoalEvents} players={awayPlayers} align="right" />
          </div>

          <div className="relative mt-4 grid gap-2 text-sm font-bold text-white/75 sm:grid-cols-3">
            <div className="rounded-lg bg-white/10 px-4 py-3 ring-1 ring-white/10">
              <p className="text-xs uppercase tracking-wide text-white/45">Kickoff</p>
              <p className="mt-1 text-base font-black text-white">{match.date} {match.time}</p>
            </div>
            <div className="rounded-lg bg-white/10 px-4 py-3 ring-1 ring-white/10">
              <p className="text-xs uppercase tracking-wide text-white/45">Stadium / location</p>
              <p className="mt-1 break-words text-base font-black text-white">{matchVenueLabel}</p>
            </div>
            <div className="rounded-lg bg-white/10 px-4 py-3 ring-1 ring-white/10">
              <p className="text-xs uppercase tracking-wide text-white/45">Status</p>
              <p className="mt-1 text-base font-black text-white">{matchStatusLabel}</p>
            </div>
          </div>
        </div>
      </section>

      <nav className="orso-tabbar sticky top-16 z-10 backdrop-blur sm:top-20">
        <div className="grid min-w-max grid-cols-7 gap-1 sm:min-w-0">
          {matchTabs.map((tab) => (
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

      {activeTab === "overview" ? (
        <OverviewTab
          data={data}
          match={match}
          home={home}
          away={away}
          events={events}
          homeGoalEvents={homeGoalEvents}
          awayGoalEvents={awayGoalEvents}
          homePlayers={homePlayers}
          awayPlayers={awayPlayers}
          matchPlayers={matchPlayers}
          venue={matchVenueLabel}
          clockLabel={clockLabel}
          eventHighlight={eventHighlight}
        />
      ) : null}

      {activeTab === "timeline" ? (
        <TimelineTab data={data} events={events} eventHighlight={eventHighlight} />
      ) : null}

      {activeTab === "lineups" ? (
        <LineupsTab home={home} away={away} homePlayers={homePlayers} awayPlayers={awayPlayers} />
      ) : null}

      {activeTab === "analysis" ? (
        <AnalysisTab data={data} match={match} home={home} away={away} events={events} />
      ) : null}

      {activeTab === "stats" ? (
        <div className="grid gap-5">
          <MatchStatisticsPanel data={data} match={match} home={home} away={away} />
          <Panel title="Player stats" eyebrow="Match numbers">
          <div className="grid gap-4">
            <TeamPlayerStats team={home} players={homePlayers} />
            <TeamPlayerStats team={away} players={awayPlayers} />
          </div>
          </Panel>
        </div>
      ) : null}

      {activeTab === "standings" ? (
        <StandingsTab data={data} match={match} />
      ) : null}

      {activeTab === "report" ? (
        <ReportTab
          data={data}
          match={match}
          home={home}
          away={away}
          events={events}
          homePlayers={homePlayers}
          awayPlayers={awayPlayers}
          venue={matchVenueLabel}
          clockLabel={clockLabel}
        />
      ) : null}
    </div>
  );
}
