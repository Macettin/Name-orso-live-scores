"use client";

import { useMemo, useState } from "react";
import { LogOut, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { createId } from "@/lib/data-store";
import type { Match, MatchStatus, Player, Sport, Team } from "@/lib/types";
import { useTournamentData } from "@/hooks/use-tournament-data";

type TeamForm = Pick<Team, "id" | "name" | "group" | "sport" | "city" | "coach" | "colors">;
type PlayerForm = {
  id: string;
  name: string;
  number: number;
  teamId: string;
  position: string;
  points: number;
  assists: number;
  rebounds: number;
  blocks: number;
  aces: number;
  digs: number;
};
type MatchForm = Pick<
  Match,
  "id" | "homeTeamId" | "awayTeamId" | "date" | "time" | "court" | "status" | "homeScore" | "awayScore" | "periodLabel" | "report"
>;

const emptyTeam: TeamForm = {
  id: "",
  name: "",
  group: "Group A",
  sport: "Volleyball",
  city: "",
  coach: "",
  colors: ""
};

const emptyPlayer: PlayerForm = {
  id: "",
  name: "",
  number: 0,
  teamId: "",
  position: "",
  points: 0,
  assists: 0,
  rebounds: 0,
  blocks: 0,
  aces: 0,
  digs: 0
};

const emptyMatch: MatchForm = {
  id: "",
  homeTeamId: "",
  awayTeamId: "",
  date: "2026-05-03",
  time: "10:00",
  court: "Court 1",
  status: "Scheduled",
  homeScore: 0,
  awayScore: 0,
  periodLabel: "Pregame",
  report: ""
};

function labelClass() {
  return "text-sm font-semibold text-slate-700";
}

function inputClass() {
  return "mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";
}

function sectionTitle(title: string, description: string) {
  return (
    <div>
      <h2 className="text-lg font-bold text-slate-950">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

export function AdminScoreForm() {
  const {
    data,
    profile,
    supabaseEnabled,
    lastError,
    canManageAll,
    canScore,
    logout,
    saveTeam,
    removeTeam,
    savePlayer,
    removePlayer,
    saveMatch,
    removeMatch,
    saveScore
  } = useTournamentData();
  const [teamForm, setTeamForm] = useState<TeamForm>(emptyTeam);
  const [playerForm, setPlayerForm] = useState<PlayerForm>(() => ({ ...emptyPlayer, teamId: data.teams[0]?.id ?? "" }));
  const [matchForm, setMatchForm] = useState<MatchForm>(() => ({
    ...emptyMatch,
    homeTeamId: data.teams[0]?.id ?? "",
    awayTeamId: data.teams[1]?.id ?? data.teams[0]?.id ?? ""
  }));
  const [selectedScoreMatchId, setSelectedScoreMatchId] = useState(() => data.matches[0]?.id ?? "");
  const [message, setMessage] = useState("CMS data syncs to the shared tournament store.");

  const teamOptions = useMemo(() => data.teams, [data.teams]);
  const scoreMatches = data.matches;
  const selectedScoreMatch = scoreMatches.find((match) => match.id === selectedScoreMatchId) ?? scoreMatches[0];

  function submitTeam(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!teamForm.name.trim()) {
      return;
    }

    const team: Team = {
      ...teamForm,
      id: teamForm.id || createId("team", teamForm.name),
      name: teamForm.name.trim()
    };
    saveTeam(team);
    setTeamForm(emptyTeam);
    setMessage(`Saved team: ${team.name}`);
  }

  function submitPlayer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const teamId = playerForm.teamId || teamOptions[0]?.id;

    if (!playerForm.name.trim() || !teamId) {
      return;
    }

    const player: Player = {
      id: playerForm.id || createId("player", playerForm.name),
      name: playerForm.name.trim(),
      number: playerForm.number,
      teamId,
      position: playerForm.position,
      stats: {
        points: playerForm.points,
        assists: playerForm.assists,
        rebounds: playerForm.rebounds,
        blocks: playerForm.blocks,
        aces: playerForm.aces,
        digs: playerForm.digs
      }
    };
    savePlayer(player);
    setPlayerForm({ ...emptyPlayer, teamId: teamOptions[0]?.id ?? "" });
    setMessage(`Saved player: ${player.name}`);
  }

  function submitMatch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const homeTeamId = matchForm.homeTeamId || teamOptions[0]?.id;
    const awayTeamId = matchForm.awayTeamId || teamOptions[1]?.id || teamOptions[0]?.id;
    const homeTeam = data.teams.find((team) => team.id === homeTeamId);

    if (!homeTeam || !awayTeamId || homeTeamId === awayTeamId) {
      setMessage("Choose two different teams for the match.");
      return;
    }

    const match: Match = {
      ...matchForm,
      homeTeamId,
      awayTeamId,
      id: matchForm.id || createId("match", `${homeTeam.name}-${matchForm.date}`),
      sport: homeTeam.sport,
      group: homeTeam.group,
      hallSlug: matchForm.court.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "main-hall",
      report: matchForm.report || undefined
    };
    saveMatch(match);
    setMatchForm({
      ...emptyMatch,
      homeTeamId: teamOptions[0]?.id ?? "",
      awayTeamId: teamOptions[1]?.id ?? teamOptions[0]?.id ?? ""
    });
    setMessage(`Saved match on ${match.court}.`);
  }

  function submitScore(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedScoreMatch) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const score = {
      homeScore: Number(formData.get("homeScore") ?? 0),
      awayScore: Number(formData.get("awayScore") ?? 0),
      periodLabel: String(formData.get("periodLabel") ?? ""),
      status: String(formData.get("status") ?? "Scheduled") as MatchStatus
    };

    saveScore(selectedScoreMatch.id, score);
    setMessage(`Saved score: ${score.homeScore}-${score.awayScore}`);
  }

  function editPlayer(player: Player) {
    setPlayerForm({
      id: player.id,
      name: player.name,
      number: player.number,
      teamId: player.teamId,
      position: player.position,
      points: player.stats.points,
      assists: player.stats.assists ?? 0,
      rebounds: player.stats.rebounds ?? 0,
      blocks: player.stats.blocks ?? 0,
      aces: player.stats.aces ?? 0,
      digs: player.stats.digs ?? 0
    });
  }

  function editMatch(match: Match) {
    setMatchForm({
      id: match.id,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      date: match.date,
      time: match.time,
      court: match.court,
      status: match.status,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      periodLabel: match.periodLabel,
      report: match.report ?? ""
    });
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
        {lastError ?? message}
      </div>

      {!supabaseEnabled ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local` to save data.
        </div>
      ) : null}

      {profile ? (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Signed in</h2>
              <p className="mt-1 text-sm text-slate-500">
                {profile.email} - {profile.role}
              </p>
            </div>
            <button onClick={() => void logout()} className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">
              <LogOut size={16} aria-hidden="true" />
              Sign out
            </button>
          </div>
        </section>
      ) : null}

      {canManageAll ? (
        <>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          {sectionTitle("Teams", "Create, edit, and delete teams. Deleting a team also removes its players and matches.")}
          {teamForm.id ? (
            <button onClick={() => setTeamForm(emptyTeam)} className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">
              <X size={16} aria-hidden="true" />
              Cancel edit
            </button>
          ) : null}
        </div>
        <form onSubmit={submitTeam} className="grid gap-4 md:grid-cols-4">
          <label>
            <span className={labelClass()}>Name</span>
            <input value={teamForm.name} onChange={(event) => setTeamForm({ ...teamForm, name: event.target.value })} className={inputClass()} />
          </label>
          <label>
            <span className={labelClass()}>Group</span>
            <input value={teamForm.group} onChange={(event) => setTeamForm({ ...teamForm, group: event.target.value })} className={inputClass()} />
          </label>
          <label>
            <span className={labelClass()}>Sport</span>
            <select value={teamForm.sport} onChange={(event) => setTeamForm({ ...teamForm, sport: event.target.value as Sport })} className={inputClass()}>
              <option value="Volleyball">Volleyball</option>
              <option value="Basketball">Basketball</option>
            </select>
          </label>
          <label>
            <span className={labelClass()}>City</span>
            <input value={teamForm.city} onChange={(event) => setTeamForm({ ...teamForm, city: event.target.value })} className={inputClass()} />
          </label>
          <label>
            <span className={labelClass()}>Coach</span>
            <input value={teamForm.coach} onChange={(event) => setTeamForm({ ...teamForm, coach: event.target.value })} className={inputClass()} />
          </label>
          <label>
            <span className={labelClass()}>Colors</span>
            <input value={teamForm.colors} onChange={(event) => setTeamForm({ ...teamForm, colors: event.target.value })} className={inputClass()} />
          </label>
          <div className="flex items-end md:col-span-2">
            <button className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
              {teamForm.id ? <Save size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
              {teamForm.id ? "Save team" : "Add team"}
            </button>
          </div>
        </form>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.teams.map((team) => (
            <div key={team.id} className="rounded-lg border border-slate-200 p-4">
              <p className="font-bold text-slate-950">{team.name}</p>
              <p className="text-sm text-slate-500">
                {team.sport} - {team.group}
              </p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => setTeamForm(team)} className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold">
                  <Pencil size={14} aria-hidden="true" />
                  Edit
                </button>
                <button onClick={() => removeTeam(team.id)} className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-700">
                  <Trash2 size={14} aria-hidden="true" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          {sectionTitle("Players", "Create, edit, and delete roster records with simple stat fields.")}
          {playerForm.id ? (
            <button onClick={() => setPlayerForm({ ...emptyPlayer, teamId: teamOptions[0]?.id ?? "" })} className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">
              <X size={16} aria-hidden="true" />
              Cancel edit
            </button>
          ) : null}
        </div>
        <form onSubmit={submitPlayer} className="grid gap-4 md:grid-cols-4">
          <label>
            <span className={labelClass()}>Name</span>
            <input value={playerForm.name} onChange={(event) => setPlayerForm({ ...playerForm, name: event.target.value })} className={inputClass()} />
          </label>
          <label>
            <span className={labelClass()}>Number</span>
            <input type="number" value={playerForm.number} onChange={(event) => setPlayerForm({ ...playerForm, number: Number(event.target.value) })} className={inputClass()} />
          </label>
          <label>
            <span className={labelClass()}>Team</span>
            <select value={playerForm.teamId || teamOptions[0]?.id || ""} onChange={(event) => setPlayerForm({ ...playerForm, teamId: event.target.value })} className={inputClass()}>
              {teamOptions.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelClass()}>Position</span>
            <input value={playerForm.position} onChange={(event) => setPlayerForm({ ...playerForm, position: event.target.value })} className={inputClass()} />
          </label>
          {(["points", "assists", "rebounds", "blocks", "aces", "digs"] as const).map((stat) => (
            <label key={stat}>
              <span className={labelClass()}>{stat}</span>
              <input type="number" value={playerForm[stat]} onChange={(event) => setPlayerForm({ ...playerForm, [stat]: Number(event.target.value) })} className={inputClass()} />
            </label>
          ))}
          <div className="flex items-end md:col-span-2">
            <button className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
              {playerForm.id ? <Save size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
              {playerForm.id ? "Save player" : "Add player"}
            </button>
          </div>
        </form>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.players.map((player) => {
            const team = data.teams.find((item) => item.id === player.teamId);
            return (
              <div key={player.id} className="rounded-lg border border-slate-200 p-4">
                <p className="font-bold text-slate-950">
                  #{player.number} {player.name}
                </p>
                <p className="text-sm text-slate-500">
                  {team?.name} - {player.stats.points} pts
                </p>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => editPlayer(player)} className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold">
                    <Pencil size={14} aria-hidden="true" />
                    Edit
                  </button>
                  <button onClick={() => removePlayer(player.id)} className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-700">
                    <Trash2 size={14} aria-hidden="true" />
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          {sectionTitle("Matches", "Create, edit, and delete match records. Scores can also be edited here or in the score panel.")}
          {matchForm.id ? (
            <button
              onClick={() => setMatchForm({ ...emptyMatch, homeTeamId: teamOptions[0]?.id ?? "", awayTeamId: teamOptions[1]?.id ?? teamOptions[0]?.id ?? "" })}
              className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"
            >
              <X size={16} aria-hidden="true" />
              Cancel edit
            </button>
          ) : null}
        </div>
        <form onSubmit={submitMatch} className="grid gap-4 md:grid-cols-4">
          <label>
            <span className={labelClass()}>Home team</span>
            <select value={matchForm.homeTeamId || teamOptions[0]?.id || ""} onChange={(event) => setMatchForm({ ...matchForm, homeTeamId: event.target.value })} className={inputClass()}>
              {teamOptions.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelClass()}>Away team</span>
            <select value={matchForm.awayTeamId || teamOptions[1]?.id || teamOptions[0]?.id || ""} onChange={(event) => setMatchForm({ ...matchForm, awayTeamId: event.target.value })} className={inputClass()}>
              {teamOptions.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelClass()}>Date</span>
            <input type="date" value={matchForm.date} onChange={(event) => setMatchForm({ ...matchForm, date: event.target.value })} className={inputClass()} />
          </label>
          <label>
            <span className={labelClass()}>Time</span>
            <input type="time" value={matchForm.time} onChange={(event) => setMatchForm({ ...matchForm, time: event.target.value })} className={inputClass()} />
          </label>
          <label>
            <span className={labelClass()}>Court</span>
            <input value={matchForm.court} onChange={(event) => setMatchForm({ ...matchForm, court: event.target.value })} className={inputClass()} />
          </label>
          <label>
            <span className={labelClass()}>Status</span>
            <select value={matchForm.status} onChange={(event) => setMatchForm({ ...matchForm, status: event.target.value as MatchStatus })} className={inputClass()}>
              <option value="Scheduled">Scheduled</option>
              <option value="Live">Live</option>
              <option value="Final">Final</option>
            </select>
          </label>
          <label>
            <span className={labelClass()}>Home score</span>
            <input type="number" value={matchForm.homeScore} onChange={(event) => setMatchForm({ ...matchForm, homeScore: Number(event.target.value) })} className={inputClass()} />
          </label>
          <label>
            <span className={labelClass()}>Away score</span>
            <input type="number" value={matchForm.awayScore} onChange={(event) => setMatchForm({ ...matchForm, awayScore: Number(event.target.value) })} className={inputClass()} />
          </label>
          <label className="md:col-span-2">
            <span className={labelClass()}>Period label</span>
            <input value={matchForm.periodLabel} onChange={(event) => setMatchForm({ ...matchForm, periodLabel: event.target.value })} className={inputClass()} />
          </label>
          <label className="md:col-span-2">
            <span className={labelClass()}>Report</span>
            <input value={matchForm.report ?? ""} onChange={(event) => setMatchForm({ ...matchForm, report: event.target.value })} className={inputClass()} />
          </label>
          <div className="flex items-end">
            <button className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
              {matchForm.id ? <Save size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
              {matchForm.id ? "Save match" : "Add match"}
            </button>
          </div>
        </form>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {data.matches.map((match) => {
            const home = data.teams.find((team) => team.id === match.homeTeamId);
            const away = data.teams.find((team) => team.id === match.awayTeamId);
            return (
              <div key={match.id} className="rounded-lg border border-slate-200 p-4">
                <p className="font-bold text-slate-950">
                  {home?.name} vs {away?.name}
                </p>
                <p className="text-sm text-slate-500">
                  {match.date} {match.time} - {match.court} - {match.status} - {match.homeScore}-{match.awayScore}
                </p>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => editMatch(match)} className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold">
                    <Pencil size={14} aria-hidden="true" />
                    Edit
                  </button>
                  <button onClick={() => removeMatch(match.id)} className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-700">
                    <Trash2 size={14} aria-hidden="true" />
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
        </>
      ) : null}

      {canScore ? (
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        {sectionTitle("Scores", "Fast score update panel for live scoring.")}
        <form key={`${selectedScoreMatch?.id ?? "none"}-${selectedScoreMatch?.homeScore ?? 0}-${selectedScoreMatch?.awayScore ?? 0}-${selectedScoreMatch?.status ?? ""}-${selectedScoreMatch?.periodLabel ?? ""}`} onSubmit={submitScore} className="mt-5 grid gap-4 md:grid-cols-5">
          <label className="md:col-span-2">
            <span className={labelClass()}>Match</span>
            <select value={selectedScoreMatch?.id ?? ""} onChange={(event) => setSelectedScoreMatchId(event.target.value)} className={inputClass()}>
              {scoreMatches.map((match) => {
                const home = data.teams.find((team) => team.id === match.homeTeamId);
                const away = data.teams.find((team) => team.id === match.awayTeamId);
                return (
                  <option key={match.id} value={match.id}>
                    {home?.name} vs {away?.name} - {match.court}
                  </option>
                );
              })}
            </select>
          </label>
          <label>
            <span className={labelClass()}>Home score</span>
            <input name="homeScore" type="number" defaultValue={selectedScoreMatch?.homeScore ?? 0} className={inputClass()} />
          </label>
          <label>
            <span className={labelClass()}>Away score</span>
            <input name="awayScore" type="number" defaultValue={selectedScoreMatch?.awayScore ?? 0} className={inputClass()} />
          </label>
          <label>
            <span className={labelClass()}>Status</span>
            <select name="status" defaultValue={selectedScoreMatch?.status ?? "Scheduled"} className={inputClass()}>
              <option value="Scheduled">Scheduled</option>
              <option value="Live">Live</option>
              <option value="Final">Final</option>
            </select>
          </label>
          <label className="md:col-span-2">
            <span className={labelClass()}>Period label</span>
            <input name="periodLabel" defaultValue={selectedScoreMatch?.periodLabel ?? ""} className={inputClass()} />
          </label>
          <div className="flex items-end md:col-span-3">
            <button className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
              <Save size={16} aria-hidden="true" />
              Save score
            </button>
          </div>
        </form>
        {scoreMatches.length === 0 ? <p className="mt-4 text-sm text-slate-500">No matches are available.</p> : null}
      </section>
      ) : null}
    </div>
  );
}
