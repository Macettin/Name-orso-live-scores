"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { LiveUpdateIndicator } from "@/components/live-update-indicator";
import { TeamLogo } from "@/components/ui";
import { YouTubeEmbed } from "@/components/youtube-embed";
import { useTournamentData } from "@/hooks/use-tournament-data";
import { getTeam } from "@/lib/data-store";
import { groupGoalEventsByScorer } from "@/lib/goal-scorers";
import { formatMatchClock } from "@/lib/match-clock";
import type { Match, MatchEvent, Player, Tournament } from "@/lib/types";

function BrandMark({ tournament }: { tournament?: Tournament }) {
  const accent = tournament?.primaryColor || "#2563eb";
  const [tournamentLogoFailed, setTournamentLogoFailed] = useState(false);
  const [orsoLogoFailed, setOrsoLogoFailed] = useState(false);
  const logoSrc = tournament?.logoUrl && !tournamentLogoFailed ? tournament.logoUrl : !orsoLogoFailed ? "/orso-logo.png" : "";

  if (logoSrc) {
    return (
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/95 p-2 shadow-sm ring-1 ring-white/20 sm:h-20 sm:w-20 sm:p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          alt={tournament?.logoUrl && !tournamentLogoFailed ? `${tournament.name} logo` : "Orso Sports Events logo"}
          className="h-full w-full object-contain"
          onError={() => {
            if (tournament?.logoUrl && !tournamentLogoFailed) {
              setTournamentLogoFailed(true);
            } else {
              setOrsoLogoFailed(true);
            }
          }}
        />
      </span>
    );
  }

  return (
    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl font-black text-white sm:h-20 sm:w-20 sm:text-3xl" style={{ backgroundColor: accent }}>
      {(tournament?.name || "OR").slice(0, 2).toUpperCase()}
    </span>
  );
}

function playerInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "P"
  );
}

function PlayerAvatar({ player }: { player?: Player }) {
  if (player?.photoUrl) {
    return <span aria-hidden="true" className="h-9 w-9 shrink-0 rounded-full bg-cover bg-center" style={{ backgroundImage: `url(${player.photoUrl})` }} />;
  }

  return <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-black text-white">{player ? playerInitials(player.name) : "?"}</span>;
}

function GoalScorers({ events, players, align = "left" }: { events: MatchEvent[]; players: Player[]; align?: "left" | "right" }) {
  if (events.length === 0) {
    return null;
  }

  return (
    <div className={`mt-4 grid gap-2 ${align === "right" ? "justify-items-end" : "justify-items-start"}`}>
      {groupGoalEventsByScorer(events, players).map((scorer) => {
        return (
          <div key={scorer.key} className="flex max-w-full items-center gap-2 rounded-2xl bg-white/10 px-3 py-2 text-sm font-bold text-white">
            <span aria-hidden="true" className="text-base">⚽</span>
            {scorer.player ? <PlayerAvatar player={scorer.player} /> : null}
            <span className="min-w-0 break-words">{scorer.label}</span>
            <span className="shrink-0 rounded-lg bg-white/15 px-2 py-1 text-xs font-black">{scorer.minutes.join(", ")}</span>
          </div>
        );
      })}
    </div>
  );
}

function teamNameClass(name: string) {
  if (name.length > 36) return "text-sm sm:text-lg lg:text-2xl";
  if (name.length > 30) return "text-base sm:text-xl lg:text-3xl";
  if (name.length > 22) return "text-lg sm:text-2xl lg:text-4xl";
  return "text-2xl sm:text-4xl lg:text-5xl";
}

function TeamPanel({
  label,
  name,
  logo,
  goalEvents,
  players,
  align = "left"
}: {
  label: string;
  name: string;
  logo: React.ReactNode;
  goalEvents: MatchEvent[];
  players: Player[];
  align?: "left" | "right";
}) {
  return (
    <div className="min-w-0 rounded-3xl border border-white/10 bg-white/[0.07] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.22)] backdrop-blur sm:p-6">
      <div className={`flex min-w-0 flex-col gap-4 ${align === "right" ? "items-end text-right" : "items-start text-left"}`}>
        <p className="rounded-full bg-white/10 px-3 py-1 text-sm font-black uppercase tracking-wide text-white/55">{label}</p>
        <div className={`flex w-full min-w-0 flex-col gap-4 sm:items-center ${align === "right" ? "sm:flex-row-reverse" : "sm:flex-row"}`}>
          {logo}
          <p className={`min-w-0 flex-1 whitespace-nowrap font-black leading-tight tracking-tight ${teamNameClass(name)}`}>{name}</p>
        </div>
        <GoalScorers events={goalEvents} players={players} align={align} />
      </div>
    </div>
  );
}

export default function ScoreboardPage() {
  const params = useParams<{ matchId: string }>();
  const { data, lastUpdatedAt } = useTournamentData();
  const [now, setNow] = useState<number | null>(null);
  const match = data.matches.find((item) => item.id === params.matchId);

  useEffect(() => {
    if (!match?.clockRunning || match.sport === "Volleyball") {
      return;
    }

    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [match?.clockRunning, match?.sport, match?.clockStartedAt]);

  if (!match) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 px-6 text-white">
        <div className="text-center">
          <p className="text-4xl font-black">Match not found</p>
          <Link href="/live" className="mt-6 inline-flex rounded-lg bg-white px-4 py-2 text-sm font-bold text-slate-950">
            Back to live scores
          </Link>
        </div>
      </div>
    );
  }

  const home = getTeam(data, match.homeTeamId);
  const away = getTeam(data, match.awayTeamId);
  const tournament = data.tournaments.find((item) => item.id === match.tournamentId);
  const goalEvents = data.events.filter((event) => event.matchId === match.id && event.type === "goal");
  const homePlayers = data.players.filter((player) => player.teamId === match.homeTeamId);
  const awayPlayers = data.players.filter((player) => player.teamId === match.awayTeamId);
  const homeGoalEvents = goalEvents.filter((event) => event.teamId === match.homeTeamId);
  const awayGoalEvents = goalEvents.filter((event) => event.teamId === match.awayTeamId);
  const accent = tournament?.primaryColor || "#2563eb";
  const clock = match.status === "Final" ? "90:00" : formatMatchClock(match, match.clockRunning && now ? now : 0);
  const statusLabel = match.status === "Final" ? "Full Time" : match.status;

  return (
    <div className="fixed inset-0 z-50 flex min-h-screen flex-col overflow-y-auto bg-[radial-gradient(circle_at_top,#1d4ed8_0%,#0f172a_42%,#020617_100%)] px-4 py-4 text-white sm:px-8 sm:py-6 lg:px-12">
      <header className="grid shrink-0 gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <BrandMark tournament={tournament} />
          <div className="min-w-0">
            <p className="whitespace-normal break-words text-2xl font-black leading-tight sm:text-4xl">{tournament?.name || "Tournament"}</p>
            <p className="mt-1 text-lg font-bold text-white/60">{match.sport} / {match.group}</p>
          </div>
        </div>
        <div className="rounded-3xl border border-white/15 bg-white/10 px-5 py-4 text-center shadow-[0_22px_60px_rgba(0,0,0,0.22)] backdrop-blur">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-white/45">Clock</p>
          <div className="mt-2 flex items-center justify-center gap-3">
            {match.clockRunning ? <span className="h-4 w-4 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_22px_rgba(52,211,153,0.95)]" /> : null}
            <span className="text-4xl font-black leading-none sm:text-6xl">{clock}</span>
          </div>
          {match.clockRunning ? <p className="mt-2 text-sm font-black uppercase tracking-wide text-white/60">Live timer</p> : null}
        </div>
        <div className="flex items-center justify-start gap-3 lg:justify-end">
          <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-5 py-3">
            {match.status === "Live" ? <span className="h-3 w-3 rounded-full bg-red-500 shadow-[0_0_18px_rgba(239,68,68,0.9)]" /> : null}
            <span className="text-xl font-black uppercase tracking-wide">{statusLabel}</span>
          </div>
          <div className="hidden xl:block">
            <LiveUpdateIndicator lastUpdatedAt={lastUpdatedAt} />
          </div>
        </div>
      </header>

      <main className="grid flex-1 place-items-center py-5 sm:py-8">
        <div className="grid w-full max-w-7xl items-center gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-6">
          <TeamPanel label="Home" name={home?.name || "Home"} logo={<TeamLogo team={home} size="h-20 w-20 sm:h-24 sm:w-24" className="text-2xl" />} goalEvents={homeGoalEvents} players={homePlayers} />
          <div className="rounded-[2rem] border border-white/20 px-6 py-5 text-center shadow-[0_32px_90px_rgba(0,0,0,0.38)] ring-1 ring-white/15 sm:px-10 sm:py-7" style={{ backgroundColor: accent }}>
            <p className="mb-2 text-sm font-black uppercase tracking-[0.28em] text-white/55">Score</p>
            <div className="text-7xl font-black leading-none tracking-tight sm:text-8xl lg:text-[9rem]">
              <span>{match.homeScore}</span>
              <span className="px-3 text-white/45 sm:px-5">-</span>
              <span>{match.awayScore}</span>
            </div>
          </div>
          <TeamPanel label="Away" name={away?.name || "Away"} logo={<TeamLogo team={away} size="h-20 w-20 sm:h-24 sm:w-24" className="text-2xl" />} goalEvents={awayGoalEvents} players={awayPlayers} align="right" />
        </div>
      </main>

      <footer className="grid shrink-0 gap-4 md:grid-cols-[1fr_auto_1fr] md:items-end">
        <div className="rounded-2xl bg-white/10 px-5 py-3">
          <p className="text-sm font-bold uppercase tracking-wide text-white/45">Match time</p>
          <p className="mt-2 text-xl font-black">{match.date} / {match.time}</p>
        </div>
        <div className="rounded-2xl bg-white/10 px-5 py-3 text-left md:text-center">
          <p className="text-sm font-bold uppercase tracking-wide text-white/45">Court / Hall</p>
          <p className="mt-2 whitespace-normal break-words text-2xl font-black">{match.court} / {match.hallSlug}</p>
        </div>
        <div className="flex justify-start md:justify-end">
          {tournament?.sponsorName || tournament?.sponsorLogoUrl ? (
            <div className="flex items-center gap-4 rounded-2xl bg-white/10 px-5 py-3">
              {tournament.sponsorLogoUrl ? (
                <span className="h-12 w-28 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${tournament.sponsorLogoUrl})` }} />
              ) : null}
              {tournament.sponsorName ? <span className="text-xl font-black">{tournament.sponsorName}</span> : null}
            </div>
          ) : null}
        </div>
      </footer>
      {match.youtubeUrl ? (
        <div className="pointer-events-auto fixed bottom-6 right-6 hidden w-72 xl:block">
          <YouTubeEmbed url={match.youtubeUrl} title={`${home?.name ?? "Home"} vs ${away?.name ?? "Away"} livestream`} className="border-white/15" />
        </div>
      ) : null}
    </div>
  );
}
