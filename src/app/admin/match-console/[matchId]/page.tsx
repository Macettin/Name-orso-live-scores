"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import { ArrowLeft, Clock3, ExternalLink, Flag, Pause, Play, RotateCcw, ShieldAlert, TimerReset, Trash2, Trophy, Undo2, UserPlus, UserMinus } from "lucide-react";
import { TeamLogo } from "@/components/ui";
import { useTournamentData } from "@/hooks/use-tournament-data";
import { createId, getMatchTeamStats, getTeam } from "@/lib/data-store";
import { disciplinaryRows, readYellowCardSuspensionThreshold } from "@/lib/disciplinary";
import { formatMatchClock, getClockStateForAction } from "@/lib/match-clock";
import type { Match, MatchEvent, MatchLineupEntry, MatchLineupRole, MatchTeamStatKey, Player, PlayerStatKey, Team } from "@/lib/types";

type QuickAction = "goal" | "assist" | "yellow" | "red" | "own_goal" | "penalty_goal" | "missed_penalty";

const actionLabels: Record<QuickAction, string> = {
  goal: "Goal",
  assist: "Assist",
  yellow: "Yellow card",
  red: "Red card",
  own_goal: "Own goal",
  penalty_goal: "Penalty goal",
  missed_penalty: "Missed penalty"
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

function clockStatus(match: Match) {
  const period = match.periodLabel.toLowerCase();
  const label = match.clockLabel?.toLowerCase().trim();

  if (match.status === "Final" || period.includes("full") || period.includes("final") || label === "ft" || label === "full time") return "Full Time";
  if (period.includes("half time") || label === "ht" || label === "halftime" || label === "half time") return "Half Time";
  return match.clockRunning ? "Running" : "Paused";
}

function roleLabel(role: MatchLineupRole) {
  if (role === "starting") return "Starter";
  if (role === "substitute") return "Sub";
  return "Reserve";
}

function playerStatForAction(action: QuickAction): PlayerStatKey | null {
  if (action === "goal" || action === "penalty_goal") return "goals";
  if (action === "assist") return "assists";
  if (action === "yellow") return "yellow_cards";
  if (action === "red") return "red_cards";
  return null;
}

function eventTypeForAction(action: QuickAction): MatchEvent["type"] {
  if (action === "yellow") return "yellow";
  if (action === "red") return "red";
  if (action === "assist") return "assist";
  if (action === "own_goal") return "own_goal";
  if (action === "penalty_goal") return "penalty_goal";
  if (action === "missed_penalty") return "missed_penalty";
  return "goal";
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

function scoreDeltaForEvent(match: Match, event: MatchEvent, amount: 1 | -1) {
  const scoringTeamId = event.type === "own_goal"
    ? event.teamId === match.homeTeamId
      ? match.awayTeamId
      : event.teamId === match.awayTeamId
        ? match.homeTeamId
        : undefined
    : event.teamId;

  return {
    homeDelta: scoringTeamId === match.homeTeamId ? amount : 0,
    awayDelta: scoringTeamId === match.awayTeamId ? amount : 0
  };
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
    return <span className="h-12 w-12 shrink-0 rounded-full bg-cover bg-center ring-2 ring-white" style={{ backgroundImage: `url(${player.photoUrl})` }} />;
  }

  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-black text-blue-700 ring-2 ring-white">
      {playerInitials(player.name)}
    </span>
  );
}

function ScoreButton({ label, onClick, tone, icon }: { label: string; onClick: () => void; tone: "primary" | "subtle" | "danger"; icon?: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-black shadow-sm transition active:scale-[0.98] sm:min-h-11",
        tone === "primary" && "bg-blue-600 text-white hover:bg-blue-700",
        tone === "subtle" && "border border-blue-100 bg-white text-blue-700 hover:bg-blue-50",
        tone === "danger" && "border border-red-100 bg-red-50 text-red-700 hover:bg-red-100"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function roleForPlayer(player: Player, entries: MatchLineupEntry[]) {
  return entries.find((entry) => entry.playerId === player.id)?.role ?? "reserve";
}

function sortPlayersForConsole(players: Player[], entries: MatchLineupEntry[]) {
  const rank: Record<MatchLineupRole, number> = { starting: 0, substitute: 1, reserve: 2 };
  return [...players].sort((first, second) => rank[roleForPlayer(first, entries)] - rank[roleForPlayer(second, entries)] || first.number - second.number || first.name.localeCompare(second.name));
}

function TeamPanel({
  team,
  players,
  entries,
  substitutionEvents,
  score,
  selectedPlayerId,
  pendingOut,
  onPlayerClick,
  onScoreDelta,
  suspendedPlayerIds
}: {
  team?: Team;
  players: Player[];
  entries: MatchLineupEntry[];
  substitutionEvents: MatchEvent[];
  score: number;
  selectedPlayerId?: string;
  pendingOut?: { teamId: string; player: Player };
  onPlayerClick: (player: Player) => void;
  onScoreDelta: (delta: number) => void;
  suspendedPlayerIds: Set<string>;
}) {
  const playersIn = new Set(substitutionEvents.map((event) => event.playerInId).filter(Boolean));
  const playersOut = new Set(substitutionEvents.map((event) => event.playerOutId ?? event.playerId).filter(Boolean));
  const orderedPlayers = sortPlayersForConsole(players, entries);

  return (
    <section className="rounded-2xl border border-blue-100 bg-white p-3 shadow-[0_18px_42px_rgba(37,99,235,0.08)] sm:p-4 xl:min-h-0">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <TeamLogo team={team} size="h-12 w-12" />
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">{team?.sport ?? "Team"}</p>
            <h2 className="orso-team-name orso-team-name-2 text-lg font-black text-slate-950">{team?.name ?? "Team"}</h2>
          </div>
        </div>
        <div className="rounded-xl bg-blue-600 px-4 py-3 text-center text-white shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-white/70">Score</p>
          <p className="text-3xl font-black leading-none">{score}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <ScoreButton label="+ Score" tone="primary" onClick={() => onScoreDelta(1)} />
        <ScoreButton label="- Score" tone="subtle" onClick={() => onScoreDelta(-1)} />
      </div>

      {pendingOut && pendingOut.teamId === team?.id ? (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-800">
          Select player IN for {pendingOut.player.name}
        </div>
      ) : null}

      <div className="match-console-roster mt-4 grid gap-2 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        {orderedPlayers.map((player) => {
          const role = roleForPlayer(player, entries);
          const status = playersIn.has(player.id) ? "IN" : playersOut.has(player.id) ? "OUT" : "";
          const suspended = suspendedPlayerIds.has(player.id);
          return (
            <button
              key={player.id}
              type="button"
              onClick={() => onPlayerClick(player)}
              className={clsx(
                "grid min-h-20 grid-cols-[auto_1fr] gap-3 rounded-xl border p-3 text-left transition active:scale-[0.99] sm:min-h-24",
                selectedPlayerId === player.id ? "border-blue-500 bg-blue-50 shadow-[0_10px_24px_rgba(37,99,235,0.16)]" : "border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/50",
                pendingOut && pendingOut.teamId === team?.id && pendingOut.player.id !== player.id && "ring-2 ring-emerald-200"
              )}
            >
              <PlayerAvatar player={player} />
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-black text-slate-600">#{player.number}</span>
                  <span className="min-w-0 truncate text-sm font-black text-slate-950">{player.name}</span>
                </div>
                <p className="mt-1 truncate text-xs font-bold text-slate-500">{player.position || "Player"}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className={clsx("rounded-full px-2 py-0.5 text-[0.65rem] font-black", role === "starting" ? "bg-blue-100 text-blue-700" : role === "substitute" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}>
                    {roleLabel(role)}
                  </span>
                  {status ? <span className={clsx("rounded-full px-2 py-0.5 text-[0.65rem] font-black", status === "IN" ? "bg-emerald-600 text-white" : "bg-red-600 text-white")}>{status}</span> : null}
                  {suspended ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-[0.65rem] font-black text-red-700">Suspended</span> : null}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ConsoleTimeline({
  events,
  teamsById,
  playersById,
  canRemove,
  onUndoLast,
  onRemove
}: {
  events: MatchEvent[];
  teamsById: Map<string, Team>;
  playersById: Map<string, Player>;
  canRemove: boolean;
  onUndoLast: () => void;
  onRemove: (event: MatchEvent) => void;
}) {
  return (
    <section className="rounded-2xl border border-blue-100 bg-white p-3 shadow-[0_18px_42px_rgba(37,99,235,0.08)] sm:p-4 xl:min-h-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Live timeline</p>
          <h2 className="text-lg font-black text-slate-950">Live event feed</h2>
        </div>
        {canRemove ? (
          <button
            type="button"
            onClick={onUndoLast}
            disabled={events.length === 0}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Undo2 size={16} /> Undo last event
          </button>
        ) : null}
      </div>

      <div className="match-console-feed mt-4 grid gap-2 overflow-y-auto pr-1">
        {events.map((event) => {
          const team = event.teamId ? teamsById.get(event.teamId) : undefined;
          const player = event.playerId ? playersById.get(event.playerId) : undefined;
          const playerIn = event.playerInId ? playersById.get(event.playerInId) : undefined;
          const playerOut = event.playerOutId ? playersById.get(event.playerOutId) : player;
          const text = event.type === "substitution"
            ? `${playerOut?.name ?? "Player"} OUT / ${playerIn?.name ?? "Player"} IN`
            : [player?.name, event.description].filter(Boolean).join(" - ") || actionLabels[event.type as QuickAction] || "Match event";

          return (
            <article key={event.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2.5">
              <span className="flex h-9 min-w-11 items-center justify-center rounded-lg bg-blue-600 px-2 text-sm font-black text-white">{event.minute}</span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-blue-100 bg-white px-2 py-0.5 text-xs font-black text-blue-700">{eventIcons[event.type]}</span>
                  {team ? <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-black text-blue-700">{team.name}</span> : null}
                </div>
                <p className="mt-1 min-w-0 break-words text-sm font-black text-slate-950">{text}</p>
              </div>
              {canRemove ? (
                <button
                  type="button"
                  onClick={() => onRemove(event)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-red-100 bg-white text-red-600 hover:bg-red-50"
                  aria-label="Remove event"
                >
                  <Trash2 size={16} />
                </button>
              ) : null}
            </article>
          );
        })}
        {events.length === 0 ? (
          <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50 p-4 text-sm font-black text-blue-700">
            Scorekeeper actions will appear here automatically.
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default function MatchConsolePage() {
  const params = useParams<{ matchId: string }>();
  const router = useRouter();
  const { data, authLoading, canManageAll, canScore, saveScore, saveEvent, removeEvent, savePlayerMatchStat, saveMatchTeamStats, saveMatchLineups, supabaseEnabled } = useTournamentData();
  const [now, setNow] = useState(0);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [activeAction, setActiveAction] = useState<QuickAction | null>(null);
  const [minute, setMinute] = useState("");
  const [assistPlayerId, setAssistPlayerId] = useState("");
  const [pendingOut, setPendingOut] = useState<{ teamId: string; player: Player } | null>(null);
  const [yellowSuspensionThreshold] = useState(readYellowCardSuspensionThreshold);

  const match = useMemo(() => data.matches.find((item) => item.id === params.matchId), [data.matches, params.matchId]);
  const homeTeam = match ? getTeam(data, match.homeTeamId) : undefined;
  const awayTeam = match ? getTeam(data, match.awayTeamId) : undefined;
  const homePlayers = match ? data.players.filter((player) => player.teamId === match.homeTeamId) : [];
  const awayPlayers = match ? data.players.filter((player) => player.teamId === match.awayTeamId) : [];
  const matchLineups = match ? data.matchLineups.filter((entry) => entry.matchId === match.id) : [];
  const homeLineups = matchLineups.filter((entry) => entry.teamId === match?.homeTeamId);
  const awayLineups = matchLineups.filter((entry) => entry.teamId === match?.awayTeamId);
  const matchEvents = match ? data.events.filter((event) => event.matchId === match.id).sort((first, second) => minuteSortValue(second) - minuteSortValue(first)) : [];
  const disciplineRows = disciplinaryRows({ players: [...homePlayers, ...awayPlayers], teams: data.teams, matches: data.matches, events: data.events, yellowThreshold: yellowSuspensionThreshold });
  const suspendedPlayerIds = new Set(disciplineRows.filter((row) => row.isSuspended).map((row) => row.player.id));
  const substitutionEvents = matchEvents.filter((event) => event.type === "substitution");
  const teamsById = new Map(data.teams.map((team) => [team.id, team]));
  const playersById = new Map(data.players.map((player) => [player.id, player]));
  const selectedTeam = selectedPlayer ? getTeam(data, selectedPlayer.teamId) : undefined;
  const selectedTeamPlayers = selectedPlayer ? data.players.filter((player) => player.teamId === selectedPlayer.teamId && player.id !== selectedPlayer.id) : [];
  const selectedTeamSubsUsed = match && selectedPlayer ? data.events.filter((event) => event.matchId === match.id && event.teamId === selectedPlayer.teamId && event.type === "substitution").length : 0;
  const substitutionLimitReached = match?.sport === "Football" && selectedTeamSubsUsed >= 5;

  useEffect(() => {
    if (!supabaseEnabled || authLoading || canScore) return;
    router.replace(`/login?next=/admin/match-console/${params.matchId}`);
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
    void saveScore(
      match!.id,
      scorerPayload(match!, {
        homeScore: Math.max(0, match!.homeScore + homeDelta),
        awayScore: Math.max(0, match!.awayScore + awayDelta)
      })
    );
  }

  function updateTeamStats(teamId: string | undefined, deltas: Partial<Record<MatchTeamStatKey, number>>) {
    if (!teamId) return;

    const current = getMatchTeamStats(data, match!.id, teamId);
    const nextStats = { ...current.stats };

    for (const [statKey, amount] of Object.entries(deltas) as [MatchTeamStatKey, number][]) {
      nextStats[statKey] = Math.max(0, nextStats[statKey] + amount);
    }

    void saveMatchTeamStats({
      ...current,
      stats: nextStats
    });
  }

  function applyGoalScore(event: MatchEvent, amount: 1 | -1) {
    const { homeDelta, awayDelta } = scoreDeltaForEvent(match!, event, amount);
    if (homeDelta || awayDelta) {
      updateScore(homeDelta, awayDelta);
    }
  }

  function applyClockAction(action: "start" | "pause" | "resume" | "reset") {
    const clockState = getClockStateForAction(match!, action);
    void saveScore(match!.id, scorerPayload(match!, { ...clockState, status: action === "start" || action === "resume" ? "Live" : match!.status }));
  }

  function startSecondHalf() {
    const secondHalfMatch = {
      ...match!,
      periodLabel: "Second Half",
      clockBaseSeconds: 45 * 60,
      clockStartedAt: undefined,
      clockRunning: false
    };
    const clockState = getClockStateForAction(secondHalfMatch, "start");
    void saveScore(match!.id, scorerPayload(match!, { ...clockState, periodLabel: "Second Half", status: "Live", clockLabel: "" }));
  }

  function setFullTime() {
    void saveScore(match!.id, scorerPayload(match!, { status: "Final", periodLabel: "Full Time", clockRunning: false, clockLabel: "Full Time" }));
  }

  function openAction(player: Player, action: QuickAction) {
    setSelectedPlayer(player);
    setActiveAction(action);
    setAssistPlayerId("");
    setMinute(formatMatchClock(match!, now));
  }

  function closeAction() {
    setActiveAction(null);
    setAssistPlayerId("");
  }

  function updateLineupRole(player: Player, role: MatchLineupRole) {
    const teamEntries = data.matchLineups.filter((entry) => entry.matchId === match!.id && entry.teamId === player.teamId && entry.playerId !== player.id);
    void saveMatchLineups([
      ...teamEntries,
      {
        tournamentId: match!.tournamentId,
        matchId: match!.id,
        teamId: player.teamId,
        playerId: player.id,
        role
      }
    ]);
  }

  function saveAction() {
    if (!selectedPlayer || !activeAction || !minute.trim()) return;

    const eventType = eventTypeForAction(activeAction);
    const playerStat = playerStatForAction(activeAction);
    const isOwnGoal = eventType === "own_goal";

    if (playerStat) {
      void savePlayerMatchStat(match!.id, selectedPlayer.id, playerStat, 1);
    }

    if (activeAction === "goal" || activeAction === "penalty_goal") {
      if (assistPlayerId) {
        void savePlayerMatchStat(match!.id, assistPlayerId, "assists", 1);
      }
    }

    const assist = assistPlayerId ? data.players.find((player) => player.id === assistPlayerId) : undefined;
    const matchEvent: MatchEvent = {
      id: createId("event", `${match!.id}-${activeAction}-${selectedPlayer.id}-${minute}`),
      tournamentId: match!.tournamentId,
      matchId: match!.id,
      teamId: selectedPlayer.teamId,
      playerId: selectedPlayer.id,
      playerInId: assist?.id,
      type: eventType,
      minute: minute.trim(),
      description: (activeAction === "goal" || activeAction === "penalty_goal") && assist ? `${selectedPlayer.name} (Assist: ${assist.name})` : `${actionLabels[activeAction]} - ${selectedPlayer.name}`
    };

    void saveEvent(matchEvent);

    if (isOwnGoal) {
      applyGoalScore(matchEvent, 1);
    }

    if (activeAction === "goal" || activeAction === "penalty_goal") {
      updateTeamStats(selectedPlayer.teamId, { total_shots: 1, shots_on_target: 1 });
    } else if (activeAction === "missed_penalty") {
      updateTeamStats(selectedPlayer.teamId, { total_shots: 1 });
    } else if (activeAction === "yellow") {
      updateTeamStats(selectedPlayer.teamId, { yellow_cards: 1 });
    } else if (activeAction === "red") {
      updateTeamStats(selectedPlayer.teamId, { red_cards: 1 });
    }

    closeAction();
  }

  function reverseEvent(event: MatchEvent) {
    if (!canManageAll) return;

    if (event.type === "goal" || event.type === "penalty_goal") {
      if (event.playerId) void savePlayerMatchStat(match!.id, event.playerId, "goals", -1);
      if (event.playerInId) void savePlayerMatchStat(match!.id, event.playerInId, "assists", -1);
      updateTeamStats(event.teamId, { total_shots: -1, shots_on_target: -1 });
    } else if (event.type === "own_goal") {
      applyGoalScore(event, -1);
    } else if (event.type === "assist") {
      if (event.playerId) void savePlayerMatchStat(match!.id, event.playerId, "assists", -1);
    } else if (event.type === "missed_penalty") {
      updateTeamStats(event.teamId, { total_shots: -1 });
    } else if (event.type === "yellow") {
      if (event.playerId) void savePlayerMatchStat(match!.id, event.playerId, "yellow_cards", -1);
      updateTeamStats(event.teamId, { yellow_cards: -1 });
    } else if (event.type === "red") {
      if (event.playerId) void savePlayerMatchStat(match!.id, event.playerId, "red_cards", -1);
      updateTeamStats(event.teamId, { red_cards: -1 });
    }

    void removeEvent(event.id);
  }

  function undoLastEvent() {
    const lastEvent = matchEvents[0];
    if (lastEvent) {
      reverseEvent(lastEvent);
    }
  }

  function startSubstitutionOut(player: Player) {
    if (substitutionLimitReached) return;
    setPendingOut({ teamId: player.teamId, player });
    setSelectedPlayer(null);
    setActiveAction(null);
    setMinute(formatMatchClock(match!, now));
  }

  function saveSubstitution(playerIn: Player) {
    if (!pendingOut || pendingOut.teamId !== playerIn.teamId || pendingOut.player.id === playerIn.id || !minute.trim()) return;

    void saveEvent({
      id: createId("event", `${match!.id}-substitution-${minute}-${pendingOut.player.id}-${playerIn.id}`),
      tournamentId: match!.tournamentId,
      matchId: match!.id,
      teamId: pendingOut.teamId,
      playerId: pendingOut.player.id,
      playerOutId: pendingOut.player.id,
      playerInId: playerIn.id,
      type: "substitution",
      minute: minute.trim(),
      description: `${playerIn.name} replaces ${pendingOut.player.name}`
    });
    updateLineupRole(playerIn, "substitute");
    setPendingOut(null);
  }

  function handlePlayerClick(player: Player) {
    if (pendingOut && pendingOut.teamId === player.teamId && pendingOut.player.id !== player.id) {
      saveSubstitution(player);
      return;
    }
    setSelectedPlayer(player);
    setActiveAction(null);
  }

  return (
    <main className="match-console mx-auto grid w-full max-w-[1800px] gap-3 pb-8 md:gap-4">
      <section className="sticky top-2 z-30 overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-[0_24px_60px_rgba(37,99,235,0.18)]">
        <div className="bg-[radial-gradient(circle_at_top_left,#2563eb_0%,#1e40af_38%,#0f172a_100%)] p-3 text-white sm:p-4">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,0.95fr)_minmax(24rem,1.05fr)] xl:items-center">
            <div className="grid gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <Link href="/admin" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 hover:bg-white/15" aria-label="Back to admin">
                  <ArrowLeft size={19} />
                </Link>
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-100/75">Professional Match Console</p>
                  <h1 className="orso-team-name orso-team-name-2 mt-1 text-xl font-black leading-tight sm:text-2xl">
                    {homeTeam?.name ?? "Home"} vs {awayTeam?.name ?? "Away"}
                  </h1>
                  <div className="mt-2 hidden flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-white/70 sm:flex">
                    <span>{match.date}</span>
                    <span className="text-white/30">/</span>
                    <span>{match.time}</span>
                    <span className="text-white/30">/</span>
                    <span>{match.court}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                <div className="rounded-xl border border-white/10 bg-white/10 p-3">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-100/70">Status</p>
                  <p className="mt-1 text-xl font-black">{match.status}</p>
                  <p className="mt-1 text-sm font-bold text-white/65">{clockStatus(match)}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/10 p-3">
                  <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-blue-100/70"><Flag size={15} /> Period</p>
                  <p className="mt-1 text-xl font-black">{match.periodLabel || "Pregame"}</p>
                  <p className="mt-1 text-sm font-bold text-white/65">{match.sport}</p>
                </div>
                <Link href={`/matches/${match.id}`} className="flex min-h-16 items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/10 p-3 text-left font-black transition hover:bg-white/15">
                  <span>
                    <span className="block text-xs uppercase tracking-[0.18em] text-blue-100/70">Public</span>
                    <span className="mt-1 block text-base">Open match</span>
                  </span>
                  <ExternalLink size={20} />
                </Link>
                <Link href={`/scoreboard/${match.id}`} className="flex min-h-16 items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/10 p-3 text-left font-black transition hover:bg-white/15">
                  <span>
                    <span className="block text-xs uppercase tracking-[0.18em] text-blue-100/70">Display</span>
                    <span className="mt-1 block text-base">Scoreboard</span>
                  </span>
                  <ExternalLink size={20} />
                </Link>
              </div>
            </div>

            <div className="grid gap-3 rounded-2xl bg-white p-3 text-slate-950 shadow-xl">
              <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                <div className="min-w-0 text-right">
                  <TeamLogo team={homeTeam} size="ml-auto mb-1 h-9 w-9" />
                  <p className="orso-team-name orso-team-name-2 text-sm font-black">{homeTeam?.name ?? "Home"}</p>
                </div>
                <p className="whitespace-nowrap rounded-2xl bg-blue-600 px-3 py-2 text-4xl font-black leading-none text-white sm:text-5xl">
                  {match.homeScore} - {match.awayScore}
                </p>
                <div className="min-w-0">
                  <TeamLogo team={awayTeam} size="mb-1 h-9 w-9" />
                  <p className="orso-team-name orso-team-name-2 text-sm font-black">{awayTeam?.name ?? "Away"}</p>
                </div>
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-3 text-center">
                <p className="flex items-center justify-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-blue-700"><Clock3 size={15} /> Live clock</p>
                <p className="mt-1 text-4xl font-black leading-none text-slate-950 sm:text-5xl">{clockLabel}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
                <ScoreButton label="Start" tone="primary" icon={<Play size={16} />} onClick={() => applyClockAction("start")} />
                <ScoreButton label={match.clockRunning ? "Pause" : "Resume"} tone="subtle" icon={match.clockRunning ? <Pause size={16} /> : <Play size={16} />} onClick={() => applyClockAction(match.clockRunning ? "pause" : "resume")} />
                <ScoreButton label="Second Half" tone="subtle" icon={<Flag size={16} />} onClick={startSecondHalf} />
                <ScoreButton label="Full Time" tone="danger" icon={<Flag size={16} />} onClick={setFullTime} />
                <ScoreButton label="Reset" tone="subtle" icon={<RotateCcw size={16} />} onClick={() => applyClockAction("reset")} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.34fr)] xl:items-start">
        <div className="grid min-w-0 gap-3 lg:grid-cols-2">
          <TeamPanel
            team={homeTeam}
            players={homePlayers}
            entries={homeLineups}
            substitutionEvents={substitutionEvents.filter((event) => event.teamId === match.homeTeamId)}
            score={match.homeScore}
            selectedPlayerId={selectedPlayer?.id}
            pendingOut={pendingOut ?? undefined}
            onPlayerClick={handlePlayerClick}
            onScoreDelta={(delta) => updateScore(delta, 0)}
            suspendedPlayerIds={suspendedPlayerIds}
          />
          <TeamPanel
            team={awayTeam}
            players={awayPlayers}
            entries={awayLineups}
            substitutionEvents={substitutionEvents.filter((event) => event.teamId === match.awayTeamId)}
            score={match.awayScore}
            selectedPlayerId={selectedPlayer?.id}
            pendingOut={pendingOut ?? undefined}
            onPlayerClick={handlePlayerClick}
            onScoreDelta={(delta) => updateScore(0, delta)}
            suspendedPlayerIds={suspendedPlayerIds}
          />
        </div>

        <ConsoleTimeline
          events={matchEvents}
          teamsById={teamsById}
          playersById={playersById}
          canRemove={canManageAll}
          onUndoLast={undoLastEvent}
          onRemove={reverseEvent}
        />
      </section>

      {selectedPlayer ? (
        <section className="sticky bottom-3 z-20 rounded-2xl border border-blue-200 bg-white/95 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.24)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Quick actions / {selectedTeam?.name ?? "Team"}</p>
              <h2 className="text-lg font-black text-slate-950">#{selectedPlayer.number} {selectedPlayer.name}</h2>
              <p className="text-sm font-semibold text-slate-500">{selectedPlayer.position || "Player"} / {selectedTeamSubsUsed}/5 subs used</p>
            </div>
            <button type="button" onClick={() => setSelectedPlayer(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-black text-slate-600">Close</button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-9">
            {(["goal", "penalty_goal", "missed_penalty", "own_goal", "assist", "yellow", "red"] as QuickAction[]).map((action) => (
              <button key={action} type="button" onClick={() => openAction(selectedPlayer, action)} className={clsx("min-h-14 rounded-xl px-3 py-2 text-sm font-black", activeAction === action ? "bg-blue-600 text-white" : "border border-blue-100 bg-blue-50 text-blue-700")}>
                {actionLabels[action]}
              </button>
            ))}
            <button type="button" onClick={() => startSubstitutionOut(selectedPlayer)} disabled={substitutionLimitReached} className="flex min-h-14 items-center justify-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400">
              <UserMinus size={16} /> Sub out
            </button>
            <button type="button" onClick={() => saveSubstitution(selectedPlayer)} disabled={!pendingOut || pendingOut.teamId !== selectedPlayer.teamId || pendingOut.player.id === selectedPlayer.id} className="flex min-h-14 items-center justify-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400">
              <UserPlus size={16} /> Sub in
            </button>
          </div>

          {substitutionLimitReached ? <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{selectedTeam?.name ?? "Team"} already used 5 substitutions.</p> : null}
          {suspendedPlayerIds.has(selectedPlayer.id) ? <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">This player is currently suspended by tournament disciplinary rules.</p> : null}

          {activeAction ? (
            <div className="mt-4 grid gap-3 rounded-xl border border-blue-100 bg-blue-50 p-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <label>
                <span className="text-sm font-bold text-slate-700">Minute</span>
                <input value={minute} onChange={(event) => setMinute(event.target.value)} className="orso-input mt-2" placeholder="62' or 90+1'" />
              </label>
              {activeAction === "goal" || activeAction === "penalty_goal" ? (
                <label>
                  <span className="text-sm font-bold text-slate-700">Assist optional</span>
                  <select value={assistPlayerId} onChange={(event) => setAssistPlayerId(event.target.value)} className="orso-input mt-2">
                    <option value="">No assist</option>
                    {selectedTeamPlayers.map((player) => (
                      <option key={player.id} value={player.id}>#{player.number} {player.name}</option>
                    ))}
                  </select>
                </label>
              ) : <div />}
              <button type="button" onClick={saveAction} className="min-h-11 rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-700">
                Save {actionLabels[activeAction]}
              </button>
            </div>
          ) : null}

          {pendingOut ? (
            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                <label>
                  <span className="text-sm font-bold text-slate-700">Substitution minute</span>
                  <input value={minute} onChange={(event) => setMinute(event.target.value)} className="orso-input mt-2" placeholder="62' or 90+1'" />
                </label>
                <button type="button" onClick={() => setPendingOut(null)} className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700">
                  Cancel substitution
                </button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {!supabaseEnabled ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">
          <ShieldAlert className="mr-2 inline h-4 w-4" />
          Supabase is not configured. Console access is open in local demo mode.
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 xl:hidden">
        <div className="flex flex-wrap items-center gap-2 text-sm font-black text-slate-500">
          <Trophy size={16} className="text-blue-600" />
          {match.date} / {match.time} / {match.court}
          <span className="mx-1 text-slate-300">/</span>
          <TimerReset size={16} className="text-blue-600" />
          {match.periodLabel}
        </div>
      </section>
    </main>
  );
}
