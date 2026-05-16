"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import { ArrowLeft, Clock3, Pause, Play, RotateCcw, ShieldAlert, Trash2, UserRoundX } from "lucide-react";
import { TeamLogo } from "@/components/ui";
import { useTournamentData } from "@/hooks/use-tournament-data";
import { createId, getMatchTeamStats, getTeam } from "@/lib/data-store";
import { formatMatchClock, getClockStateForAction } from "@/lib/match-clock";
import type { Match, MatchEvent, MatchTeamStatKey, Player, PlayerStatKey, Team } from "@/lib/types";

type TeamSide = "home" | "away";
type PlayerAction = "goal" | "assist" | "yellow" | "red" | "substitution" | "penalty_goal" | "missed_penalty";

const actionLabels: Record<PlayerAction, string> = {
  goal: "Goal",
  assist: "Assist",
  yellow: "Yellow Card",
  red: "Red Card",
  substitution: "Substitute",
  penalty_goal: "Penalty Goal",
  missed_penalty: "Missed Penalty"
};

const eventIcons: Record<MatchEvent["type"], string> = {
  goal: "\u26bd",
  assist: "A",
  yellow: "YC",
  red: "RC",
  substitution: "SUB",
  own_goal: "OG",
  penalty_goal: "P",
  missed_penalty: "MP"
};

function scorerPayload(match: Match, updates: Partial<Match> = {}) {
  return {
    homeScore: updates.homeScore ?? match.homeScore,
    awayScore: updates.awayScore ?? match.awayScore,
    periodLabel: updates.periodLabel ?? match.periodLabel,
    status: updates.status ?? match.status,
    matchMinute: updates.matchMinute ?? match.matchMinute,
    clockLabel: updates.clockLabel ?? match.clockLabel,
    clockRunning: updates.clockRunning ?? match.clockRunning,
    clockStartedAt: updates.clockStartedAt ?? match.clockStartedAt,
    clockBaseSeconds: updates.clockBaseSeconds ?? match.clockBaseSeconds,
    clockCountdownSeconds: updates.clockCountdownSeconds ?? match.clockCountdownSeconds
  };
}

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
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "P";
}

function PlayerAvatar({ player }: { player: Player }) {
  if (player.photoUrl) {
    return <span aria-hidden="true" className="h-14 w-14 shrink-0 rounded-2xl bg-cover bg-center ring-1 ring-white/20" style={{ backgroundImage: `url(${player.photoUrl})` }} />;
  }

  return <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-sm font-black text-white ring-1 ring-white/20">{playerInitials(player.name)}</span>;
}

function playerStatForAction(action: PlayerAction): PlayerStatKey | null {
  if (action === "goal" || action === "penalty_goal") return "goals";
  if (action === "assist") return "assists";
  if (action === "yellow") return "yellow_cards";
  if (action === "red") return "red_cards";
  return null;
}

function eventTypeForAction(action: PlayerAction): MatchEvent["type"] {
  if (action === "yellow") return "yellow";
  if (action === "red") return "red";
  if (action === "penalty_goal") return "penalty_goal";
  if (action === "missed_penalty") return "missed_penalty";
  if (action === "assist") return "assist";
  return "goal";
}

function scoreDelta(match: Match, teamId?: string, amount: 1 | -1 = 1) {
  return {
    homeDelta: teamId === match.homeTeamId ? amount : 0,
    awayDelta: teamId === match.awayTeamId ? amount : 0
  };
}

function PlayerCard({ player, events, onClick }: { player: Player; events: MatchEvent[]; onClick: () => void }) {
  const goals = events.filter((event) => event.playerId === player.id && (event.type === "goal" || event.type === "penalty_goal")).length;
  const yellows = events.filter((event) => event.playerId === player.id && event.type === "yellow").length;
  const reds = events.filter((event) => event.playerId === player.id && event.type === "red").length;

  return (
    <button type="button" onClick={onClick} className="grid min-h-24 grid-cols-[auto_1fr] gap-3 rounded-2xl border border-white/10 bg-white/[0.07] p-3 text-left text-white shadow-lg shadow-black/10 active:scale-[0.99]">
      <PlayerAvatar player={player} />
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span className="rounded-full bg-white/10 px-2 py-1 text-xs font-black text-blue-100">#{player.number}</span>
          <p className="truncate text-base font-black">{player.name}</p>
        </div>
        <p className="mt-1 truncate text-sm font-bold text-white/55">{player.position || "Player"}</p>
        <div className="mt-2 flex flex-wrap gap-1.5 text-[0.7rem] font-black">
          <span className="rounded-full bg-emerald-400/15 px-2 py-1 text-emerald-100">{goals} G</span>
          <span className="rounded-full bg-yellow-300/15 px-2 py-1 text-yellow-100">{yellows} YC</span>
          <span className="rounded-full bg-red-400/15 px-2 py-1 text-red-100">{reds} RC</span>
        </div>
      </div>
    </button>
  );
}

function TimelineItem({ event, playersById, teamsById, canRemove, onRemove }: { event: MatchEvent; playersById: Map<string, Player>; teamsById: Map<string, Team>; canRemove: boolean; onRemove: () => void }) {
  const player = event.playerId ? playersById.get(event.playerId) : undefined;
  const team = event.teamId ? teamsById.get(event.teamId) : undefined;
  const inPlayer = event.playerInId ? playersById.get(event.playerInId) : undefined;
  const outPlayer = event.playerOutId ? playersById.get(event.playerOutId) : player;
  const label = event.type === "substitution" ? `${outPlayer?.name ?? "Player"} OUT / ${inPlayer?.name ?? "Player"} IN` : player?.name || event.description || "Match event";

  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-xl bg-white/[0.07] px-2.5 py-2 text-white">
      <span className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-black">{event.minute}</span>
      <div className="min-w-0">
        <p className="truncate text-sm font-black">{eventIcons[event.type]} {label}</p>
        <p className="truncate text-xs font-bold text-white/45">{team?.name ?? "Match"}</p>
      </div>
      {canRemove ? (
        <button type="button" onClick={onRemove} className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/15 text-red-100" aria-label="Remove event">
          <Trash2 size={15} />
        </button>
      ) : null}
    </div>
  );
}

export default function SimpleScorekeeperPage() {
  const params = useParams<{ matchId: string }>();
  const router = useRouter();
  const { data, authLoading, canManageAll, canScore, saveScore, saveEvent, removeEvent, savePlayerMatchStat, saveMatchTeamStats, supabaseEnabled } = useTournamentData();
  const [now, setNow] = useState(0);
  const [activeSide, setActiveSide] = useState<TeamSide>("home");
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [subOutPlayer, setSubOutPlayer] = useState<Player | null>(null);

  const match = useMemo(() => data.matches.find((item) => item.id === params.matchId), [data.matches, params.matchId]);
  const homeTeam = match ? getTeam(data, match.homeTeamId) : undefined;
  const awayTeam = match ? getTeam(data, match.awayTeamId) : undefined;
  const homePlayers = match ? data.players.filter((player) => player.teamId === match.homeTeamId) : [];
  const awayPlayers = match ? data.players.filter((player) => player.teamId === match.awayTeamId) : [];
  const activePlayers = activeSide === "home" ? homePlayers : awayPlayers;
  const events = match ? data.events.filter((event) => event.matchId === match.id).sort((first, second) => minuteSortValue(second) - minuteSortValue(first)) : [];
  const latestEvents = events.slice(0, 5);
  const teamsById = new Map(data.teams.map((team) => [team.id, team]));
  const playersById = new Map(data.players.map((player) => [player.id, player]));

  useEffect(() => {
    if (!supabaseEnabled || authLoading || canScore) return;
    router.replace(`/login?next=/admin/scorer/${params.matchId}`);
  }, [authLoading, canScore, params.matchId, router, supabaseEnabled]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (supabaseEnabled && authLoading) {
    return <div className="rounded-xl border border-blue-100 bg-blue-50 p-5 font-black text-blue-700">Checking scorer access...</div>;
  }

  if (supabaseEnabled && !canScore) {
    return <div className="rounded-xl border border-blue-100 bg-blue-50 p-5 font-black text-blue-700">Redirecting to login...</div>;
  }

  if (!match) {
    return <div className="rounded-xl border border-slate-200 bg-white p-5 font-black text-slate-900">Match not found.</div>;
  }

  const clockLabel = formatMatchClock(match, now);

  function updateScore(homeDelta: number, awayDelta: number) {
    void saveScore(match!.id, scorerPayload(match!, {
      homeScore: Math.max(0, match!.homeScore + homeDelta),
      awayScore: Math.max(0, match!.awayScore + awayDelta)
    }));
  }

  function applyClockAction(action: "start" | "pause" | "resume" | "reset") {
    const clockState = getClockStateForAction(match!, action);
    void saveScore(match!.id, scorerPayload(match!, { ...clockState, status: action === "start" || action === "resume" ? "Live" : match!.status }));
  }

  function startSecondHalf() {
    const secondHalfMatch = { ...match!, periodLabel: "Second Half", clockBaseSeconds: 45 * 60, clockStartedAt: undefined, clockRunning: false };
    const clockState = getClockStateForAction(secondHalfMatch, "start");
    void saveScore(match!.id, scorerPayload(match!, { ...clockState, periodLabel: "Second Half", status: "Live", clockLabel: "" }));
  }

  function setFullTime() {
    void saveScore(match!.id, scorerPayload(match!, { status: "Final", periodLabel: "Full Time", clockRunning: false, clockLabel: "Full Time" }));
  }

  function updateTeamStats(teamId: string | undefined, deltas: Partial<Record<MatchTeamStatKey, number>>) {
    if (!teamId) return;
    const current = getMatchTeamStats(data, match!.id, teamId);
    const nextStats = { ...current.stats };
    for (const [statKey, amount] of Object.entries(deltas) as [MatchTeamStatKey, number][]) {
      nextStats[statKey] = Math.max(0, nextStats[statKey] + amount);
    }
    void saveMatchTeamStats({ ...current, stats: nextStats });
  }

  function savePlayerAction(player: Player, action: PlayerAction) {
    if (action === "substitution") {
      setSubOutPlayer(player);
      setSelectedPlayer(null);
      return;
    }

    const statKey = playerStatForAction(action);
    if (statKey) {
      void savePlayerMatchStat(match!.id, player.id, statKey, 1);
    }

    const eventType = eventTypeForAction(action);
    const event: MatchEvent = {
      id: createId("event", `${match!.id}-${action}-${player.id}-${clockLabel}`),
      tournamentId: match!.tournamentId,
      matchId: match!.id,
      teamId: player.teamId,
      playerId: player.id,
      type: eventType,
      minute: clockLabel,
      description: `${actionLabels[action]} - ${player.name}`
    };
    void saveEvent(event);

    if (action === "goal" || action === "penalty_goal") {
      const { homeDelta, awayDelta } = scoreDelta(match!, player.teamId, 1);
      updateScore(homeDelta, awayDelta);
      updateTeamStats(player.teamId, { total_shots: 1, shots_on_target: 1 });
    } else if (action === "missed_penalty") {
      updateTeamStats(player.teamId, { total_shots: 1 });
    } else if (action === "yellow") {
      updateTeamStats(player.teamId, { yellow_cards: 1 });
    } else if (action === "red") {
      updateTeamStats(player.teamId, { red_cards: 1 });
    }

    setSelectedPlayer(null);
  }

  function saveSubstitution(playerIn: Player) {
    if (!subOutPlayer || subOutPlayer.teamId !== playerIn.teamId || subOutPlayer.id === playerIn.id) return;
    void saveEvent({
      id: createId("event", `${match!.id}-substitution-${clockLabel}-${subOutPlayer.id}-${playerIn.id}`),
      tournamentId: match!.tournamentId,
      matchId: match!.id,
      teamId: subOutPlayer.teamId,
      playerId: subOutPlayer.id,
      playerOutId: subOutPlayer.id,
      playerInId: playerIn.id,
      type: "substitution",
      minute: clockLabel,
      description: `${playerIn.name} replaces ${subOutPlayer.name}`
    });
    setSubOutPlayer(null);
  }

  function reverseEvent(event: MatchEvent) {
    if (event.type === "goal" || event.type === "penalty_goal") {
      if (event.playerId) void savePlayerMatchStat(match!.id, event.playerId, "goals", -1);
      const { homeDelta, awayDelta } = scoreDelta(match!, event.teamId, -1);
      updateScore(homeDelta, awayDelta);
      updateTeamStats(event.teamId, { total_shots: -1, shots_on_target: -1 });
    } else if (event.type === "assist") {
      if (event.playerId) void savePlayerMatchStat(match!.id, event.playerId, "assists", -1);
    } else if (event.type === "yellow") {
      if (event.playerId) void savePlayerMatchStat(match!.id, event.playerId, "yellow_cards", -1);
      updateTeamStats(event.teamId, { yellow_cards: -1 });
    } else if (event.type === "red") {
      if (event.playerId) void savePlayerMatchStat(match!.id, event.playerId, "red_cards", -1);
      updateTeamStats(event.teamId, { red_cards: -1 });
    } else if (event.type === "missed_penalty") {
      updateTeamStats(event.teamId, { total_shots: -1 });
    }
    void removeEvent(event.id);
  }

  function undoLastAction() {
    const lastEvent = events[0];
    if (lastEvent) reverseEvent(lastEvent);
  }

  return (
    <main className="min-h-[calc(100vh-5rem)] overflow-hidden rounded-3xl bg-slate-950 text-white shadow-2xl shadow-slate-950/20">
      <section className="sticky top-0 z-20 border-b border-white/10 bg-[radial-gradient(circle_at_top,#2563eb_0%,#0f172a_46%,#020617_100%)] px-3 py-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <Link href="/admin" className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white" aria-label="Back to admin">
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0 text-center">
            <p className="truncate text-xs font-black uppercase tracking-[0.18em] text-blue-100/60">{match.status}</p>
            <p className="truncate text-sm font-black text-white">{homeTeam?.name ?? "Home"} vs {awayTeam?.name ?? "Away"}</p>
          </div>
          {!supabaseEnabled ? <ShieldAlert size={20} className="text-amber-200" /> : <span className="h-11 w-11" />}
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
          <p className="truncate text-right text-sm font-black text-white">{homeTeam?.name ?? "Home"}</p>
          <div className="rounded-2xl bg-white px-4 py-2 text-center text-blue-700 shadow-xl">
            <p className="whitespace-nowrap text-4xl font-black leading-none">{match.homeScore} - {match.awayScore}</p>
            <p className="mt-1 flex items-center justify-center gap-1 text-xs font-black uppercase tracking-wide text-slate-400"><Clock3 size={13} /> {clockLabel}</p>
          </div>
          <p className="truncate text-sm font-black text-white">{awayTeam?.name ?? "Away"}</p>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2">
          <button type="button" onClick={() => applyClockAction("start")} className="flex min-h-12 items-center justify-center gap-1 rounded-xl bg-blue-500 px-2 text-sm font-black text-white"><Play size={15} /> Start</button>
          <button type="button" onClick={() => applyClockAction(match.clockRunning ? "pause" : "resume")} className="flex min-h-12 items-center justify-center gap-1 rounded-xl bg-white/10 px-2 text-sm font-black text-white">{match.clockRunning ? <Pause size={15} /> : <Play size={15} />} Pause</button>
          <button type="button" onClick={startSecondHalf} className="min-h-12 rounded-xl bg-white/10 px-2 text-sm font-black text-white">2nd Half</button>
          <button type="button" onClick={setFullTime} className="min-h-12 rounded-xl bg-red-500/20 px-2 text-sm font-black text-red-100">Full Time</button>
        </div>
      </section>

      <section className="grid gap-3 p-3">
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white/[0.06] p-1">
          <button type="button" onClick={() => setActiveSide("home")} className={clsx("min-h-12 rounded-xl text-base font-black", activeSide === "home" ? "bg-blue-600 text-white" : "text-white/55")}>Home</button>
          <button type="button" onClick={() => setActiveSide("away")} className={clsx("min-h-12 rounded-xl text-base font-black", activeSide === "away" ? "bg-blue-600 text-white" : "text-white/55")}>Away</button>
        </div>

        <button type="button" onClick={undoLastAction} disabled={events.length === 0} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-red-300/20 bg-red-500/15 text-base font-black text-red-100 disabled:opacity-45">
          <RotateCcw size={18} /> Undo Last Action
        </button>

        {subOutPlayer ? (
          <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/15 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-black text-emerald-100">Choose player IN for {subOutPlayer.name}</p>
              <button type="button" onClick={() => setSubOutPlayer(null)} className="rounded-lg bg-white/10 px-3 py-2 text-xs font-black text-white">Cancel</button>
            </div>
          </div>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2">
          {activePlayers.map((player) => (
            <PlayerCard key={player.id} player={player} events={events} onClick={() => subOutPlayer ? saveSubstitution(player) : setSelectedPlayer(player)} />
          ))}
        </div>

        <section className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
          <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-blue-100/60">Latest events</p>
          <div className="grid gap-2">
            {latestEvents.map((event) => (
              <TimelineItem key={event.id} event={event} playersById={playersById} teamsById={teamsById} canRemove={canManageAll} onRemove={() => reverseEvent(event)} />
            ))}
            {latestEvents.length === 0 ? <p className="rounded-xl bg-white/[0.06] px-3 py-4 text-sm font-bold text-white/55">No actions yet.</p> : null}
          </div>
        </section>
      </section>

      {selectedPlayer ? (
        <section className="fixed inset-x-0 bottom-0 z-30 rounded-t-3xl border border-white/10 bg-slate-950 p-4 text-white shadow-[0_-24px_80px_rgba(0,0,0,0.45)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-lg font-black">#{selectedPlayer.number} {selectedPlayer.name}</p>
              <p className="truncate text-sm font-bold text-white/50">{selectedPlayer.position || "Player"}</p>
            </div>
            <button type="button" onClick={() => setSelectedPlayer(null)} className="rounded-xl bg-white/10 px-4 py-3 text-sm font-black">Cancel</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(["goal", "assist", "yellow", "red", "substitution", "penalty_goal", "missed_penalty"] as PlayerAction[]).map((action) => (
              <button key={action} type="button" onClick={() => savePlayerAction(selectedPlayer, action)} className={clsx("min-h-14 rounded-2xl px-3 text-base font-black", action === "red" ? "bg-red-500/20 text-red-100" : action === "yellow" ? "bg-yellow-300/20 text-yellow-100" : "bg-blue-600 text-white")}>
                {actionLabels[action]}
              </button>
            ))}
            <button type="button" onClick={() => setSelectedPlayer(null)} className="min-h-14 rounded-2xl bg-white/10 px-3 text-base font-black text-white">Cancel</button>
          </div>
        </section>
      ) : null}
    </main>
  );
}
