import { isFootballLikeSport, type Match } from "./types";

const basketballDefaultSeconds = 10 * 60;

export function getBasketballDefaultSeconds() {
  return basketballDefaultSeconds;
}

export function isFootballClockOverride(label?: string) {
  const normalized = label?.trim().toLowerCase();
  return Boolean(normalized && (/^(ht|ft|et|aet|pens?|penalties|extra time|full time|half time)$/.test(normalized) || /^\d{1,3}\+\d{1,2}'?$/.test(normalized)));
}

export function getMatchClockSeconds(match: Match, now = Date.now()) {
  const baseSeconds = match.clockBaseSeconds ?? (match.sport === "Basketball" ? match.clockCountdownSeconds ?? basketballDefaultSeconds : 0);

  if (!match.clockRunning || !match.clockStartedAt) {
    return baseSeconds;
  }

  const elapsedSeconds = Math.max(0, Math.floor((now - new Date(match.clockStartedAt).getTime()) / 1000));

  if (match.sport === "Basketball") {
    return Math.max(0, baseSeconds - elapsedSeconds);
  }

  return baseSeconds + elapsedSeconds;
}

function formatSeconds(value: number) {
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatFootballClock(match: Match, seconds: number) {
  const phase = match.periodLabel.toLowerCase();
  const manualOverride = match.clockLabel?.trim();

  if (isFootballClockOverride(manualOverride)) {
    return manualOverride;
  }

  if (phase.includes("half time")) return "Halftime";
  if (phase.includes("full") || phase.includes("final") || match.status === "Final") return "90:00";

  if (seconds >= 90 * 60) {
    const stoppageMinute = Math.max(1, Math.floor((seconds - 90 * 60) / 60) + 1);
    return `90+${stoppageMinute}`;
  }

  if (seconds >= 45 * 60 && !phase.includes("second")) {
    const stoppageMinute = Math.max(1, Math.floor((seconds - 45 * 60) / 60) + 1);
    return `45+${stoppageMinute}`;
  }

  return formatSeconds(seconds);
}

function footballStartSeconds(match: Match) {
  const phase = match.periodLabel.toLowerCase();

  if (phase.includes("second")) return 45 * 60;
  if (phase.includes("full") || phase.includes("final")) return 90 * 60;
  return 0;
}

export function formatMatchClock(match: Match, now = Date.now()) {
  if (match.sport === "Volleyball") {
    return match.clockLabel || match.periodLabel || "Set 1";
  }

  const seconds = getMatchClockSeconds(match, now);

  if (match.sport === "Basketball") {
    return `${match.periodLabel || "Q1"} ${formatSeconds(seconds)}`;
  }

  return formatFootballClock(match, seconds) || match.clockLabel || match.matchMinute || match.periodLabel || "Pregame";
}

export function getClockStateForAction(match: Match, action: "start" | "pause" | "resume" | "reset", now = Date.now()): Partial<Match> {
  const currentSeconds = getMatchClockSeconds(match, now);
  const countdownSeconds = match.clockCountdownSeconds ?? basketballDefaultSeconds;

  if (action === "pause") {
    return {
      clockRunning: false,
      clockStartedAt: undefined,
      clockBaseSeconds: currentSeconds,
      clockLabel: formatMatchClock({ ...match, clockRunning: false, clockBaseSeconds: currentSeconds, clockStartedAt: undefined }, now)
    };
  }

  if (action === "reset") {
  const resetSeconds = match.sport === "Basketball" ? countdownSeconds : isFootballLikeSport(match.sport) ? footballStartSeconds(match) : 0;
    return {
      clockRunning: false,
      clockStartedAt: undefined,
      clockBaseSeconds: resetSeconds,
      clockLabel: formatMatchClock({ ...match, clockRunning: false, clockBaseSeconds: resetSeconds, clockStartedAt: undefined }, now)
    };
  }

  return {
    clockRunning: true,
    clockStartedAt: new Date(now).toISOString(),
    clockBaseSeconds: action === "start" ? (match.sport === "Basketball" ? countdownSeconds : isFootballLikeSport(match.sport) ? footballStartSeconds(match) : 0) : currentSeconds,
    clockCountdownSeconds: countdownSeconds
  };
}
