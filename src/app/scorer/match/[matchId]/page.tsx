"use client";

import { ArrowLeft, Minus, Pause, Play, RotateCcw, ShieldAlert, Square, Trophy, Video } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PageHeader, TeamLogo } from "@/components/ui";
import { YouTubeEmbed } from "@/components/youtube-embed";
import { useTournamentData } from "@/hooks/use-tournament-data";
import { createId, getTeam } from "@/lib/data-store";
import { formatMatchClock, getClockStateForAction } from "@/lib/match-clock";
import type { Match, MatchEventType, Sport, Team } from "@/lib/types";

const periodOptions: Record<Sport, string[]> = {
  Football: ["First Half", "Half Time", "Second Half", "Full Time"],
  Basketball: ["Q1", "Q2", "Half Time", "Q3", "Q4", "Final"],
  Volleyball: ["Set 1", "Set 2", "Set 3", "Set 4", "Set 5", "Final"]
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

  if (match.status === "Final" || period.includes("full") || period.includes("final")) return "Full Time";
  if (period.includes("half time")) return "Half Time";
  if (match.clockRunning) return "Running";
  return "Paused";
}

function EventButton({
  label,
  type,
  onClick
}: {
  label: string;
  type: "goal" | "yellow" | "red";
  onClick: () => void;
}) {
  const classes = {
    goal: "border-emerald-400/30 bg-emerald-400/15 text-emerald-100 hover:bg-emerald-400/25",
    yellow: "border-yellow-300/30 bg-yellow-300/15 text-yellow-100 hover:bg-yellow-300/25",
    red: "border-red-400/30 bg-red-400/15 text-red-100 hover:bg-red-400/25"
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-12 rounded-lg border px-3 py-2 text-sm font-black transition active:scale-[0.98] ${classes[type]}`}
    >
      {label}
    </button>
  );
}

function ScoreButton({
  label,
  onClick,
  tone
}: {
  label: string;
  onClick: () => void;
  tone: "add" | "remove";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-20 items-center justify-center rounded-xl border text-4xl font-black shadow-lg transition active:scale-[0.98] ${
        tone === "add"
          ? "border-blue-300/30 bg-blue-500 text-white hover:bg-blue-400"
          : "border-white/10 bg-white/10 text-white hover:bg-white/15"
      }`}
      aria-label={label}
    >
      {tone === "add" ? "+" : <Minus className="h-9 w-9" />}
    </button>
  );
}

function TeamScoringCard({
  team,
  score,
  side,
  onAdd,
  onRemove,
  onEvent,
  showFootballEvents
}: {
  team?: Team;
  score: number;
  side: "Home" | "Away";
  onAdd: () => void;
  onRemove: () => void;
  onEvent: (type: MatchEventType) => void;
  showFootballEvents: boolean;
}) {
  return (
    <section className="flex min-h-full flex-col rounded-2xl border border-white/10 bg-white/[0.06] p-3 shadow-2xl shadow-black/20 sm:p-4">
      <div className="flex min-w-0 items-center gap-3">
        <TeamLogo team={team} size="h-14 w-14 sm:h-16 sm:w-16" className="border-white/20 bg-white" />
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-200/70">{side}</p>
          <h2 className="mt-1 text-balance break-words text-xl font-black leading-tight text-white sm:text-2xl md:text-[clamp(1.2rem,2.4vw,2rem)]">
            {team?.name ?? "Team"}
          </h2>
        </div>
      </div>

      <div className="my-4 rounded-2xl border border-blue-300/20 bg-slate-950/80 px-4 py-3 text-center shadow-inner">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Score</p>
        <p className="text-6xl font-black leading-none text-white sm:text-7xl">{score}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ScoreButton label={`Add ${side} score`} tone="add" onClick={onAdd} />
        <ScoreButton label={`Remove ${side} score`} tone="remove" onClick={onRemove} />
      </div>

      {showFootballEvents ? (
        <div className="mt-4 grid grid-cols-3 gap-2">
          <EventButton label="Goal" type="goal" onClick={() => onEvent("goal")} />
          <EventButton label="Yellow" type="yellow" onClick={() => onEvent("yellow")} />
          <EventButton label="Red" type="red" onClick={() => onEvent("red")} />
        </div>
      ) : null}
    </section>
  );
}

export default function ScorerMatchPage() {
  const params = useParams<{ matchId: string }>();
  const router = useRouter();
  const { data, authLoading, canScore, saveScore, saveEvent, supabaseEnabled } = useTournamentData();
  const [now, setNow] = useState(0);

  const match = useMemo(() => data.matches.find((item) => item.id === params.matchId), [data.matches, params.matchId]);
  const homeTeam = useMemo(() => (match ? getTeam(data, match.homeTeamId) : undefined), [data, match]);
  const awayTeam = useMemo(() => (match ? getTeam(data, match.awayTeamId) : undefined), [data, match]);
  const tournament = useMemo(() => data.tournaments.find((item) => item.id === match?.tournamentId), [data.tournaments, match?.tournamentId]);

  useEffect(() => {
    if (!supabaseEnabled || authLoading || canScore) return;
    router.replace(`/login?next=/scorer/match/${params.matchId}`);
  }, [authLoading, canScore, params.matchId, router, supabaseEnabled]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (supabaseEnabled && authLoading) {
    return <PageHeader title="Scorer mode" description="Checking scorer access..." />;
  }

  if (supabaseEnabled && !canScore) {
    return <PageHeader title="Scorer mode" description="Redirecting to login..." />;
  }

  if (!match) {
    return <PageHeader title="Match not found" description="This scorer link does not match an existing fixture." />;
  }

  const activeMatch: Match = match;
  const clockLabel = formatMatchClock(activeMatch, now);
  const showFootballEvents = activeMatch.sport === "Football";

  function updateScore(homeDelta: number, awayDelta: number) {
    void saveScore(
      activeMatch.id,
      scorerPayload(activeMatch, {
        homeScore: Math.max(0, activeMatch.homeScore + homeDelta),
        awayScore: Math.max(0, activeMatch.awayScore + awayDelta)
      })
    );
  }

  function applyClockAction(action: "start" | "pause" | "resume" | "reset") {
    const clockState = getClockStateForAction(activeMatch, action);

    void saveScore(
      activeMatch.id,
      scorerPayload(activeMatch, {
        ...clockState,
        status: action === "start" || action === "resume" ? "Live" : activeMatch.status
      })
    );
  }

  function updatePeriod(periodLabel: string) {
    const normalized = periodLabel.toLowerCase();
    const finalPeriod = normalized.includes("full") || normalized.includes("final");
    const halfTime = normalized.includes("half time");

    void saveScore(
      activeMatch.id,
      scorerPayload(activeMatch, {
        periodLabel,
        status: finalPeriod ? "Final" : activeMatch.status,
        clockRunning: finalPeriod || halfTime ? false : activeMatch.clockRunning,
        clockLabel: finalPeriod ? "Full Time" : halfTime ? "Halftime" : activeMatch.clockLabel
      })
    );
  }

  function addFootballEvent(team: Team | undefined, type: MatchEventType) {
    if (!team) return;

    const labels: Record<MatchEventType, string> = {
      goal: "Goal",
      assist: "Assist",
      yellow: "Yellow card",
      red: "Red card",
      substitution: "Substitution",
      own_goal: "Own goal",
      penalty_goal: "Penalty goal",
      missed_penalty: "Missed penalty"
    };

    void saveEvent({
      id: createId("event", `${activeMatch.id}-${team.name}-${type}`),
      tournamentId: activeMatch.tournamentId,
      matchId: activeMatch.id,
      teamId: team.id,
      type,
      minute: clockLabel,
      description: `${team.name} ${labels[type]}`
    });

    if (type === "goal") {
      updateScore(team.id === activeMatch.homeTeamId ? 1 : 0, team.id === activeMatch.awayTeamId ? 1 : 0);
    }
  }

  return (
    <main className="overflow-hidden rounded-2xl bg-slate-950 text-white shadow-2xl shadow-slate-950/20">
      <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top,#2563eb_0%,#0f172a_42%,#020617_100%)] p-3 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-sm font-black text-white transition hover:bg-white/15"
          >
            <ArrowLeft className="h-4 w-4" />
            Admin
          </Link>
          <div className="min-w-0 text-center">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-100/70">{tournament?.name ?? match.sport}</p>
            <h1 className="text-balance text-xl font-black text-white sm:text-3xl">Mobile Scorer Mode</h1>
          </div>
          <span className="rounded-full border border-emerald-300/30 bg-emerald-400/15 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-100">
            {match.sport}
          </span>
        </div>
      </div>

      <section className="grid gap-3 p-3 sm:gap-4 sm:p-5 lg:grid-cols-[1fr_0.75fr_1fr]">
        <TeamScoringCard
          team={homeTeam}
          score={match.homeScore}
          side="Home"
          onAdd={() => updateScore(1, 0)}
          onRemove={() => updateScore(-1, 0)}
          onEvent={(type) => addFootballEvent(homeTeam, type)}
          showFootballEvents={showFootballEvents}
        />

        <section className="rounded-2xl border border-white/10 bg-white/[0.06] p-3 shadow-2xl shadow-black/20 sm:p-4">
          <div className="rounded-2xl border border-blue-300/20 bg-slate-950/80 p-4 text-center shadow-inner">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-200/70">Clock</p>
            <p className="mt-2 text-5xl font-black tracking-tight text-white sm:text-6xl">{clockLabel}</p>
            <div className="mt-3 flex items-center justify-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${match.clockRunning ? "animate-pulse bg-emerald-400" : "bg-slate-500"}`} />
              <span className="text-sm font-black uppercase tracking-[0.16em] text-slate-300">{clockStatus(match)}</span>
            </div>
          </div>

          <label className="mt-4 block">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Period</span>
            <select
              value={match.periodLabel}
              onChange={(event) => updatePeriod(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-base font-black text-white outline-none focus:border-blue-300"
            >
              {periodOptions[match.sport].map((period) => (
                <option key={period} value={period}>
                  {period}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => applyClockAction("start")}
              className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-blue-500 px-3 py-2 text-sm font-black text-white transition hover:bg-blue-400"
            >
              <Play className="h-5 w-5" />
              Start
            </button>
            <button
              type="button"
              onClick={() => applyClockAction(match.clockRunning ? "pause" : "resume")}
              className="flex min-h-14 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-black text-white transition hover:bg-white/15"
            >
              {match.clockRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              {match.clockRunning ? "Pause" : "Resume"}
            </button>
            <button
              type="button"
              onClick={() => updatePeriod("Second Half")}
              disabled={match.sport !== "Football"}
              className="flex min-h-14 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-black text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Square className="h-4 w-4" />
              2nd Half
            </button>
            <button
              type="button"
              onClick={() => applyClockAction("reset")}
              className="flex min-h-14 items-center justify-center gap-2 rounded-xl border border-red-300/20 bg-red-400/10 px-3 py-2 text-sm font-black text-red-100 transition hover:bg-red-400/20"
            >
              <RotateCcw className="h-5 w-5" />
              Reset
            </button>
          </div>

          <div className="mt-4 rounded-xl border border-white/10 bg-slate-900/80 p-3">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
              <Trophy className="h-4 w-4" />
              Match
            </p>
            <p className="mt-2 text-sm font-bold text-slate-200">
              {match.date} / {match.time} / {match.court || "Court TBA"}
            </p>
          </div>
        </section>

        <TeamScoringCard
          team={awayTeam}
          score={match.awayScore}
          side="Away"
          onAdd={() => updateScore(0, 1)}
          onRemove={() => updateScore(0, -1)}
          onEvent={(type) => addFootballEvent(awayTeam, type)}
          showFootballEvents={showFootballEvents}
        />
      </section>

      {match.youtubeUrl ? (
        <section className="border-t border-white/10 p-3 sm:p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-slate-300">
            <Video className="h-4 w-4 text-blue-300" />
            Video preview
          </div>
          <YouTubeEmbed url={match.youtubeUrl} title={`${homeTeam?.name ?? "Home"} vs ${awayTeam?.name ?? "Away"}`} className="border-white/10 bg-black lg:max-w-3xl" />
        </section>
      ) : null}

      {!supabaseEnabled ? (
        <div className="border-t border-amber-300/20 bg-amber-400/10 p-3 text-sm font-bold text-amber-100 sm:p-5">
          <ShieldAlert className="mr-2 inline h-4 w-4" />
          Supabase is not configured. Scorer access is open in local demo mode.
        </div>
      ) : null}
    </main>
  );
}
