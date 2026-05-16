"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { ArrowLeft, CalendarDays, Trophy } from "lucide-react";
import { LiveUpdateIndicator } from "@/components/live-update-indicator";
import { TeamLogo } from "@/components/ui";
import { useTournamentData } from "@/hooks/use-tournament-data";
import { getTeam, slugify } from "@/lib/data-store";
import { matchPhaseOptions, type Match, type MatchPhase, type Team } from "@/lib/types";

const knockoutPhases = matchPhaseOptions.filter((phase) => phase !== "Group Stage");

function matchWinner(match: Match) {
  if (match.status !== "Final" || match.homeScore === match.awayScore) {
    return null;
  }

  return match.homeScore > match.awayScore ? match.homeTeamId : match.awayTeamId;
}

function phaseDescription(phase: MatchPhase, count: number) {
  if (phase === "Group Stage") return `${count} qualifying fixtures`;
  if (phase === "Placement Matches") return `${count} ranking fixtures`;
  return `${count} knockout ties`;
}

function TeamLine({ team, score, isWinner, placeholder }: { team?: Team; score?: number; isWinner: boolean; placeholder: string }) {
  return (
    <div className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-xl px-3 py-2 ${isWinner ? "bg-blue-600 text-white shadow-sm" : "bg-white text-slate-800 ring-1 ring-slate-200"}`}>
      <TeamLogo team={team} size="h-8 w-8" className={isWinner ? "bg-white text-blue-700" : ""} />
      <span className={`orso-team-name orso-team-name-2 text-sm font-black ${team ? "" : "text-slate-400"}`}>{team?.name ?? placeholder}</span>
      <span className={`min-w-8 rounded-lg px-2 py-1 text-center text-sm font-black ${isWinner ? "bg-white/18 text-white" : "bg-slate-100 text-slate-700"}`}>{score ?? "-"}</span>
    </div>
  );
}

function BracketMatchCard({ match, index, teams }: { match: Match; index: number; teams: Team[] }) {
  const home = teams.find((team) => team.id === match.homeTeamId);
  const away = teams.find((team) => team.id === match.awayTeamId);
  const winnerId = matchWinner(match);
  const label = match.roundLabel || `${match.phase ?? "Match"} ${index + 1}`;

  return (
    <Link href={`/matches/${match.id}`} className="group block rounded-2xl border border-blue-100 bg-white p-3 shadow-[0_12px_32px_rgba(37,99,235,0.08)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_18px_42px_rgba(37,99,235,0.14)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-950">{label}</p>
          <p className="mt-0.5 text-xs font-bold uppercase tracking-wide text-slate-400">{match.date} / {match.time}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${match.status === "Final" ? "bg-emerald-50 text-emerald-700" : match.status === "Live" ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}>
          {match.status}
        </span>
      </div>
      <div className="grid gap-2">
        <TeamLine team={home} score={match.status === "Scheduled" ? undefined : match.homeScore} isWinner={winnerId === match.homeTeamId} placeholder="TBD home" />
        <TeamLine team={away} score={match.status === "Scheduled" ? undefined : match.awayScore} isWinner={winnerId === match.awayTeamId} placeholder="TBD away" />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 text-xs font-bold text-slate-500">
        <span className="truncate">{match.court}</span>
        <span className="text-blue-600">{winnerId ? "Winner advances" : match.status === "Scheduled" ? "Upcoming match" : "Awaiting result"}</span>
      </div>
    </Link>
  );
}

function PhaseColumn({ phase, matches, teams }: { phase: MatchPhase; matches: Match[]; teams: Team[] }) {
  return (
    <section className="min-w-0 rounded-3xl border border-blue-100 bg-blue-50/70 p-3 sm:p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">{phase}</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">{phaseDescription(phase, matches.length)}</h2>
        </div>
      </div>
      <div className="grid gap-3">
        {matches.map((match, index) => (
          <BracketMatchCard key={match.id} match={match} index={index} teams={teams} />
        ))}
        {matches.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-blue-200 bg-white px-4 py-8 text-center">
            <p className="text-sm font-black text-slate-500">No fixtures assigned yet.</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default function TournamentBracketClient({ slug }: { slug: string }) {
  const { data, lastUpdatedAt, selectedTournamentId, setSelectedTournamentId } = useTournamentData();
  const tournament = useMemo(
    () => data.tournaments.find((item) => slugify(item.name) === slug || item.id === slug),
    [data.tournaments, slug]
  );

  useEffect(() => {
    if (tournament && selectedTournamentId !== tournament.id) {
      setSelectedTournamentId(tournament.id);
    }
  }, [selectedTournamentId, setSelectedTournamentId, tournament]);

  if (!tournament) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-2xl font-black text-slate-950">Tournament not found</h1>
        <p className="mt-2 text-sm font-semibold text-slate-500">Check the tournament bracket link or open the tournament directory.</p>
        <Link href="/tournaments" className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white">Browse tournaments</Link>
      </section>
    );
  }

  const accent = tournament.primaryColor || "#2563eb";
  const teams = data.teams.filter((team) => team.tournamentId === tournament.id);
  const teamIds = new Set(teams.map((team) => team.id));
  const matches = data.matches
    .filter((match) => match.tournamentId === tournament.id || teamIds.has(match.homeTeamId) || teamIds.has(match.awayTeamId))
    .sort((first, second) => `${first.date} ${first.time}`.localeCompare(`${second.date} ${second.time}`));
  const finalMatch = matches.find((match) => (match.phase ?? "Group Stage") === "Final");
  const championTeam = finalMatch ? getTeam(data, matchWinner(finalMatch) ?? "") : undefined;

  return (
    <main className="grid gap-5 pb-8">
      <section className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-[0_28px_70px_rgba(37,99,235,0.16)]">
        <div className="relative overflow-hidden px-4 py-6 text-white sm:px-7 sm:py-8" style={{ background: `radial-gradient(circle at top right, ${accent} 0%, #2563eb 44%, #0f172a 100%)` }}>
          <div className="absolute -right-20 top-0 h-72 w-72 rounded-full border border-white/10" />
          <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.08)_0_1px,transparent_1px_54px)] opacity-35" />
          <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="min-w-0">
              <Link href={`/tournament/${slug}`} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-white/75 ring-1 ring-white/10">
                <ArrowLeft size={15} />
                Tournament home
              </Link>
              <p className="mt-5 text-xs font-black uppercase tracking-[0.22em] text-white/60">Tournament bracket</p>
              <h1 className="mt-2 break-words text-3xl font-black leading-tight sm:text-5xl">{tournament.name}</h1>
              <div className="mt-5 flex flex-wrap gap-2 text-sm font-bold text-white/80">
                <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-3 ring-1 ring-white/10"><CalendarDays size={17} /> {tournament.startDate || "Dates TBA"}</span>
                {championTeam ? (
                  <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-3 ring-1 ring-white/10"><Trophy size={17} /> Champion: {championTeam.name}</span>
                ) : null}
              </div>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/12 p-4 shadow-xl backdrop-blur">
              <LiveUpdateIndicator lastUpdatedAt={lastUpdatedAt} />
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-white/10 px-2 py-3">
                  <p className="text-2xl font-black">{matches.length}</p>
                  <p className="text-xs font-bold text-white/60">Matches</p>
                </div>
                <div className="rounded-xl bg-white/10 px-2 py-3">
                  <p className="text-2xl font-black">{matches.filter((match) => match.status === "Final").length}</p>
                  <p className="text-xs font-bold text-white/60">Finals</p>
                </div>
                <div className="rounded-xl bg-white/10 px-2 py-3">
                  <p className="text-2xl font-black">{matches.filter((match) => match.status === "Scheduled").length}</p>
                  <p className="text-xs font-bold text-white/60">Upcoming</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-5">
        {knockoutPhases.map((phase) => (
          <PhaseColumn key={phase} phase={phase} matches={matches.filter((match) => match.phase === phase)} teams={teams} />
        ))}
      </section>

      <PhaseColumn phase="Group Stage" matches={matches.filter((match) => (match.phase ?? "Group Stage") === "Group Stage")} teams={teams} />
    </main>
  );
}
