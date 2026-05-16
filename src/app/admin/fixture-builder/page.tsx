"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { Download, Printer, Save } from "lucide-react";
import { createId, slugify } from "@/lib/data-store";
import { useTournamentData } from "@/hooks/use-tournament-data";
import { matchPhaseOptions, type Match, type MatchPhase, type Team } from "@/lib/types";
import { PageHeader, TeamLogo } from "@/components/ui";

type FixtureFormat = "single_round_robin" | "double_round_robin" | "group_stage" | "knockout";
type FixtureConflictType = "team_time" | "court_time" | "team_daily_limit" | "rest_time" | "outside_date_range";
type FixtureConflict = { matchId: string; type: FixtureConflictType; message: string };

const formatLabels: Record<FixtureFormat, string> = {
  single_round_robin: "Single round robin",
  double_round_robin: "Double round robin",
  group_stage: "Group stage generator",
  knockout: "Knockout bracket generator"
};

const phaseByTeamCount = (teamCount: number): MatchPhase => {
  if (teamCount <= 2) return "Final";
  if (teamCount <= 4) return "Semi Final";
  return "Quarter Final";
};

type FixturePair = {
  homeTeamId: string;
  awayTeamId: string;
  phase: MatchPhase;
  roundLabel: string;
  report?: string;
};

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function inputClass() {
  return "mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 print:hidden";
}

function labelClass() {
  return "text-sm font-bold text-slate-700";
}

function addDays(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : 0;
}

function parseList(value: string) {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function csvEscape(value: string | number | undefined) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function roundRobinRounds(teams: Team[]) {
  const pool = [...teams];
  if (pool.length % 2 === 1) {
    pool.push({ id: "__bye__", name: "Bye", sport: teams[0]?.sport ?? "Football", group: "Bye", city: "", coach: "", colors: "" });
  }

  const rounds: FixturePair[][] = [];
  const roundsCount = pool.length - 1;
  const half = pool.length / 2;
  let rotating = [...pool];

  for (let round = 0; round < roundsCount; round += 1) {
    const roundPairs: FixturePair[] = [];
    for (let index = 0; index < half; index += 1) {
      const first = rotating[index];
      const second = rotating[rotating.length - 1 - index];
      if (first.id !== "__bye__" && second.id !== "__bye__") {
        roundPairs.push({
          homeTeamId: round % 2 === 0 ? first.id : second.id,
          awayTeamId: round % 2 === 0 ? second.id : first.id,
          phase: "Group Stage",
          roundLabel: `Round ${round + 1}`
        });
      }
    }
    rounds.push(roundPairs);
    rotating = [rotating[0], rotating[rotating.length - 1], ...rotating.slice(1, -1)];
  }

  return rounds;
}

function buildPairs(format: FixtureFormat, teams: Team[]) {
  if (format === "single_round_robin") {
    return roundRobinRounds(teams).flat();
  }

  if (format === "double_round_robin") {
    const firstLeg = roundRobinRounds(teams).flat();
    const secondLeg = firstLeg.map((pair) => ({
      ...pair,
      homeTeamId: pair.awayTeamId,
      awayTeamId: pair.homeTeamId,
      roundLabel: `${pair.roundLabel} return`
    }));
    return [...firstLeg, ...secondLeg];
  }

  if (format === "group_stage") {
    const groupedTeams = Array.from(
      teams.reduce((groups, team) => {
        groups.set(team.group || "Group A", [...(groups.get(team.group || "Group A") ?? []), team]);
        return groups;
      }, new Map<string, Team[]>())
    );

    return groupedTeams.flatMap(([group, groupTeams]) =>
      roundRobinRounds(groupTeams).flat().map((pair) => ({
        ...pair,
        roundLabel: `${group} ${pair.roundLabel}`,
        report: `${group} group stage fixture.`
      }))
    );
  }

  const phase = phaseByTeamCount(teams.length);
  return Array.from({ length: Math.floor(teams.length / 2) }, (_, index) => {
    const home = teams[index];
    const away = teams[teams.length - 1 - index];
    return {
      homeTeamId: home.id,
      awayTeamId: away.id,
      phase,
      roundLabel: `${phase} ${index + 1}`,
      report: `${phase} placeholder. Confirm final bracket seeds before match day.`
    };
  });
}

function scheduleFixtures({
  pairs,
  teams,
  tournamentId,
  startDate,
  courts,
  slots
}: {
  pairs: FixturePair[];
  teams: Team[];
  tournamentId: string;
  startDate: string;
  courts: string[];
  slots: string[];
}): Match[] {
  const slotsPerDay = Math.max(1, courts.length * slots.length);

  return pairs.map((pair, index) => {
    const home = teams.find((team) => team.id === pair.homeTeamId);
    const away = teams.find((team) => team.id === pair.awayTeamId);
    const dayIndex = Math.floor(index / slotsPerDay);
    const slotIndex = index % slotsPerDay;
    const court = courts[Math.floor(slotIndex / slots.length) % courts.length] ?? "Main Hall";
    const time = slots[slotIndex % slots.length] ?? "10:00";
    const date = addDays(startDate, dayIndex);

    return {
      id: createId("match", `${home?.name ?? "home"}-${away?.name ?? "away"}-${date}-${time}`),
      tournamentId,
      sport: home?.sport ?? away?.sport ?? "Football",
      group: home?.group || away?.group || "Group A",
      phase: pair.phase,
      roundLabel: pair.roundLabel,
      court,
      hallSlug: slugify(court) || "main-hall",
      date,
      time,
      status: "Scheduled",
      homeTeamId: pair.homeTeamId,
      awayTeamId: pair.awayTeamId,
      homeScore: 0,
      awayScore: 0,
      periodLabel: "Pregame",
      matchMinute: "",
      clockLabel: "",
      clockRunning: false,
      clockStartedAt: undefined,
      clockBaseSeconds: 0,
      clockCountdownSeconds: undefined,
      report: pair.report
    };
  });
}

function detectConflicts(matches: Match[], existingMatches: Match[], maxTeamMatchesPerDay: number, restMinutes: number, endDate?: string) {
  const conflicts: FixtureConflict[] = [];
  const allMatches = [...existingMatches, ...matches];

  for (const match of matches) {
    const teamIds = [match.homeTeamId, match.awayTeamId];
    const sameTime = allMatches.filter((item) => item.id !== match.id && item.date === match.date && item.time === match.time);

    if (sameTime.some((item) => item.homeTeamId === match.homeTeamId || item.awayTeamId === match.homeTeamId || item.homeTeamId === match.awayTeamId || item.awayTeamId === match.awayTeamId)) {
      conflicts.push({ matchId: match.id, type: "team_time", message: "Team has another match at the same time." });
    }

    if (sameTime.some((item) => item.court === match.court)) {
      conflicts.push({ matchId: match.id, type: "court_time", message: "Pitch/court is double-booked." });
    }

    if (endDate && match.date > endDate) {
      conflicts.push({ matchId: match.id, type: "outside_date_range", message: "Fixture is after the optional end date." });
    }

    for (const teamId of teamIds) {
      const sameDay = allMatches.filter((item) => item.date === match.date && (item.homeTeamId === teamId || item.awayTeamId === teamId));
      if (sameDay.length > maxTeamMatchesPerDay) {
        conflicts.push({ matchId: match.id, type: "team_daily_limit", message: "Team exceeds the daily match limit." });
      }

      const tooClose = sameDay.some((item) => item.id !== match.id && Math.abs(timeToMinutes(item.time) - timeToMinutes(match.time)) < restMinutes);
      if (tooClose) {
        conflicts.push({ matchId: match.id, type: "rest_time", message: "Team rest time is below the selected minimum." });
      }
    }
  }

  return conflicts;
}

function exportCsv(matches: Match[], teams: Team[]) {
  const header = ["Date", "Time", "Court", "Phase", "Round", "Home", "Away", "Sport", "Group"];
  const rows = matches.map((match) => {
    const home = teams.find((team) => team.id === match.homeTeamId);
    const away = teams.find((team) => team.id === match.awayTeamId);
    return [match.date, match.time, match.court, match.phase, match.roundLabel, home?.name, away?.name, match.sport, match.group];
  });
  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "orso-fixture-preview.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export default function FixtureBuilderPage() {
  const router = useRouter();
  const { authLoading, canManageAll, supabaseEnabled, data, selectedTournamentId, saveMatch } = useTournamentData();
  const [tournamentId, setTournamentId] = useState(selectedTournamentId);
  const tournament = data.tournaments.find((item) => item.id === tournamentId);
  const tournamentTeams = data.teams.filter((team) => team.tournamentId === tournamentId || (!team.tournamentId && tournamentId === selectedTournamentId));
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [format, setFormat] = useState<FixtureFormat>("single_round_robin");
  const [startDate, setStartDate] = useState(todayInputValue);
  const [endDate, setEndDate] = useState("");
  const [courtsText, setCourtsText] = useState("Main Pitch\nPitch 2");
  const [slotsText, setSlotsText] = useState("10:00\n11:30\n13:00\n14:30");
  const [restMinutes, setRestMinutes] = useState(90);
  const [maxTeamMatchesPerDay, setMaxTeamMatchesPerDay] = useState(1);
  const [preview, setPreview] = useState<Match[]>([]);
  const [confirmConflicts, setConfirmConflicts] = useState(false);
  const [message, setMessage] = useState("Generate a preview before saving fixtures.");

  useEffect(() => {
    if (!supabaseEnabled || authLoading) {
      return;
    }

    if (!canManageAll) {
      router.replace("/login?next=/admin/fixture-builder");
    }
  }, [authLoading, canManageAll, router, supabaseEnabled]);

  const selectedTeams = useMemo(() => tournamentTeams.filter((team) => selectedTeamIds.includes(team.id)), [selectedTeamIds, tournamentTeams]);
  const existingTournamentMatches = useMemo(() => data.matches.filter((match) => match.tournamentId === tournamentId), [data.matches, tournamentId]);
  const conflicts = useMemo(
    () => detectConflicts(preview, existingTournamentMatches, maxTeamMatchesPerDay, restMinutes, endDate || undefined),
    [endDate, existingTournamentMatches, maxTeamMatchesPerDay, preview, restMinutes]
  );
  const conflictsByMatch = useMemo(() => {
    return conflicts.reduce((map, conflict) => {
      map.set(conflict.matchId, [...(map.get(conflict.matchId) ?? []), conflict]);
      return map;
    }, new Map<string, FixtureConflict[]>());
  }, [conflicts]);

  function generatePreview() {
    const courts = parseList(courtsText);
    const slots = parseList(slotsText);

    if (!tournamentId || selectedTeams.length < 2 || courts.length === 0 || slots.length === 0 || !startDate) {
      setMessage("Select a tournament, at least two teams, start date, courts, and match slots.");
      setPreview([]);
      return;
    }

    const pairs = buildPairs(format, selectedTeams);
    const fixtures = scheduleFixtures({ pairs, teams: selectedTeams, tournamentId, startDate, courts, slots });
    setPreview(fixtures);
    setConfirmConflicts(false);
    setMessage(`Generated ${fixtures.length} fixture${fixtures.length === 1 ? "" : "s"} for preview.`);
  }

  function updatePreviewMatch(matchId: string, updates: Partial<Match>) {
    setPreview((current) =>
      current.map((match) => {
        if (match.id !== matchId) return match;
        const court = updates.court ?? match.court;
        return { ...match, ...updates, court, hallSlug: slugify(court) || "main-hall" };
      })
    );
    setConfirmConflicts(false);
  }

  async function savePreview() {
    if (preview.length === 0) {
      return;
    }

    if (conflicts.length > 0 && !confirmConflicts) {
      setMessage("Resolve fixture conflicts or confirm saving the preview with warnings.");
      return;
    }

    for (const match of preview) {
      await saveMatch(match);
    }

    setMessage(`Saved ${preview.length} generated fixture${preview.length === 1 ? "" : "s"}.`);
    setPreview([]);
    setConfirmConflicts(false);
  }

  if (supabaseEnabled && authLoading) {
    return <PageHeader title="Checking access" description="Loading your Supabase session." />;
  }

  if (supabaseEnabled && !canManageAll) {
    return <PageHeader title="Admin access required" description="Redirecting to login." />;
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Admin only"
        title="Fixture builder"
        description="Generate league, group stage, and knockout fixtures. Edit the preview, check conflicts, export CSV, print, then save after confirmation."
        action={
          <Link href="/admin" className="print-hidden rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 hover:bg-blue-100">
            Back to Admin CMS
          </Link>
        }
      />

      <div className="print-hidden rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">{message}</div>

      <section className="print-hidden rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-black text-slate-900">Fixture setup</h2>
          <p className="mt-1 text-sm text-slate-500">Choose teams, format, dates, pitches, slots, and rest rules before generating.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-4">
          <label className="lg:col-span-2">
            <span className={labelClass()}>Tournament</span>
            <select
              value={tournamentId}
              onChange={(event) => {
                setTournamentId(event.target.value);
                setSelectedTeamIds([]);
                setPreview([]);
              }}
              className={inputClass()}
            >
              {data.tournaments.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelClass()}>Format</span>
            <select value={format} onChange={(event) => setFormat(event.target.value as FixtureFormat)} className={inputClass()}>
              {Object.entries(formatLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelClass()}>Start date</span>
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className={inputClass()} />
          </label>
          <label>
            <span className={labelClass()}>End date optional</span>
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className={inputClass()} />
          </label>
          <label>
            <span className={labelClass()}>Rest minutes</span>
            <input type="number" min={0} value={restMinutes} onChange={(event) => setRestMinutes(Math.max(0, Number(event.target.value) || 0))} className={inputClass()} />
          </label>
          <label>
            <span className={labelClass()}>Max team matches / day</span>
            <input type="number" min={1} value={maxTeamMatchesPerDay} onChange={(event) => setMaxTeamMatchesPerDay(Math.max(1, Number(event.target.value) || 1))} className={inputClass()} />
          </label>
          <label className="lg:col-span-2">
            <span className={labelClass()}>Pitches / courts</span>
            <textarea value={courtsText} onChange={(event) => setCourtsText(event.target.value)} className={`${inputClass()} min-h-28`} placeholder="Main Pitch&#10;Pitch 2" />
          </label>
          <label className="lg:col-span-2">
            <span className={labelClass()}>Daily match time slots</span>
            <textarea value={slotsText} onChange={(event) => setSlotsText(event.target.value)} className={`${inputClass()} min-h-28`} placeholder="10:00&#10;11:30&#10;13:00" />
          </label>
        </div>

        <div className="mt-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-black text-slate-900">Teams</h3>
              <p className="text-sm font-semibold text-slate-400">{tournament?.name ?? "Selected tournament"} / {selectedTeams.length} selected</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setSelectedTeamIds(tournamentTeams.map((team) => team.id))} className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50">
                Select all
              </button>
              <button type="button" onClick={() => setSelectedTeamIds([])} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
                Clear
              </button>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {tournamentTeams.map((team) => (
              <label key={team.id} className={clsx("flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-3", selectedTeamIds.includes(team.id) ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white")}>
                <input
                  type="checkbox"
                  checked={selectedTeamIds.includes(team.id)}
                  onChange={(event) => {
                    setSelectedTeamIds((current) => (event.target.checked ? [...current, team.id] : current.filter((id) => id !== team.id)));
                    setPreview([]);
                  }}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <TeamLogo team={team} size="h-9 w-9" />
                <span className="min-w-0">
                  <span className="block break-words text-sm font-black text-slate-900">{team.name}</span>
                  <span className="text-xs font-semibold text-slate-500">{team.group} / {team.sport}</span>
                </span>
              </label>
            ))}
          </div>
          {tournamentTeams.length === 0 ? <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-400">No teams are available for this tournament.</p> : null}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={generatePreview} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-700">
            Generate preview
          </button>
          <button type="button" onClick={() => setPreview([])} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
            Clear preview
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm print:border-0 print:p-0 print:shadow-none">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="hidden text-xs font-black uppercase tracking-wide text-blue-700 print:block">{tournament?.name ?? "Tournament"}</p>
            <h2 className="text-lg font-black text-slate-900">Fixture schedule preview</h2>
            <p className="mt-1 text-sm text-slate-500 print:text-slate-700">{preview.length} fixtures / {conflicts.length} warnings</p>
          </div>
          <div className="print-hidden flex flex-wrap gap-2">
            <button type="button" onClick={() => window.print()} disabled={preview.length === 0} className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400">
              <Printer size={16} /> Print
            </button>
            <button type="button" onClick={() => exportCsv(preview, data.teams)} disabled={preview.length === 0} className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-black text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400">
              <Download size={16} /> Export CSV
            </button>
            <button type="button" onClick={() => void savePreview()} disabled={preview.length === 0} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300">
              <Save size={16} /> Save matches
            </button>
          </div>
        </div>

        {conflicts.length > 0 ? (
          <label className="print-hidden mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
            <input type="checkbox" checked={confirmConflicts} onChange={(event) => setConfirmConflicts(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-amber-300" />
            <span>{conflicts.length} conflict warning{conflicts.length === 1 ? "" : "s"} found. Confirm to save with warnings.</span>
          </label>
        ) : null}

        <div className="overflow-x-auto">
          <table className="report-table min-w-full text-sm">
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Time</th>
                <th>Court</th>
                <th>Home</th>
                <th>Away</th>
                <th>Phase</th>
                <th className="print-hidden">Warnings</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((match, index) => {
                const home = data.teams.find((team) => team.id === match.homeTeamId);
                const away = data.teams.find((team) => team.id === match.awayTeamId);
                const matchConflicts = conflictsByMatch.get(match.id) ?? [];

                return (
                  <tr key={match.id} className={matchConflicts.length > 0 ? "bg-amber-50" : ""}>
                    <td className="font-black">{index + 1}</td>
                    <td>
                      <input type="date" value={match.date} onChange={(event) => updatePreviewMatch(match.id, { date: event.target.value })} className="print-hidden w-36 rounded-md border border-slate-300 px-2 py-1" />
                      <span className="hidden print:inline">{match.date}</span>
                    </td>
                    <td>
                      <input type="time" value={match.time} onChange={(event) => updatePreviewMatch(match.id, { time: event.target.value })} className="print-hidden w-28 rounded-md border border-slate-300 px-2 py-1" />
                      <span className="hidden print:inline">{match.time}</span>
                    </td>
                    <td>
                      <input value={match.court} onChange={(event) => updatePreviewMatch(match.id, { court: event.target.value })} className="print-hidden w-36 rounded-md border border-slate-300 px-2 py-1" />
                      <span className="hidden print:inline">{match.court}</span>
                    </td>
                    <td className="font-bold">{home?.name ?? "Home"}</td>
                    <td className="font-bold">{away?.name ?? "Away"}</td>
                    <td>
                      <div className="print-hidden grid gap-1">
                        <select value={match.phase ?? "Group Stage"} onChange={(event) => updatePreviewMatch(match.id, { phase: event.target.value as MatchPhase })} className="rounded-md border border-slate-300 px-2 py-1">
                          {matchPhaseOptions.map((phase) => (
                            <option key={phase} value={phase}>{phase}</option>
                          ))}
                        </select>
                        <input value={match.roundLabel ?? ""} onChange={(event) => updatePreviewMatch(match.id, { roundLabel: event.target.value })} className="rounded-md border border-slate-300 px-2 py-1" />
                      </div>
                      <span className="hidden print:inline">{match.phase} / {match.roundLabel}</span>
                    </td>
                    <td className="print-hidden">
                      <div className="grid gap-1">
                        {matchConflicts.map((conflict, conflictIndex) => (
                          <span key={`${conflict.type}-${conflictIndex}`} className="rounded-full bg-amber-100 px-2 py-1 text-xs font-black text-amber-800">{conflict.message}</span>
                        ))}
                        {matchConflicts.length === 0 ? <span className="text-xs font-bold text-emerald-700">Clear</span> : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {preview.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-slate-400">No preview generated yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
