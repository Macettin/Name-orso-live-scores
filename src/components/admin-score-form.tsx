"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LogOut, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { createId } from "@/lib/data-store";
import { formatMatchClock, getBasketballDefaultSeconds, getClockStateForAction, isFootballClockOverride } from "@/lib/match-clock";
import {
  playerStatLabels,
  playerStatsBySport,
  sportOptions,
  tournamentSportOptions,
  type Match,
  type MatchEvent,
  type MatchEventType,
  type MatchStatus,
  type Player,
  type PlayerStatKey,
  type Sport,
  type Team,
  type Tournament,
  type TournamentSportType,
  type TournamentStatus
} from "@/lib/types";
import { useTournamentData } from "@/hooks/use-tournament-data";

type TeamForm = Pick<Team, "id" | "name" | "group" | "sport" | "logoUrl" | "city" | "coach" | "colors">;
type PlayerForm = {
  id: string;
  name: string;
  number: number;
  teamId: string;
  position: string;
  photoUrl: string;
  points: number;
  goals: number;
  assists: number;
  rebounds: number;
  blocks: number;
  aces: number;
  digs: number;
  yellow_cards: number;
  red_cards: number;
};
type MatchForm = Pick<
  Match,
  "id" | "homeTeamId" | "awayTeamId" | "date" | "time" | "court" | "status" | "homeScore" | "awayScore" | "periodLabel" | "matchMinute" | "clockLabel" | "clockRunning" | "youtubeUrl" | "report"
>;
type TournamentForm = Pick<Tournament, "id" | "name" | "sportType" | "location" | "startDate" | "endDate" | "status">;
type EventForm = Pick<MatchEvent, "matchId" | "teamId" | "playerId" | "type" | "minute" | "description">;

const emptyTournament: TournamentForm = {
  id: "",
  name: "",
  sportType: "Mixed",
  location: "",
  startDate: "",
  endDate: "",
  status: "Live"
};

const emptyTeam: TeamForm = {
  id: "",
  name: "",
  group: "Group A",
  sport: "Volleyball",
  logoUrl: "",
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
  photoUrl: "",
  points: 0,
  goals: 0,
  assists: 0,
  rebounds: 0,
  blocks: 0,
  aces: 0,
  digs: 0,
  yellow_cards: 0,
  red_cards: 0
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
  matchMinute: "",
  clockLabel: "",
  clockRunning: false,
  youtubeUrl: "",
  report: ""
};

const emptyEvent: EventForm = {
  matchId: "",
  teamId: "",
  playerId: "",
  type: "goal",
  minute: "",
  description: ""
};

const periodOptionsBySport: Record<Sport, string[]> = {
  Football: ["First Half", "Half Time", "Second Half", "Full Time"],
  Basketball: ["Q1", "Q2", "Half Time", "Q3", "Q4", "Final"],
  Volleyball: ["Set 1", "Set 2", "Set 3", "Set 4", "Set 5", "Final"]
};

function labelClass() {
  return "text-sm font-semibold text-slate-600";
}

function inputClass() {
  return "mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";
}

function sectionTitle(title: string, description: string) {
  return (
    <div>
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-400">{description}</p>
    </div>
  );
}

function sportBadge(sport: Sport) {
  return <span className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700">{sport} mode</span>;
}

function periodOptionsForSport(sport: Sport, current?: string) {
  const options = periodOptionsBySport[sport];
  return current && !options.includes(current) ? [current, ...options] : options;
}

export function AdminScoreForm() {
  const {
    data,
    profile,
    supabaseEnabled,
    lastError,
    selectedTournamentId,
    setSelectedTournamentId,
    canManageAll,
    canScore,
    logout,
    saveTournament,
    removeTournament,
    saveTeam,
    uploadTeamLogo,
    removeTeam,
    savePlayer,
    uploadPlayerPhoto,
    removePlayer,
    saveMatch,
    removeMatch,
    saveScore,
    savePlayerMatchStat,
    saveEvent,
    removeEvent,
    assignClubAdmin,
    removeClubAdminAssignment,
    clubAdminAssignments
  } = useTournamentData();
  const [tournamentForm, setTournamentForm] = useState<TournamentForm>(emptyTournament);
  const [teamForm, setTeamForm] = useState<TeamForm>(emptyTeam);
  const [teamLogoFile, setTeamLogoFile] = useState<File | null>(null);
  const [playerForm, setPlayerForm] = useState<PlayerForm>(() => ({ ...emptyPlayer, teamId: data.teams[0]?.id ?? "" }));
  const [playerPhotoFile, setPlayerPhotoFile] = useState<File | null>(null);
  const [matchForm, setMatchForm] = useState<MatchForm>(() => ({
    ...emptyMatch,
    homeTeamId: data.teams[0]?.id ?? "",
    awayTeamId: data.teams[1]?.id ?? data.teams[0]?.id ?? ""
  }));
  const [selectedScoreMatchId, setSelectedScoreMatchId] = useState(() => data.matches[0]?.id ?? "");
  const [selectedPlayerStatMatchId, setSelectedPlayerStatMatchId] = useState(() => data.matches[0]?.id ?? "");
  const [eventForm, setEventForm] = useState<EventForm>(() => ({ ...emptyEvent, matchId: data.matches[0]?.id ?? "" }));
  const [clubAdminEmail, setClubAdminEmail] = useState("");
  const [clubAdminTeamId, setClubAdminTeamId] = useState("");
  const [message, setMessage] = useState("CMS data syncs to the shared tournament store.");

  const teamOptions = useMemo(() => data.teams, [data.teams]);
  const courtOptions = useMemo(
    () =>
      Array.from(new Map(data.matches.map((match) => [match.hallSlug, { hallSlug: match.hallSlug, court: match.court }])).values()).sort((first, second) =>
        first.court.localeCompare(second.court)
      ),
    [data.matches]
  );
  const selectedTournament = data.tournaments.find((tournament) => tournament.id === selectedTournamentId);
  const selectedTournamentSport = selectedTournament?.sportType !== "Mixed" ? selectedTournament?.sportType : undefined;
  const scoreMatches = data.matches;
  const selectedScoreMatch = scoreMatches.find((match) => match.id === selectedScoreMatchId) ?? scoreMatches[0];
  const selectedPlayerStatMatch = data.matches.find((match) => match.id === selectedPlayerStatMatchId) ?? data.matches[0];
  const selectedPlayerStatMatchTeams = selectedPlayerStatMatch
    ? data.teams.filter((team) => team.id === selectedPlayerStatMatch.homeTeamId || team.id === selectedPlayerStatMatch.awayTeamId)
    : [];
  const selectedPlayerStatMatchPlayers = selectedPlayerStatMatch
    ? data.players.filter((player) => player.teamId === selectedPlayerStatMatch.homeTeamId || player.teamId === selectedPlayerStatMatch.awayTeamId)
    : [];
  const playerFormTeam = data.teams.find((team) => team.id === (playerForm.teamId || teamOptions[0]?.id));
  const playerFormSport = playerFormTeam?.sport ?? "Volleyball";
  const playerFormStats = playerStatsBySport[playerFormSport];
  const selectedPlayerStatSport = selectedPlayerStatMatch?.sport ?? "Volleyball";
  const selectedPlayerQuickStats = [...playerStatsBySport[selectedPlayerStatSport]];
  const eventMatches = data.matches;
  const selectedEventMatch = eventMatches.find((match) => match.id === eventForm.matchId) ?? eventMatches[0];
  const selectedEventSport = selectedEventMatch?.sport ?? selectedTournamentSport;
  const matchFormHomeTeam = data.teams.find((team) => team.id === (matchForm.homeTeamId || teamOptions[0]?.id));
  const matchFormSport = matchFormHomeTeam?.sport ?? selectedTournamentSport ?? "Volleyball";
  const selectedScoreSport = selectedScoreMatch?.sport ?? selectedTournamentSport ?? "Volleyball";
  const matchPeriodOptions = periodOptionsForSport(matchFormSport, matchForm.periodLabel);
  const scorePeriodOptions = periodOptionsForSport(selectedScoreSport, selectedScoreMatch?.periodLabel);
  const eventTeamOptions = selectedEventMatch
    ? data.teams.filter((team) => team.id === selectedEventMatch.homeTeamId || team.id === selectedEventMatch.awayTeamId)
    : [];
  const eventPlayerOptions = data.players.filter((player) => !eventForm.teamId || player.teamId === eventForm.teamId);
  const matchEvents = data.events.filter((item) => !selectedEventMatch || item.matchId === selectedEventMatch.id);

  function submitTournament(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!tournamentForm.name.trim()) {
      return;
    }

    const tournament: Tournament = {
      ...tournamentForm,
      id: tournamentForm.id || createId("tournament", tournamentForm.name),
      name: tournamentForm.name.trim()
    };

    saveTournament(tournament);
    setSelectedTournamentId(tournament.id);
    setTournamentForm(emptyTournament);
    setMessage(`Saved tournament: ${tournament.name}`);
  }

  async function submitTeam(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!teamForm.name.trim()) {
      return;
    }

    const teamId = teamForm.id || createId("team", teamForm.name);
    let logoUrl = teamForm.logoUrl || undefined;

    if (teamLogoFile) {
      try {
        logoUrl = await uploadTeamLogo(teamId, teamLogoFile);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not upload team logo.");
        return;
      }
    }

    const team: Team = {
      ...teamForm,
      id: teamId,
      name: teamForm.name.trim(),
      logoUrl
    };
    await saveTeam(team);
    setTeamForm(emptyTeam);
    setTeamLogoFile(null);
    setMessage(`Saved team: ${team.name}`);
  }

  async function submitPlayer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const teamId = playerForm.teamId || teamOptions[0]?.id;

    if (!playerForm.name.trim() || !teamId) {
      return;
    }

    const playerId = playerForm.id || createId("player", playerForm.name);
    let photoUrl = playerForm.photoUrl || undefined;

    if (playerPhotoFile) {
      try {
        photoUrl = await uploadPlayerPhoto(playerId, playerPhotoFile);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not upload player photo.");
        return;
      }
    }

    const player: Player = {
      id: playerId,
      name: playerForm.name.trim(),
      number: playerForm.number,
      teamId,
      position: playerForm.position,
      photoUrl,
      stats: {
        points: playerForm.points,
        goals: playerForm.goals,
        assists: playerForm.assists,
        rebounds: playerForm.rebounds,
        blocks: playerForm.blocks,
        aces: playerForm.aces,
        digs: playerForm.digs,
        yellow_cards: playerForm.yellow_cards,
        red_cards: playerForm.red_cards
      }
    };
    await savePlayer(player);
    setPlayerForm({ ...emptyPlayer, teamId: teamOptions[0]?.id ?? "" });
    setPlayerPhotoFile(null);
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

    const existingMatch = matchForm.id ? data.matches.find((match) => match.id === matchForm.id) : undefined;
    const match: Match = {
      ...matchForm,
      homeTeamId,
      awayTeamId,
      id: matchForm.id || createId("match", `${homeTeam.name}-${matchForm.date}`),
      sport: homeTeam.sport,
      group: homeTeam.group,
      hallSlug: matchForm.court.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "main-hall",
      clockStartedAt: existingMatch?.clockStartedAt,
      clockBaseSeconds: existingMatch?.clockBaseSeconds,
      clockCountdownSeconds: existingMatch?.clockCountdownSeconds,
      youtubeUrl: matchForm.youtubeUrl || undefined,
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
      matchMinute: "",
      clockLabel: String(formData.get("clockLabel") ?? ""),
      clockRunning: formData.get("clockRunning") === "on",
      status: String(formData.get("status") ?? "Scheduled") as MatchStatus
    };

    saveScore(selectedScoreMatch.id, {
      ...score,
      clockBaseSeconds: selectedScoreMatch.clockBaseSeconds,
      clockStartedAt: selectedScoreMatch.clockStartedAt,
      clockCountdownSeconds: selectedScoreSport === "Basketball" ? Number(formData.get("clockCountdownSeconds") ?? getBasketballDefaultSeconds()) : selectedScoreMatch.clockCountdownSeconds
    });
    setMessage(`Saved score: ${score.homeScore}-${score.awayScore}`);
  }

  function applyClockAction(action: "start" | "pause" | "resume" | "reset") {
    if (!selectedScoreMatch) {
      return;
    }

    const clockState = getClockStateForAction(selectedScoreMatch, action);
    saveScore(selectedScoreMatch.id, {
      homeScore: selectedScoreMatch.homeScore,
      awayScore: selectedScoreMatch.awayScore,
      periodLabel: selectedScoreMatch.periodLabel,
      matchMinute: selectedScoreSport === "Football" ? selectedScoreMatch.matchMinute : "",
      clockLabel: clockState.clockLabel ?? (action === "start" || action === "resume" ? "" : selectedScoreMatch.clockLabel),
      clockRunning: clockState.clockRunning,
      clockStartedAt: clockState.clockStartedAt,
      clockBaseSeconds: clockState.clockBaseSeconds,
      clockCountdownSeconds: clockState.clockCountdownSeconds ?? selectedScoreMatch.clockCountdownSeconds,
      status: action === "start" || action === "resume" ? "Live" : selectedScoreMatch.status
    });
    setMessage(`${action.charAt(0).toUpperCase()}${action.slice(1)} clock: ${formatMatchClock({ ...selectedScoreMatch, ...clockState })}`);
  }

  function submitEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const matchId = eventForm.matchId || eventMatches[0]?.id;

    if (!matchId || !eventForm.minute.trim()) {
      return;
    }

    const matchEvent: MatchEvent = {
      id: createId("event", `${matchId}-${eventForm.type}-${eventForm.minute}`),
      matchId,
      tournamentId: selectedTournamentId,
      teamId: eventForm.teamId || undefined,
      playerId: eventForm.playerId || undefined,
      type: eventForm.type,
      minute: eventForm.minute.trim(),
      description: eventForm.description?.trim() || undefined
    };

    saveEvent(matchEvent);
    setEventForm({ ...emptyEvent, matchId });
    setMessage(`Saved event: ${eventForm.type.replace("_", " ")} at ${matchEvent.minute}`);
  }

  async function submitClubAdminAssignment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const teamId = clubAdminTeamId || teamOptions[0]?.id;
    const email = clubAdminEmail.trim();

    if (!email || !teamId) {
      return;
    }

    try {
      await assignClubAdmin(email, teamId);
      const team = data.teams.find((item) => item.id === teamId);
      setClubAdminEmail("");
      setClubAdminTeamId("");
      setMessage(`Assigned ${email} as club admin for ${team?.name ?? "team"}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not assign club admin.");
    }
  }

  async function removeClubAdmin(userId: string, teamId: string, email?: string) {
    try {
      await removeClubAdminAssignment(userId, teamId);
      setMessage(`Removed club admin assignment for ${email || userId}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not remove club admin assignment.");
    }
  }

  function editPlayer(player: Player) {
    const baseStats = player.baseStats ?? player.stats;

    setPlayerForm({
      id: player.id,
      name: player.name,
      number: player.number,
      teamId: player.teamId,
      position: player.position,
      photoUrl: player.photoUrl ?? "",
      points: baseStats.points,
      goals: baseStats.goals,
      assists: baseStats.assists,
      rebounds: baseStats.rebounds,
      blocks: baseStats.blocks,
      aces: baseStats.aces,
      digs: baseStats.digs,
      yellow_cards: baseStats.yellow_cards,
      red_cards: baseStats.red_cards
    });
    setPlayerPhotoFile(null);
  }

  function addLivePlayerStat(player: Player, statKey: PlayerStatKey) {
    if (!selectedPlayerStatMatch) {
      return;
    }

    savePlayerMatchStat(selectedPlayerStatMatch.id, player.id, statKey, 1);
    setMessage(`Added ${playerStatLabels[statKey].toLowerCase()} for ${player.name}.`);
  }

  function liveButtonLabel(statKey: PlayerStatKey) {
    if (statKey === "goals") return "+ Goal";
    if (statKey === "points") return "+ Point";
    if (statKey === "yellow_cards") return "+ Yellow card";
    if (statKey === "red_cards") return "+ Red card";
    return `+ ${playerStatLabels[statKey]}`;
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
      matchMinute: match.matchMinute ?? "",
      clockLabel: match.clockLabel ?? "",
      clockRunning: match.clockRunning ?? false,
      youtubeUrl: match.youtubeUrl ?? "",
      report: match.report ?? ""
    });
  }

  function editTournament(tournament: Tournament) {
    setTournamentForm({
      id: tournament.id,
      name: tournament.name,
      sportType: tournament.sportType,
      location: tournament.location,
      startDate: tournament.startDate,
      endDate: tournament.endDate,
      status: tournament.status
    });
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">
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
              <h2 className="text-lg font-bold text-slate-900">Signed in</h2>
              <p className="mt-1 text-sm text-slate-400">
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
          {sectionTitle("Tournaments", "Create, edit, and delete tournaments. Team, player, match, and score edits use the selected tournament.")}
          <div className="flex flex-wrap items-center gap-2">
            {selectedTournament ? <span className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700">{selectedTournament.name}</span> : null}
            {tournamentForm.id ? (
              <button onClick={() => setTournamentForm(emptyTournament)} className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">
                <X size={16} aria-hidden="true" />
                Cancel edit
              </button>
            ) : null}
          </div>
        </div>
        <form onSubmit={submitTournament} className="grid gap-4 md:grid-cols-4">
          <label>
            <span className={labelClass()}>Name</span>
            <input value={tournamentForm.name} onChange={(event) => setTournamentForm({ ...tournamentForm, name: event.target.value })} className={inputClass()} />
          </label>
          <label>
            <span className={labelClass()}>Sport type</span>
            <select value={tournamentForm.sportType} onChange={(event) => setTournamentForm({ ...tournamentForm, sportType: event.target.value as TournamentSportType })} className={inputClass()}>
              {tournamentSportOptions.map((sportType) => (
                <option key={sportType} value={sportType}>
                  {sportType}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelClass()}>Location</span>
            <input value={tournamentForm.location} onChange={(event) => setTournamentForm({ ...tournamentForm, location: event.target.value })} className={inputClass()} />
          </label>
          <label>
            <span className={labelClass()}>Status</span>
            <select value={tournamentForm.status} onChange={(event) => setTournamentForm({ ...tournamentForm, status: event.target.value as TournamentStatus })} className={inputClass()}>
              <option value="Scheduled">Scheduled</option>
              <option value="Live">Live</option>
              <option value="Final">Final</option>
              <option value="Archived">Archived</option>
            </select>
          </label>
          <label>
            <span className={labelClass()}>Start date</span>
            <input type="date" value={tournamentForm.startDate} onChange={(event) => setTournamentForm({ ...tournamentForm, startDate: event.target.value })} className={inputClass()} />
          </label>
          <label>
            <span className={labelClass()}>End date</span>
            <input type="date" value={tournamentForm.endDate} onChange={(event) => setTournamentForm({ ...tournamentForm, endDate: event.target.value })} className={inputClass()} />
          </label>
          <div className="flex items-end md:col-span-2">
            <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              {tournamentForm.id ? <Save size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
              {tournamentForm.id ? "Save tournament" : "Add tournament"}
            </button>
          </div>
        </form>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.tournaments.map((tournament) => (
            <div key={tournament.id} className="rounded-lg border border-slate-200 p-4">
              <p className="font-bold text-slate-900">{tournament.name}</p>
              <p className="text-sm text-slate-400">
                {tournament.sportType} - {tournament.status}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => setSelectedTournamentId(tournament.id)} className="flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-1.5 text-sm font-semibold text-blue-700">
                  Select
                </button>
                <button onClick={() => editTournament(tournament)} className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold">
                  <Pencil size={14} aria-hidden="true" />
                  Edit
                </button>
                <button onClick={() => removeTournament(tournament.id)} className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-700">
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
          {sectionTitle("Teams", "Create, edit, and delete teams. Deleting a team also removes its players and matches.")}
          {teamForm.id ? (
            <button
              onClick={() => {
                setTeamForm(emptyTeam);
                setTeamLogoFile(null);
              }}
              className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"
            >
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
              {sportOptions.map((sport) => (
                <option key={sport} value={sport}>
                  {sport}
                </option>
              ))}
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
          <label>
            <span className={labelClass()}>Team logo</span>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setTeamLogoFile(event.target.files?.[0] ?? null)}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-blue-700"
            />
          </label>
          <div className="flex items-end md:col-span-2">
            <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              {teamForm.id ? <Save size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
              {teamForm.id ? "Save team" : "Add team"}
            </button>
          </div>
        </form>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.teams.map((team) => (
            <div key={team.id} className="rounded-lg border border-slate-200 p-4">
              <p className="font-bold text-slate-900">{team.name}</p>
              <p className="text-sm text-slate-400">
                {team.sport} - {team.group}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => {
                    setTeamForm({ ...team, logoUrl: team.logoUrl ?? "" });
                    setTeamLogoFile(null);
                  }}
                  className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold"
                >
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
          {sportBadge(playerFormSport)}
          {playerForm.id ? (
            <button
              onClick={() => {
                setPlayerForm({ ...emptyPlayer, teamId: teamOptions[0]?.id ?? "" });
                setPlayerPhotoFile(null);
              }}
              className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"
            >
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
          <label>
            <span className={labelClass()}>Photo</span>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setPlayerPhotoFile(event.target.files?.[0] ?? null)}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-blue-700"
            />
          </label>
          {playerFormStats.map((stat) => (
            <label key={stat}>
              <span className={labelClass()}>{playerStatLabels[stat]}</span>
              <input type="number" value={playerForm[stat]} onChange={(event) => setPlayerForm({ ...playerForm, [stat]: Number(event.target.value) })} className={inputClass()} />
            </label>
          ))}
          <div className="flex items-end md:col-span-2">
            <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
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
                <p className="font-bold text-slate-900">
                  #{player.number} {player.name}
                </p>
                <p className="text-sm text-slate-400">
                  {team?.name} - {team?.sport === "Football" ? player.stats.goals : player.stats.points} points / goals
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
          {sectionTitle("QR links", "Public match and court QR destinations for printing and sharing.")}
          <Link href="/qr-print" className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-black text-blue-700 hover:bg-blue-100">
            Printable QR page
          </Link>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200 p-4">
            <h3 className="font-black text-slate-900">Match pages</h3>
            <div className="mt-3 grid gap-2">
              {data.matches.map((match) => {
                const home = data.teams.find((team) => team.id === match.homeTeamId);
                const away = data.teams.find((team) => team.id === match.awayTeamId);
                return (
                  <Link key={match.id} href={`/matches/${match.id}`} className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">
                    {home?.name} vs {away?.name} - {match.court}
                  </Link>
                );
              })}
              {data.matches.length === 0 ? <p className="text-sm text-slate-400">No matches available.</p> : null}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 p-4">
            <h3 className="font-black text-slate-900">Court pages</h3>
            <div className="mt-3 grid gap-2">
              {courtOptions.map((court) => (
                <Link key={court.hallSlug} href={`/court/${court.hallSlug}`} className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">
                  {court.court}
                </Link>
              ))}
              {courtOptions.length === 0 ? <p className="text-sm text-slate-400">No courts available.</p> : null}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          {sectionTitle("Matches", "Create, edit, and delete match records. Scores can also be edited here or in the score panel.")}
          {sportBadge(matchFormSport)}
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
            <select
              value={matchForm.homeTeamId || teamOptions[0]?.id || ""}
              onChange={(event) => {
                const nextTeam = data.teams.find((team) => team.id === event.target.value);
                const nextSport = nextTeam?.sport ?? matchFormSport;
                setMatchForm({
                  ...matchForm,
                  homeTeamId: event.target.value,
                  periodLabel: periodOptionsBySport[nextSport][0],
                  matchMinute: nextSport === "Football" ? matchForm.matchMinute : ""
                });
              }}
              className={inputClass()}
            >
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
            <select value={matchForm.periodLabel} onChange={(event) => setMatchForm({ ...matchForm, periodLabel: event.target.value })} className={inputClass()}>
              {matchPeriodOptions.map((period) => (
                <option key={period} value={period}>
                  {period}
                </option>
              ))}
            </select>
          </label>
          {matchFormSport === "Football" ? (
          <label>
            <span className={labelClass()}>Match minute</span>
            <input value={matchForm.matchMinute ?? ""} onChange={(event) => setMatchForm({ ...matchForm, matchMinute: event.target.value })} className={inputClass()} placeholder="12' or 45+2'" />
          </label>
          ) : null}
          <label>
            <span className={labelClass()}>Clock label</span>
            <input
              value={matchForm.clockLabel ?? ""}
              onChange={(event) => setMatchForm({ ...matchForm, clockLabel: event.target.value })}
              className={inputClass()}
              placeholder={matchFormSport === "Football" ? "37', 45+2', HT" : matchFormSport === "Basketball" ? "Q1 08:42" : "Set 1"}
            />
          </label>
          <label className="md:col-span-2">
            <span className={labelClass()}>YouTube live/video URL</span>
            <input value={matchForm.youtubeUrl ?? ""} onChange={(event) => setMatchForm({ ...matchForm, youtubeUrl: event.target.value })} className={inputClass()} placeholder="https://www.youtube.com/watch?v=..." />
          </label>
          <label className="md:col-span-2">
            <span className={labelClass()}>Report</span>
            <input value={matchForm.report ?? ""} onChange={(event) => setMatchForm({ ...matchForm, report: event.target.value })} className={inputClass()} />
          </label>
          <div className="flex items-end">
            <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
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
                <p className="font-bold text-slate-900">
                  {home?.name} vs {away?.name}
                </p>
                <p className="text-sm text-slate-400">
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

      {selectedEventSport === "Football" ? (
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          {sectionTitle("Live timeline", "Add football goals, cards, and substitutions for the selected tournament. Public match pages read these events live.")}
        </div>
        <form onSubmit={submitEvent} className="grid gap-4 md:grid-cols-6">
          <label className="md:col-span-2">
            <span className={labelClass()}>Match</span>
            <select
              value={selectedEventMatch?.id ?? ""}
              onChange={(event) => setEventForm({ ...eventForm, matchId: event.target.value, teamId: "", playerId: "" })}
              className={inputClass()}
            >
              {eventMatches.map((match) => {
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
            <span className={labelClass()}>Type</span>
            <select value={eventForm.type} onChange={(event) => setEventForm({ ...eventForm, type: event.target.value as MatchEventType })} className={inputClass()}>
              <option value="goal">Goal</option>
              <option value="yellow">Yellow card</option>
              <option value="red">Red card</option>
              <option value="substitution">Substitution</option>
            </select>
          </label>
          <label>
            <span className={labelClass()}>Minute</span>
            <input value={eventForm.minute} onChange={(event) => setEventForm({ ...eventForm, minute: event.target.value })} className={inputClass()} placeholder="12' or 45+2'" />
          </label>
          <label>
            <span className={labelClass()}>Team</span>
            <select value={eventForm.teamId ?? ""} onChange={(event) => setEventForm({ ...eventForm, teamId: event.target.value, playerId: "" })} className={inputClass()}>
              <option value="">No team</option>
              {eventTeamOptions.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelClass()}>Player</span>
            <select value={eventForm.playerId ?? ""} onChange={(event) => setEventForm({ ...eventForm, playerId: event.target.value })} className={inputClass()}>
              <option value="">No player</option>
              {eventPlayerOptions.map((player) => (
                <option key={player.id} value={player.id}>
                  #{player.number} {player.name}
                </option>
              ))}
            </select>
          </label>
          <label className="md:col-span-4">
            <span className={labelClass()}>Description</span>
            <input value={eventForm.description ?? ""} onChange={(event) => setEventForm({ ...eventForm, description: event.target.value })} className={inputClass()} />
          </label>
          <div className="flex items-end md:col-span-2">
            <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              <Plus size={16} aria-hidden="true" />
              Add event
            </button>
          </div>
        </form>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {matchEvents.map((event) => {
            const team = event.teamId ? data.teams.find((item) => item.id === event.teamId) : null;
            const player = event.playerId ? data.players.find((item) => item.id === event.playerId) : null;
            return (
              <div key={event.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-4">
                <div>
                  <p className="font-bold text-slate-900">
                    {event.minute} - {event.type}
                  </p>
                  <p className="text-sm text-slate-400">
                    {[team?.name, player?.name, event.description].filter(Boolean).join(" - ") || "Timeline event"}
                  </p>
                </div>
                <button onClick={() => removeEvent(event.id)} className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-700">
                  <Trash2 size={14} aria-hidden="true" />
                  Delete
                </button>
              </div>
            );
          })}
        </div>
        {eventMatches.length === 0 ? <p className="mt-4 text-sm text-slate-400">Create a match before adding timeline events.</p> : null}
      </section>
      ) : null}

        </>
      ) : null}

      {canScore ? (
      <>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          {sectionTitle("Scores", "Fast score update panel for live scoring.")}
          {sportBadge(selectedScoreSport)}
        </div>
        <form key={`${selectedScoreMatch?.id ?? "none"}-${selectedScoreMatch?.homeScore ?? 0}-${selectedScoreMatch?.awayScore ?? 0}-${selectedScoreMatch?.status ?? ""}-${selectedScoreMatch?.periodLabel ?? ""}-${selectedScoreMatch?.matchMinute ?? ""}-${selectedScoreMatch?.clockLabel ?? ""}-${selectedScoreMatch?.clockRunning ?? false}`} onSubmit={submitScore} className="mt-5 grid gap-4 md:grid-cols-5">
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
            <select name="periodLabel" defaultValue={selectedScoreMatch?.periodLabel ?? scorePeriodOptions[0]} className={inputClass()}>
              {scorePeriodOptions.map((period) => (
                <option key={period} value={period}>
                  {period}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelClass()}>{selectedScoreSport === "Football" ? "Special clock override" : "Clock label"}</span>
            <input
              name="clockLabel"
              defaultValue={
                selectedScoreSport === "Football"
                  ? isFootballClockOverride(selectedScoreMatch?.clockLabel) ? selectedScoreMatch?.clockLabel : ""
                  : selectedScoreMatch ? formatMatchClock(selectedScoreMatch) : ""
              }
              className={inputClass()}
              placeholder={selectedScoreSport === "Football" ? "HT, FT, Extra time, Penalties" : selectedScoreSport === "Basketball" ? "Q1 08:42" : "Set 1"}
            />
            {selectedScoreSport === "Football" ? <span className="mt-1 block text-xs font-semibold text-slate-400">Leave blank during normal play. The timer generates 1&apos;, 45+1&apos;, and 90+3&apos; automatically.</span> : null}
          </label>
          {selectedScoreSport === "Basketball" ? (
          <label>
            <span className={labelClass()}>Countdown length</span>
            <input name="clockCountdownSeconds" type="number" min={1} defaultValue={selectedScoreMatch?.clockCountdownSeconds ?? getBasketballDefaultSeconds()} className={inputClass()} />
          </label>
          ) : null}
          <label className="flex items-end gap-2 pb-2">
            <input name="clockRunning" type="checkbox" defaultChecked={selectedScoreMatch?.clockRunning ?? false} className="h-4 w-4 rounded border-slate-300" />
            <span className={labelClass()}>Clock running</span>
          </label>
          <div className="flex flex-wrap items-end gap-2 md:col-span-3">
            <button type="button" onClick={() => applyClockAction("start")} className="rounded-lg border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50">
              Start clock
            </button>
            <button type="button" onClick={() => applyClockAction("pause")} className="rounded-lg border border-amber-200 px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50">
              Pause clock
            </button>
            <button type="button" onClick={() => applyClockAction("resume")} className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">
              Resume clock
            </button>
            <button type="button" onClick={() => applyClockAction("reset")} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Reset clock
            </button>
            <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              <Save size={16} aria-hidden="true" />
              Save score
            </button>
          </div>
        </form>
        {scoreMatches.length === 0 ? <p className="mt-4 text-sm text-slate-400">No matches are available.</p> : null}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          {sectionTitle("Live player stats", "Update player totals and the match score from one panel.")}
          <div className="flex flex-wrap gap-2">
            {sportBadge(selectedPlayerStatSport)}
            {selectedPlayerStatMatch ? (
              <div className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700">
                {selectedPlayerStatMatchTeams[0]?.name ?? "Home"} {selectedPlayerStatMatch.homeScore}-{selectedPlayerStatMatch.awayScore}{" "}
                {selectedPlayerStatMatchTeams[1]?.name ?? "Away"}
              </div>
            ) : null}
          </div>
        </div>
        <label className="block max-w-xl">
          <span className={labelClass()}>Match</span>
          <select value={selectedPlayerStatMatch?.id ?? ""} onChange={(event) => setSelectedPlayerStatMatchId(event.target.value)} className={inputClass()}>
            {data.matches.map((match) => {
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
        {selectedPlayerStatMatch ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {selectedPlayerStatMatchTeams.map((team) => (
              <div key={team.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-bold text-slate-900">{team.name}</p>
                    <p className="text-sm text-slate-400">{team.sport}</p>
                  </div>
                  <span className="rounded-lg bg-slate-50 px-3 py-1.5 text-sm font-bold text-slate-700">
                    {team.id === selectedPlayerStatMatch.homeTeamId ? selectedPlayerStatMatch.homeScore : selectedPlayerStatMatch.awayScore}
                  </span>
                </div>
                <div className="mt-4 divide-y divide-slate-100">
                  {selectedPlayerStatMatchPlayers
                    .filter((player) => player.teamId === team.id)
                    .map((player) => (
                      <div key={player.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">
                            #{player.number} {player.name}
                          </p>
                          <p className="text-sm font-semibold text-slate-500">
                            {playerStatsBySport[selectedPlayerStatSport].map((stat) => `${player.stats[stat]} ${playerStatLabels[stat].toLowerCase()}`).join(" - ")}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {selectedPlayerQuickStats.map((stat) => (
                            <button
                              key={stat}
                              type="button"
                              onClick={() => addLivePlayerStat(player, stat)}
                              className="rounded-lg border border-blue-200 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                            >
                              {liveButtonLabel(stat)}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-400">No matches are available.</p>
        )}
      </section>
      </>
      ) : null}
      {canManageAll ? (
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          {sectionTitle("Club admins", "Assign an existing user to manage one team roster and branding.")}
        </div>
        <form onSubmit={submitClubAdminAssignment} className="grid gap-4 md:grid-cols-4">
          <label className="md:col-span-2">
            <span className={labelClass()}>User email</span>
            <input
              type="email"
              value={clubAdminEmail}
              onChange={(event) => setClubAdminEmail(event.target.value)}
              className={inputClass()}
              placeholder="club@example.com"
            />
          </label>
          <label>
            <span className={labelClass()}>Team</span>
            <select value={clubAdminTeamId || teamOptions[0]?.id || ""} onChange={(event) => setClubAdminTeamId(event.target.value)} className={inputClass()}>
              {teamOptions.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              <Save size={16} aria-hidden="true" />
              Assign club admin
            </button>
          </div>
        </form>
        <p className="mt-3 text-sm text-slate-400">The user must already have a Supabase auth account. This assignment also changes their profile role to club_admin.</p>
        <div className="mt-5 overflow-hidden rounded-lg border border-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">User email</th>
                  <th className="px-4 py-3">Assigned team</th>
                  <th className="px-4 py-3">Tournament</th>
                  <th className="px-4 py-3">Created date</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {clubAdminAssignments.map((assignment) => {
                  const team = data.teams.find((item) => item.id === assignment.teamId);
                  const tournament = data.tournaments.find((item) => item.id === assignment.tournamentId);
                  return (
                    <tr key={`${assignment.userId}-${assignment.teamId}`}>
                      <td className="px-4 py-3 font-semibold text-slate-900">{assignment.email || assignment.userId}</td>
                      <td className="px-4 py-3 text-slate-600">{team?.name ?? assignment.teamId}</td>
                      <td className="px-4 py-3 text-slate-600">{tournament?.name ?? assignment.tournamentId}</td>
                      <td className="px-4 py-3 text-slate-600">{assignment.createdAt ? new Date(assignment.createdAt).toLocaleString() : "-"}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => void removeClubAdmin(assignment.userId, assignment.teamId, assignment.email)}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50"
                        >
                          <Trash2 size={14} aria-hidden="true" />
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {clubAdminAssignments.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-slate-400" colSpan={5}>
                      No club admin assignments yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      ) : null}
    </div>
  );
}
