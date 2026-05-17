"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarDays, Download, Filter, Printer, RotateCcw } from "lucide-react";
import { PageHeader, StatusPill, TeamLogo, TournamentCoverBanner } from "@/components/ui";
import { useTournamentData } from "@/hooks/use-tournament-data";
import type { Match, MatchStatus, Team, Tournament } from "@/lib/types";

type ViewMode = "chronological" | "venue";

function localDateValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function matchTeams(match: Match, teams: Team[]) {
  return {
    home: teams.find((team) => team.id === match.homeTeamId),
    away: teams.find((team) => team.id === match.awayTeamId)
  };
}

function matchAgeGroups(match: Match, teams: Team[]) {
  const { home, away } = matchTeams(match, teams);
  return Array.from(new Set([home?.group, away?.group].filter((group): group is string => Boolean(group))));
}

function sortMatches(first: Match, second: Match) {
  return `${first.date} ${first.time} ${first.court}`.localeCompare(`${second.date} ${second.time} ${second.court}`);
}

function FixtureCard({ match, teams, tournament }: { match: Match; teams: Team[]; tournament?: Tournament }) {
  const { home, away } = matchTeams(match, teams);

  return (
    <article className="rounded-xl border border-blue-100 bg-white p-3 shadow-[0_12px_30px_rgba(37,99,235,0.07)] sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-blue-700">{match.date} / {match.time}</p>
          <p className="mt-1 break-words text-sm font-bold text-slate-500">{match.court}{match.phase ? ` / ${match.phase}` : ""}</p>
        </div>
        <StatusPill status={match.status} />
      </div>
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        <Link href={home ? `/teams/${home.id}` : "/teams"} className="flex min-w-0 items-center gap-2 rounded-lg bg-blue-50 px-2 py-2">
          <TeamLogo team={home} size="h-8 w-8" />
          <span className="truncate text-sm font-black text-slate-950">{home?.name ?? "Home"}</span>
        </Link>
        <Link href={`/matches/${match.id}`} className="rounded-lg bg-blue-600 px-3 py-2 text-center text-lg font-black leading-none text-white shadow-sm">
          {match.homeScore}-{match.awayScore}
        </Link>
        <Link href={away ? `/teams/${away.id}` : "/teams"} className="flex min-w-0 items-center justify-end gap-2 rounded-lg bg-blue-50 px-2 py-2 text-right">
          <span className="truncate text-sm font-black text-slate-950">{away?.name ?? "Away"}</span>
          <TeamLogo team={away} size="h-8 w-8" />
        </Link>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-400">
        <span>{tournament?.name ?? match.tournamentId ?? "Tournament"}</span>
        <span>/</span>
        <span>{match.sport}</span>
        <span>/</span>
        <span>{matchAgeGroups(match, teams).join(", ") || match.group}</span>
      </div>
    </article>
  );
}

function csvValue(value: string | number | undefined) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export default function FixturesPage() {
  const { data, selectedTournamentId } = useTournamentData();
  const selectedTournament = data.tournaments.find((item) => item.id === selectedTournamentId);
  const [dateFilter, setDateFilter] = useState("");
  const [tournamentFilter, setTournamentFilter] = useState(selectedTournamentId || "all");
  const [courtFilter, setCourtFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | MatchStatus>("all");
  const [ageGroupFilter, setAgeGroupFilter] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>("chronological");

  const courtOptions = useMemo(() => Array.from(new Set(data.matches.map((match) => match.court).filter(Boolean))).sort(), [data.matches]);
  const ageGroupOptions = useMemo(
    () => Array.from(new Set(data.matches.flatMap((match) => matchAgeGroups(match, data.teams)))).sort(),
    [data.matches, data.teams]
  );

  const filteredMatches = useMemo(
    () =>
      data.matches
        .filter((match) => {
          const groups = matchAgeGroups(match, data.teams);
          return (
            (!dateFilter || match.date === dateFilter) &&
            (tournamentFilter === "all" || match.tournamentId === tournamentFilter) &&
            (courtFilter === "all" || match.court === courtFilter) &&
            (teamFilter === "all" || match.homeTeamId === teamFilter || match.awayTeamId === teamFilter) &&
            (statusFilter === "all" || match.status === statusFilter) &&
            (ageGroupFilter === "all" || groups.includes(ageGroupFilter) || match.group === ageGroupFilter)
          );
        })
        .sort(sortMatches),
    [ageGroupFilter, courtFilter, data.matches, data.teams, dateFilter, statusFilter, teamFilter, tournamentFilter]
  );

  const matchesByVenue = useMemo(() => {
    const groups = new Map<string, Match[]>();
    filteredMatches.forEach((match) => {
      const key = match.court || "Venue TBA";
      groups.set(key, [...(groups.get(key) ?? []), match]);
    });
    return Array.from(groups.entries()).sort(([first], [second]) => first.localeCompare(second));
  }, [filteredMatches]);

  function clearFilters() {
    setDateFilter("");
    setTournamentFilter("all");
    setCourtFilter("all");
    setTeamFilter("all");
    setStatusFilter("all");
    setAgeGroupFilter("all");
  }

  function exportSchedule() {
    const rows = [
      ["Date", "Time", "Tournament", "Court", "Status", "Home", "Away", "Score", "Sport", "Age Group", "Phase", "Round"],
      ...filteredMatches.map((match) => {
        const { home, away } = matchTeams(match, data.teams);
        const tournament = data.tournaments.find((item) => item.id === match.tournamentId);
        return [
          match.date,
          match.time,
          tournament?.name ?? match.tournamentId ?? "",
          match.court,
          match.status,
          home?.name ?? "Home",
          away?.name ?? "Away",
          `${match.homeScore}-${match.awayScore}`,
          match.sport,
          matchAgeGroups(match, data.teams).join(", ") || match.group,
          match.phase ?? "",
          match.roundLabel ?? ""
        ];
      })
    ];
    const csv = rows.map((row) => row.map(csvValue).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `orso-fixtures-${dateFilter || "all"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="report-page">
      <TournamentCoverBanner tournament={selectedTournament} />
      <PageHeader title="Fixtures" description="Browse the tournament schedule by date, team, court, status, and venue." />

      <section className="print-hidden mb-6 rounded-xl border border-blue-100 bg-white p-4 shadow-[0_16px_42px_rgba(37,99,235,0.08)] sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-blue-700" aria-hidden="true" />
            <h2 className="text-lg font-black text-slate-950">Schedule filters</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setDateFilter(localDateValue())} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-black text-white hover:bg-blue-700">
              <CalendarDays size={16} aria-hidden="true" />
              Today
            </button>
            <button type="button" onClick={clearFilters} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
              <RotateCcw size={16} aria-hidden="true" />
              Reset
            </button>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label>
            <span className="text-sm font-bold text-slate-600">Date</span>
            <input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="orso-input mt-2" />
          </label>
          <label>
            <span className="text-sm font-bold text-slate-600">Tournament</span>
            <select value={tournamentFilter} onChange={(event) => setTournamentFilter(event.target.value)} className="orso-input mt-2">
              <option value="all">All tournaments</option>
              {data.tournaments.map((tournament) => (
                <option key={tournament.id} value={tournament.id}>{tournament.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-sm font-bold text-slate-600">Pitch / Court</span>
            <select value={courtFilter} onChange={(event) => setCourtFilter(event.target.value)} className="orso-input mt-2">
              <option value="all">All venues</option>
              {courtOptions.map((court) => (
                <option key={court} value={court}>{court}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-sm font-bold text-slate-600">Team</span>
            <select value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)} className="orso-input mt-2">
              <option value="all">All teams</option>
              {data.teams.map((team) => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-sm font-bold text-slate-600">Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | MatchStatus)} className="orso-input mt-2">
              <option value="all">All statuses</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Live">Live</option>
              <option value="Final">Final</option>
            </select>
          </label>
          <label>
            <span className="text-sm font-bold text-slate-600">Age group</span>
            <select value={ageGroupFilter} onChange={(event) => setAgeGroupFilter(event.target.value)} className="orso-input mt-2">
              <option value="all">All groups</option>
              {ageGroupOptions.map((group) => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="mb-5 flex flex-col gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-blue-700">Showing</p>
          <p className="mt-1 text-2xl font-black text-blue-950">{filteredMatches.length} fixture{filteredMatches.length === 1 ? "" : "s"}</p>
        </div>
        <div className="print-hidden flex flex-wrap gap-2">
          <button type="button" onClick={() => setViewMode("chronological")} className={`rounded-lg px-3 py-2 text-sm font-black ${viewMode === "chronological" ? "bg-blue-600 text-white" : "bg-white text-blue-700 ring-1 ring-blue-100"}`}>
            By time
          </button>
          <button type="button" onClick={() => setViewMode("venue")} className={`rounded-lg px-3 py-2 text-sm font-black ${viewMode === "venue" ? "bg-blue-600 text-white" : "bg-white text-blue-700 ring-1 ring-blue-100"}`}>
            By venue
          </button>
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-black text-blue-700 ring-1 ring-blue-100 hover:bg-blue-100">
            <Printer size={16} aria-hidden="true" />
            Print
          </button>
          <button type="button" onClick={exportSchedule} className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-black text-blue-700 ring-1 ring-blue-100 hover:bg-blue-100">
            <Download size={16} aria-hidden="true" />
            Export CSV
          </button>
        </div>
      </section>

      {viewMode === "chronological" ? (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredMatches.map((match) => (
            <FixtureCard key={match.id} match={match} teams={data.teams} tournament={data.tournaments.find((item) => item.id === match.tournamentId)} />
          ))}
        </section>
      ) : (
        <section className="grid gap-5">
          {matchesByVenue.map(([venue, matches]) => (
            <div key={venue} className="rounded-xl border border-blue-100 bg-white p-4 shadow-[0_14px_36px_rgba(37,99,235,0.07)]">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Venue / pitch</p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">{venue}</h2>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase text-blue-700 ring-1 ring-blue-100">{matches.length} fixture{matches.length === 1 ? "" : "s"}</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {matches.map((match) => (
                  <FixtureCard key={match.id} match={match} teams={data.teams} tournament={data.tournaments.find((item) => item.id === match.tournamentId)} />
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {filteredMatches.length === 0 ? (
        <p className="rounded-xl border border-blue-100 bg-white px-4 py-8 text-center text-sm font-bold text-slate-500">
          No fixtures match the selected filters.
        </p>
      ) : null}
    </main>
  );
}
