"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { createId, slugify } from "@/lib/data-store";
import { useTournamentData } from "@/hooks/use-tournament-data";
import type { Match, Team } from "@/lib/types";
import { PageHeader, TeamLogo } from "@/components/ui";

type FixtureFormat = "single_round_robin" | "double_round_robin" | "group_stage" | "knockout";

const formatLabels: Record<FixtureFormat, string> = {
  single_round_robin: "Single round robin",
  double_round_robin: "Double round robin",
  group_stage: "Group stage fixtures",
  knockout: "Knockout bracket placeholders"
};

type FixturePair = {
  homeTeamId: string;
  awayTeamId: string;
  phase: string;
  report?: string;
};

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function inputClass() {
  return "mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
}

function labelClass() {
  return "text-sm font-bold text-slate-700";
}

function addDays(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function roundRobinPairs(teams: Team[], doubleRound: boolean, phase: string): FixturePair[] {
  const pairs: FixturePair[] = [];

  teams.forEach((home, homeIndex) => {
    teams.slice(homeIndex + 1).forEach((away) => {
      pairs.push({ homeTeamId: home.id, awayTeamId: away.id, phase });
      if (doubleRound) {
        pairs.push({ homeTeamId: away.id, awayTeamId: home.id, phase });
      }
    });
  });

  return pairs;
}

function knockoutPairs(teams: Team[]): FixturePair[] {
  const pairCount = Math.floor(teams.length / 2);
  const phase = teams.length > 8 ? "Round of 16" : teams.length > 4 ? "Quarterfinal" : teams.length > 2 ? "Semifinal" : "Final";

  return Array.from({ length: pairCount }, (_, index) => {
    const home = teams[index];
    const away = teams[teams.length - 1 - index];
    return {
      homeTeamId: home.id,
      awayTeamId: away.id,
      phase,
      report: `${phase} placeholder. Confirm final bracket seeds before match day.`
    };
  });
}

function buildPairs(format: FixtureFormat, teams: Team[]) {
  if (format === "single_round_robin") {
    return roundRobinPairs(teams, false, "League");
  }

  if (format === "double_round_robin") {
    return roundRobinPairs(teams, true, "League");
  }

  if (format === "group_stage") {
    return Array.from(
      teams.reduce((groups, team) => {
        const groupTeams = groups.get(team.group) ?? [];
        groups.set(team.group, [...groupTeams, team]);
        return groups;
      }, new Map<string, Team[]>())
    ).flatMap(([group, groupTeams]) => roundRobinPairs(groupTeams, false, group || "Group stage"));
  }

  return knockoutPairs(teams);
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

    return {
      id: createId("match", `${home?.name ?? "home"}-${away?.name ?? "away"}-${addDays(startDate, dayIndex)}-${time}`),
      tournamentId,
      sport: home?.sport ?? away?.sport ?? "Football",
      group: pair.phase || home?.group || "Group A",
      court,
      hallSlug: slugify(court) || "main-hall",
      date: addDays(startDate, dayIndex),
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

export default function FixtureBuilderPage() {
  const router = useRouter();
  const { authLoading, canManageAll, supabaseEnabled, data, selectedTournamentId, saveMatch } = useTournamentData();
  const [tournamentId, setTournamentId] = useState(selectedTournamentId);
  const tournament = data.tournaments.find((item) => item.id === tournamentId);
  const tournamentTeams = data.teams.filter((team) => team.tournamentId === tournamentId || (!team.tournamentId && tournamentId === selectedTournamentId));
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [format, setFormat] = useState<FixtureFormat>("single_round_robin");
  const [startDate, setStartDate] = useState(todayInputValue);
  const [courtsText, setCourtsText] = useState("Main Hall");
  const [slotsText, setSlotsText] = useState("10:00\n11:30\n13:00\n14:30");
  const [preview, setPreview] = useState<Match[]>([]);
  const [confirmDuplicates, setConfirmDuplicates] = useState(false);
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
  const existingMatchKeys = useMemo(
    () =>
      new Set(
        data.matches
          .filter((match) => match.tournamentId === tournamentId)
          .map((match) => `${match.date}|${match.time}|${match.court}|${[match.homeTeamId, match.awayTeamId].sort().join("|")}`)
      ),
    [data.matches, tournamentId]
  );
  const duplicatePreviewCount = preview.filter((match) => existingMatchKeys.has(`${match.date}|${match.time}|${match.court}|${[match.homeTeamId, match.awayTeamId].sort().join("|")}`)).length;

  function parseList(value: string) {
    return value
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

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
    setConfirmDuplicates(false);
    setMessage(`Generated ${fixtures.length} fixture${fixtures.length === 1 ? "" : "s"} for preview.`);
  }

  async function savePreview() {
    if (preview.length === 0) {
      return;
    }

    if (duplicatePreviewCount > 0 && !confirmDuplicates) {
      setMessage("Existing fixture conflicts found. Confirm saving duplicates before continuing.");
      return;
    }

    for (const match of preview) {
      await saveMatch(match);
    }

    setMessage(`Saved ${preview.length} generated fixture${preview.length === 1 ? "" : "s"}.`);
    setPreview([]);
    setConfirmDuplicates(false);
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
        description="Generate league, group stage, and knockout placeholder fixtures. Nothing is saved until you confirm the preview."
        action={
          <Link href="/admin" className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 hover:bg-blue-100">
            Back to Admin CMS
          </Link>
        }
      />

      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">{message}</div>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-black text-slate-900">Fixture setup</h2>
          <p className="mt-1 text-sm text-slate-500">Choose teams, format, courts, and slots before generating the preview.</p>
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
          <label className="lg:col-span-2">
            <span className={labelClass()}>Courts / halls</span>
            <textarea value={courtsText} onChange={(event) => setCourtsText(event.target.value)} className={`${inputClass()} min-h-28`} placeholder="Main Hall&#10;Court 2" />
          </label>
          <label className="lg:col-span-2">
            <span className={labelClass()}>Daily match slots</span>
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

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-900">Preview fixtures</h2>
            <p className="mt-1 text-sm text-slate-500">Review generated matches before saving. Existing fixtures are never overwritten.</p>
          </div>
          <button type="button" onClick={() => void savePreview()} disabled={preview.length === 0} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300">
            Save generated matches
          </button>
        </div>

        {duplicatePreviewCount > 0 ? (
          <label className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
            <input type="checkbox" checked={confirmDuplicates} onChange={(event) => setConfirmDuplicates(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-amber-300" />
            <span>{duplicatePreviewCount} generated fixture conflict{duplicatePreviewCount === 1 ? "" : "s"} with an existing team/date/time/court combination. Confirm to save duplicates anyway.</span>
          </label>
        ) : null}

        <div className="grid gap-3">
          {preview.map((match, index) => {
            const home = data.teams.find((team) => team.id === match.homeTeamId);
            const away = data.teams.find((team) => team.id === match.awayTeamId);
            const duplicate = existingMatchKeys.has(`${match.date}|${match.time}|${match.court}|${[match.homeTeamId, match.awayTeamId].sort().join("|")}`);

            return (
              <div key={match.id} className={clsx("grid gap-3 rounded-lg border p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center", duplicate ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white")}>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-sm font-black text-blue-700">{index + 1}</span>
                <div className="min-w-0">
                  <p className="break-words font-black text-slate-900">{home?.name ?? "Home"} vs {away?.name ?? "Away"}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">{match.date} / {match.time} / {match.court} / {match.group}</p>
                  {match.report ? <p className="mt-1 text-sm font-semibold text-blue-600">{match.report}</p> : null}
                </div>
                {duplicate ? <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black uppercase text-amber-800">Conflict</span> : null}
              </div>
            );
          })}
          {preview.length === 0 ? <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-5 text-sm font-semibold text-slate-400">No preview generated yet.</p> : null}
        </div>
      </section>
    </div>
  );
}
