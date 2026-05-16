"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import { AlertCircle, CheckCircle2, Copy, Lock, LogOut, Mail, MessageCircle, Moon, Pencil, Plus, Save, Sun, Trash2, Unlock, X } from "lucide-react";
import { createId, getMatchTeamStats } from "@/lib/data-store";
import { disciplinaryRowForPlayer, disciplinaryRows, readYellowCardSuspensionThreshold, yellowCardSuspensionThresholdStorageKey } from "@/lib/disciplinary";
import { formatMatchClock, getBasketballDefaultSeconds, getClockStateForAction, isFootballClockOverride } from "@/lib/match-clock";
import {
  playerStatLabels,
  playerStatsBySport,
  matchTeamStatKeys,
  matchTeamStatLabels,
  matchPhaseOptions,
  officialRoleOptions,
  sportOptions,
  tournamentSportOptions,
  tournamentApplicationStatusOptions,
  type Match,
  type MatchEvent,
  type MatchLineupEntry,
  type MatchLineupRole,
  type MatchTeamStatKey,
  type MatchEventType,
  type MatchPhase,
  type MatchStatus,
  type Official,
  type OfficialRole,
  type Player,
  type PlayerStatKey,
  type Sport,
  type Team,
  type Tournament,
  type TournamentApplication,
  type TournamentApplicationStatus,
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
  squadRole: MatchLineupRole;
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
type OfficialForm = Pick<Official, "id" | "name" | "role" | "country" | "city" | "photoUrl">;
type MatchForm = Pick<
  Match,
  "id" | "homeTeamId" | "awayTeamId" | "date" | "time" | "court" | "status" | "homeScore" | "awayScore" | "periodLabel" | "matchMinute" | "clockLabel" | "clockRunning" | "youtubeUrl" | "report" | "phase" | "roundLabel"
>;
type TournamentForm = Pick<Tournament, "id" | "name" | "sportType" | "location" | "startDate" | "endDate" | "status" | "logoUrl" | "primaryColor" | "sponsorName" | "sponsorLogoUrl">;
type EventForm = Pick<MatchEvent, "matchId" | "teamId" | "playerId" | "type" | "minute" | "description">;
type SubstitutionForm = {
  matchId: string;
  teamId: string;
  playerOutId: string;
  playerInId: string;
  minute: string;
};

const emptyTournament: TournamentForm = {
  id: "",
  name: "",
  sportType: "Mixed",
  location: "",
  startDate: "",
  endDate: "",
  status: "Live",
  logoUrl: "",
  primaryColor: "#2563eb",
  sponsorName: "",
  sponsorLogoUrl: ""
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
  squadRole: "reserve",
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

const emptyOfficial: OfficialForm = {
  id: "",
  name: "",
  role: "referee",
  country: "",
  city: "",
  photoUrl: ""
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
  phase: "Group Stage",
  roundLabel: "",
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

const emptySubstitution: SubstitutionForm = {
  matchId: "",
  teamId: "",
  playerOutId: "",
  playerInId: "",
  minute: ""
};

const periodOptionsBySport: Record<Sport, string[]> = {
  Football: ["First Half", "Half Time", "Second Half", "Full Time"],
  Basketball: ["Q1", "Q2", "Half Time", "Q3", "Q4", "Final"],
  Volleyball: ["Set 1", "Set 2", "Set 3", "Set 4", "Set 5", "Final"]
};

type AdminSection =
  | "overview"
  | "tournaments"
  | "teams"
  | "players"
  | "roster_approvals"
  | "applications"
  | "officials"
  | "matches"
  | "bracket_phases"
  | "disciplinary"
  | "lineups"
  | "live_scoring"
  | "timeline"
  | "match_stats"
  | "fixture_builder"
  | "club_admins"
  | "reports";

const adminSections: { id: AdminSection; label: string; scorer?: boolean; adminOnly?: boolean }[] = [
  { id: "overview", label: "Overview" },
  { id: "tournaments", label: "Tournaments", adminOnly: true },
  { id: "teams", label: "Teams", adminOnly: true },
  { id: "players", label: "Players", adminOnly: true },
  { id: "roster_approvals", label: "Roster Approvals", adminOnly: true },
  { id: "applications", label: "Applications", adminOnly: true },
  { id: "officials", label: "Officials", adminOnly: true },
  { id: "matches", label: "Matches", adminOnly: true },
  { id: "bracket_phases", label: "Bracket / Phases", adminOnly: true },
  { id: "disciplinary", label: "Disciplinary", adminOnly: true },
  { id: "lineups", label: "Lineups", scorer: true },
  { id: "live_scoring", label: "Live Scoring", scorer: true },
  { id: "timeline", label: "Timeline Events", adminOnly: true },
  { id: "match_stats", label: "Match Stats", scorer: true },
  { id: "fixture_builder", label: "Fixture Builder", adminOnly: true },
  { id: "club_admins", label: "Club Admins", adminOnly: true },
  { id: "reports", label: "Reports", adminOnly: true }
];

const adminSectionGroups: {
  title: string;
  description: string;
  sections: AdminSection[];
  links?: { label: string; href: string }[];
}[] = [
  {
    title: "Overview",
    description: "Dashboard summary and quick actions.",
    sections: ["overview"]
  },
  {
    title: "Tournament Setup",
    description: "Build the event structure before matchday.",
    sections: ["tournaments", "fixture_builder", "bracket_phases"]
  },
  {
    title: "Teams & Rosters",
    description: "Manage clubs, players, lineups, and approvals.",
    sections: ["teams", "players", "lineups", "club_admins", "roster_approvals", "applications"]
  },
  {
    title: "Match Operations",
    description: "Run fixtures, live scoring, stats, and officials.",
    sections: ["matches", "live_scoring", "timeline", "match_stats", "officials", "disciplinary"]
  },
  {
    title: "Reports & Media",
    description: "Printable outputs, QR sharing, and match sheets.",
    sections: ["reports"],
    links: [{ label: "QR Print", href: "/qr-print" }]
  }
];

const adminDarkModeStorageKey = "orso-admin-dark-mode";
const lineupFormations = ["4-3-3", "4-4-2", "3-5-2", "4-2-3-1", "3-4-3"] as const;
type LineupFormation = (typeof lineupFormations)[number];
type LineupPosition = { x: number; y: number };

function clampPercent(value: number) {
  return Math.max(7, Math.min(93, value));
}

function spreadLine(count: number, y: number) {
  return Array.from({ length: count }, (_, index) => ({
    x: count === 1 ? 50 : 18 + (index * 64) / (count - 1),
    y
  }));
}

function formationShape(formation: string) {
  const known: Record<string, number[]> = {
    "4-3-3": [1, 4, 3, 3],
    "4-4-2": [1, 4, 4, 2],
    "3-5-2": [1, 3, 5, 2],
    "4-2-3-1": [1, 4, 2, 3, 1],
    "3-4-3": [1, 3, 4, 3]
  };
  return known[formation] ?? known["4-3-3"];
}

function formationPositions(formation: string) {
  const shape = formationShape(formation);
  const yByLine = shape.length === 5 ? [88, 70, 56, 38, 20] : [88, 68, 46, 22];
  return shape.flatMap((count, index) => spreadLine(count, yByLine[index] ?? 50)).slice(0, 11);
}

function autoArrangePositions(players: Player[], roles: Record<string, MatchLineupRole>, formation: string, existing: Record<string, LineupPosition>) {
  const starters = players.filter((player) => roles[player.id] === "starting");
  const preset = formationPositions(formation);
  const next = { ...existing };

  starters.slice(0, 11).forEach((player, index) => {
    next[player.id] = preset[index] ?? { x: 50, y: 50 };
  });

  return next;
}

function roleRank(role: MatchLineupRole) {
  if (role === "starting") return 0;
  if (role === "substitute") return 1;
  return 2;
}

function labelClass() {
  return "text-sm font-bold text-slate-700";
}

function inputClass() {
  return "orso-input mt-2";
}

function sectionTitle(title: string, description: string) {
  return (
    <div className="min-w-0">
      <h2 className="text-lg font-black tracking-tight text-slate-950">{title}</h2>
      <p className="mt-1 max-w-3xl text-sm font-medium leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function sportBadge(sport: Sport) {
  return <span className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-black text-blue-700 ring-1 ring-blue-100">{sport} mode</span>;
}

function rosterStatusBadge(team: Team) {
  const status = team.rosterStatus ?? "Draft";
  const className =
    status === "Approved"
      ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
      : status === "Submitted"
        ? "bg-blue-100 text-blue-700 ring-blue-200"
        : status === "Needs changes"
          ? "bg-amber-100 text-amber-700 ring-amber-200"
          : "bg-slate-100 text-slate-600 ring-slate-200";

  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ring-1", className)}>
      {team.rosterLocked ? <Lock size={12} aria-hidden="true" /> : null}
      {status}
    </span>
  );
}

function applicationStatusBadge(status: TournamentApplicationStatus) {
  const className =
    status === "accepted"
      ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
      : status === "rejected"
        ? "bg-red-100 text-red-700 ring-red-200"
        : status === "contacted" || status === "waiting_for_confirmation"
          ? "bg-blue-100 text-blue-700 ring-blue-200"
          : "bg-slate-100 text-slate-600 ring-slate-200";

  return <span className={clsx("rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ring-1", className)}>{status.replace(/_/g, " ")}</span>;
}

function whatsappHref(phone: string) {
  const digits = phone.replace(/[^\d]/g, "");
  return digits ? `https://wa.me/${digits}` : "";
}

function applicationFollowUpMessage(application: { nameSurname: string; club: string; ageGroup: string }, tournamentName: string) {
  return [
    `Hello ${application.nameSurname},`,
    "",
    `Thank you for your interest in joining ${tournamentName}. We received the participation request for ${application.club} (${application.ageGroup}).`,
    "",
    "Please confirm your team details and availability so we can continue the registration process.",
    "",
    "Orso Live Scores"
  ].join("\n");
}

function applicationMailto(email: string, subject: string, body: string) {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function applicationWhatsappHref(phone: string, message: string) {
  const base = whatsappHref(phone);
  return base ? `${base}?text=${encodeURIComponent(message)}` : "";
}

function periodOptionsForSport(sport: Sport, current?: string) {
  const options = periodOptionsBySport[sport];
  return current && !options.includes(current) ? [current, ...options] : options;
}

function LineupPitchEditor({
  players,
  roles,
  positions,
  selectedPlayerId,
  swapPlayerId,
  onSelectPlayer,
  onMovePlayer,
  onSwapPlayers
}: {
  players: Player[];
  roles: Record<string, MatchLineupRole>;
  positions: Record<string, LineupPosition>;
  selectedPlayerId: string;
  swapPlayerId: string;
  onSelectPlayer: (playerId: string) => void;
  onMovePlayer: (playerId: string, position: LineupPosition) => void;
  onSwapPlayers: (firstPlayerId: string, secondPlayerId: string) => void;
}) {
  const pitchRef = useRef<HTMLDivElement | null>(null);
  const [draggingPlayerId, setDraggingPlayerId] = useState("");
  const activePlayers = players
    .filter((player) => roles[player.id] === "starting" && positions[player.id])
    .sort((first, second) => (positions[first.id]?.y ?? 0) - (positions[second.id]?.y ?? 0));

  function positionFromPointer(event: React.PointerEvent | React.MouseEvent | React.DragEvent) {
    const rect = pitchRef.current?.getBoundingClientRect();
    if (!rect) return null;

    return {
      x: clampPercent(((event.clientX - rect.left) / rect.width) * 100),
      y: clampPercent(((event.clientY - rect.top) / rect.height) * 100)
    };
  }

  function placeSelected(event: React.PointerEvent<HTMLDivElement>) {
    if (!selectedPlayerId || draggingPlayerId) return;
    const position = positionFromPointer(event);
    if (position) onMovePlayer(selectedPlayerId, position);
  }

  function moveDragged(event: React.PointerEvent<HTMLDivElement>) {
    if (!draggingPlayerId) return;
    const position = positionFromPointer(event);
    if (position) onMovePlayer(draggingPlayerId, position);
  }

  return (
    <div className="rounded-xl border border-emerald-200 bg-white p-3 shadow-[0_18px_42px_rgba(5,150,105,0.10)]">
      <div
        ref={pitchRef}
        onPointerDown={placeSelected}
        onPointerMove={moveDragged}
        onPointerUp={() => setDraggingPlayerId("")}
        onPointerCancel={() => setDraggingPlayerId("")}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const playerId = event.dataTransfer.getData("text/plain");
          const position = positionFromPointer(event);
          if (playerId && position) onMovePlayer(playerId, position);
        }}
        className="relative mx-auto aspect-[68/105] min-h-[34rem] max-h-[48rem] w-full touch-none overflow-hidden rounded-lg border border-emerald-900/20 bg-emerald-700 text-white sm:aspect-[68/96]"
      >
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.07)_0_12.5%,rgba(255,255,255,0.02)_12.5%_25%,rgba(255,255,255,0.07)_25%_37.5%,rgba(255,255,255,0.02)_37.5%_50%,rgba(255,255,255,0.07)_50%_62.5%,rgba(255,255,255,0.02)_62.5%_75%,rgba(255,255,255,0.07)_75%_87.5%,rgba(255,255,255,0.02)_87.5%_100%),linear-gradient(180deg,#167a3a,#0f6f39_48%,#0b5f34)]" />
        <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(rgba(255,255,255,0.18)_0.7px,transparent_0.7px)] [background-size:9px_9px]" />
        <div className="absolute inset-[4%] rounded-sm border-2 border-white/55" />
        <div className="absolute left-[4%] right-[4%] top-1/2 h-0.5 -translate-y-1/2 bg-white/55" />
        <div className="absolute left-1/2 top-1/2 h-[18%] w-[28%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/55" />
        <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70" />
        <div className="absolute left-1/2 top-[4%] h-[15%] w-[50%] -translate-x-1/2 border-x-2 border-b-2 border-white/55" />
        <div className="absolute left-1/2 top-[4%] h-[7%] w-[23%] -translate-x-1/2 border-x-2 border-b-2 border-white/55" />
        <div className="absolute left-1/2 top-[2.2%] h-[2.2%] w-[18%] -translate-x-1/2 rounded-t-sm border-x-2 border-t-2 border-white/55" />
        <div className="absolute bottom-[4%] left-1/2 h-[15%] w-[50%] -translate-x-1/2 border-x-2 border-t-2 border-white/55" />
        <div className="absolute bottom-[4%] left-1/2 h-[7%] w-[23%] -translate-x-1/2 border-x-2 border-t-2 border-white/55" />
        <div className="absolute bottom-[2.2%] left-1/2 h-[2.2%] w-[18%] -translate-x-1/2 rounded-b-sm border-x-2 border-b-2 border-white/55" />

        {activePlayers.map((player) => {
          const position = positions[player.id];
          return (
            <button
              key={player.id}
              type="button"
              draggable
              onDragStart={(event) => event.dataTransfer.setData("text/plain", player.id)}
              onPointerDown={(event) => {
                event.stopPropagation();
                onSelectPlayer(player.id);
                setDraggingPlayerId(player.id);
              }}
              onClick={(event) => {
                event.stopPropagation();
                if (swapPlayerId && swapPlayerId !== player.id) {
                  onSwapPlayers(swapPlayerId, player.id);
                } else {
                  onSelectPlayer(player.id);
                }
              }}
              className={clsx(
                "absolute z-[2] w-[5.2rem] -translate-x-1/2 -translate-y-1/2 touch-none text-center transition",
                selectedPlayerId === player.id && "scale-105",
                swapPlayerId === player.id && "scale-105"
              )}
              style={{ left: `${position.x}%`, top: `${position.y}%` }}
            >
              <span className={clsx("mx-auto flex h-10 w-10 items-center justify-center rounded-full shadow-[0_8px_22px_rgba(15,23,42,0.28)] ring-2", selectedPlayerId === player.id ? "bg-blue-600 ring-white" : "bg-white ring-blue-500/75")}>
                <span className={clsx("text-sm font-black", selectedPlayerId === player.id ? "text-white" : "text-blue-700")}>{player.number || "P"}</span>
              </span>
              <span className="mt-1 block truncate rounded-full border border-white/15 bg-slate-950/60 px-2 py-1 text-[0.66rem] font-black leading-tight text-white shadow-sm backdrop-blur">
                {player.name}
              </span>
            </button>
          );
        })}

        {activePlayers.length === 0 ? (
          <div className="absolute inset-0 z-[2] flex items-center justify-center p-6 text-center">
            <p className="rounded-lg border border-white/20 bg-black/25 px-4 py-3 text-sm font-black text-white/85 backdrop-blur">Set starters, then choose a formation or place players manually.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
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
    saveOfficial,
    removeOfficial,
    saveMatch,
    removeMatch,
    saveScore,
    savePlayerMatchStat,
    saveMatchTeamStats,
    saveMatchLineups,
    saveMatchOfficials,
    saveEvent,
    removeEvent,
    saveTournamentApplicationFollowUp,
    removeTournamentApplication,
    assignClubAdmin,
    removeClubAdminAssignment,
    clubAdminAssignments
  } = useTournamentData();
  const [tournamentForm, setTournamentForm] = useState<TournamentForm>(emptyTournament);
  const [teamForm, setTeamForm] = useState<TeamForm>(emptyTeam);
  const [teamLogoFile, setTeamLogoFile] = useState<File | null>(null);
  const [playerForm, setPlayerForm] = useState<PlayerForm>(() => ({ ...emptyPlayer, teamId: data.teams[0]?.id ?? "" }));
  const [playerPhotoFile, setPlayerPhotoFile] = useState<File | null>(null);
  const [officialForm, setOfficialForm] = useState<OfficialForm>(emptyOfficial);
  const [selectedOfficialsMatchId, setSelectedOfficialsMatchId] = useState(() => data.matches[0]?.id ?? "");
  const [selectedOfficialIds, setSelectedOfficialIds] = useState<string[]>([]);
  const [matchForm, setMatchForm] = useState<MatchForm>(() => ({
    ...emptyMatch,
    homeTeamId: data.teams[0]?.id ?? "",
    awayTeamId: data.teams[1]?.id ?? data.teams[0]?.id ?? ""
  }));
  const [selectedScoreMatchId, setSelectedScoreMatchId] = useState(() => data.matches[0]?.id ?? "");
  const [selectedPlayerStatMatchId, setSelectedPlayerStatMatchId] = useState(() => data.matches[0]?.id ?? "");
  const [selectedTeamStatsMatchId, setSelectedTeamStatsMatchId] = useState(() => data.matches[0]?.id ?? "");
  const [selectedLineupMatchId, setSelectedLineupMatchId] = useState(() => data.matches[0]?.id ?? "");
  const [selectedLineupTeamId, setSelectedLineupTeamId] = useState("");
  const [eventForm, setEventForm] = useState<EventForm>(() => ({ ...emptyEvent, matchId: data.matches[0]?.id ?? "" }));
  const [substitutionForm, setSubstitutionForm] = useState<SubstitutionForm>(() => ({ ...emptySubstitution, matchId: data.matches[0]?.id ?? "" }));
  const [clubAdminEmail, setClubAdminEmail] = useState("");
  const [clubAdminTeamId, setClubAdminTeamId] = useState("");
  const [rosterReviewNotes, setRosterReviewNotes] = useState<Record<string, string>>({});
  const [applicationNotes, setApplicationNotes] = useState<Record<string, string>>({});
  const [applicationTournamentFilter, setApplicationTournamentFilter] = useState("all");
  const [applicationStatusFilter, setApplicationStatusFilter] = useState<"all" | TournamentApplicationStatus>("all");
  const [applicationAgeGroupFilter, setApplicationAgeGroupFilter] = useState("all");
  const [message, setMessage] = useState("CMS data syncs to the shared tournament store.");
  const [clockPreviewNow, setClockPreviewNow] = useState(0);
  const [activeAdminSection, setActiveAdminSection] = useState<AdminSection>("overview");
  const [adminDarkMode, setAdminDarkMode] = useState(() => (typeof window === "undefined" ? false : window.localStorage.getItem(adminDarkModeStorageKey) === "true"));
  const [compactScorerMode, setCompactScorerMode] = useState(false);
  const [lineupFormation, setLineupFormation] = useState<LineupFormation>("4-3-3");
  const [lineupRoles, setLineupRoles] = useState<Record<string, MatchLineupRole>>({});
  const [lineupPositions, setLineupPositions] = useState<Record<string, LineupPosition>>({});
  const [selectedPitchPlayerId, setSelectedPitchPlayerId] = useState("");
  const [swapPlayerId, setSwapPlayerId] = useState("");
  const [yellowSuspensionThreshold, setYellowSuspensionThreshold] = useState(readYellowCardSuspensionThreshold);

  const teamOptions = useMemo(() => data.teams, [data.teams]);
  const rosterApprovalTeams = useMemo(
    () =>
      [...data.teams]
        .filter((team) => !team.tournamentId || team.tournamentId === selectedTournamentId)
        .sort((first, second) => {
          const rank = { Submitted: 0, "Needs changes": 1, Approved: 2, Draft: 3 } as Record<string, number>;
          return (rank[first.rosterStatus ?? "Draft"] ?? 3) - (rank[second.rosterStatus ?? "Draft"] ?? 3) || first.name.localeCompare(second.name);
        }),
    [data.teams, selectedTournamentId]
  );
  const courtOptions = useMemo(
    () =>
      Array.from(new Map(data.matches.map((match) => [match.hallSlug, { hallSlug: match.hallSlug, court: match.court }])).values()).sort((first, second) =>
        first.court.localeCompare(second.court)
      ),
    [data.matches]
  );
  const selectedTournament = data.tournaments.find((tournament) => tournament.id === selectedTournamentId);
  const selectedTournamentSport = selectedTournament?.sportType !== "Mixed" ? selectedTournament?.sportType : undefined;
  const filteredApplications = data.tournamentApplications.filter(
    (application) =>
      (applicationTournamentFilter === "all" || application.tournamentId === applicationTournamentFilter) &&
      (applicationStatusFilter === "all" || application.status === applicationStatusFilter) &&
      (applicationAgeGroupFilter === "all" || application.ageGroup === applicationAgeGroupFilter)
  );
  const applicationAgeGroups = Array.from(
    new Set(
      data.tournamentApplications
        .filter((application) => applicationTournamentFilter === "all" || application.tournamentId === applicationTournamentFilter)
        .map((application) => application.ageGroup)
        .filter(Boolean)
    )
  ).sort((first, second) => first.localeCompare(second));
  const scoreMatches = data.matches;
  const selectedScoreMatch = scoreMatches.find((match) => match.id === selectedScoreMatchId) ?? scoreMatches[0];
  const selectedPlayerStatMatch = data.matches.find((match) => match.id === selectedPlayerStatMatchId) ?? data.matches[0];
  const selectedTeamStatsMatch = data.matches.find((match) => match.id === selectedTeamStatsMatchId) ?? data.matches[0];
  const selectedLineupMatch = data.matches.find((match) => match.id === selectedLineupMatchId) ?? data.matches[0];
  const selectedLineupTeamOptions = selectedLineupMatch
    ? data.teams.filter((team) => team.id === selectedLineupMatch.homeTeamId || team.id === selectedLineupMatch.awayTeamId)
    : [];
  const selectedLineupTeam = selectedLineupTeamOptions.find((team) => team.id === selectedLineupTeamId) ?? selectedLineupTeamOptions[0];
  const selectedLineupPlayers = selectedLineupTeam ? data.players.filter((player) => player.teamId === selectedLineupTeam.id) : [];
  const selectedLineupEntries = selectedLineupMatch && selectedLineupTeam
    ? data.matchLineups.filter((entry) => entry.matchId === selectedLineupMatch.id && entry.teamId === selectedLineupTeam.id)
    : [];
  const disciplinaryTableRows = disciplinaryRows({ players: data.players, teams: data.teams, matches: data.matches, events: data.events, yellowThreshold: yellowSuspensionThreshold });
  const selectedLineupPlayerKey = selectedLineupPlayers.map((player) => player.id).join(":");
  const selectedLineupEntryKey = selectedLineupEntries.map((entry) => `${entry.playerId}:${entry.role}:${entry.x ?? ""}:${entry.y ?? ""}:${entry.formation ?? ""}`).join("|");
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
  const selectedScoreHomeTeam = selectedScoreMatch ? data.teams.find((team) => team.id === selectedScoreMatch.homeTeamId) : undefined;
  const selectedScoreAwayTeam = selectedScoreMatch ? data.teams.find((team) => team.id === selectedScoreMatch.awayTeamId) : undefined;
  const selectedTeamStatsTeams = selectedTeamStatsMatch
    ? data.teams.filter((team) => team.id === selectedTeamStatsMatch.homeTeamId || team.id === selectedTeamStatsMatch.awayTeamId)
    : [];
  const matchPeriodOptions = periodOptionsForSport(matchFormSport, matchForm.periodLabel);
  const scorePeriodOptions = periodOptionsForSport(selectedScoreSport, selectedScoreMatch?.periodLabel);
  const eventTeamOptions = selectedEventMatch
    ? data.teams.filter((team) => team.id === selectedEventMatch.homeTeamId || team.id === selectedEventMatch.awayTeamId)
    : [];
  const eventPlayerOptions = data.players.filter((player) => !eventForm.teamId || player.teamId === eventForm.teamId);
  const matchEvents = data.events.filter((item) => !selectedEventMatch || item.matchId === selectedEventMatch.id);
  const selectedSubstitutionMatch = data.matches.find((match) => match.id === substitutionForm.matchId) ?? selectedScoreMatch ?? data.matches[0];
  const substitutionTeamOptions = selectedSubstitutionMatch
    ? data.teams.filter((team) => team.id === selectedSubstitutionMatch.homeTeamId || team.id === selectedSubstitutionMatch.awayTeamId)
    : [];
  const selectedSubstitutionTeam = substitutionTeamOptions.find((team) => team.id === substitutionForm.teamId) ?? substitutionTeamOptions[0];
  const substitutionPlayers = selectedSubstitutionTeam ? data.players.filter((player) => player.teamId === selectedSubstitutionTeam.id) : [];
  const substitutionCount = selectedSubstitutionMatch && selectedSubstitutionTeam
    ? data.events.filter((event) => event.matchId === selectedSubstitutionMatch.id && event.teamId === selectedSubstitutionTeam.id && event.type === "substitution").length
    : 0;
  const substitutionLimitReached = selectedSubstitutionMatch?.sport === "Football" && substitutionCount >= 5;
  const visibleAdminSections = adminSections.filter((section) => (section.adminOnly ? canManageAll : true) && (section.scorer ? canScore : true));
  const activeAdminSectionLabel = adminSections.find((section) => section.id === activeAdminSection)?.label ?? "Overview";

  function adminPanelClass(section: AdminSection, tone: "default" | "blue" = "default") {
    return clsx(
      "admin-panel rounded-xl border p-5 shadow-sm",
      tone === "blue" ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white",
      activeAdminSection !== section && "hidden"
    );
  }

  function toggleAdminDarkMode() {
    setAdminDarkMode((current) => {
      const next = !current;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(adminDarkModeStorageKey, String(next));
      }
      return next;
    });
  }

  useEffect(() => {
    if (!selectedScoreMatch?.clockRunning) {
      return;
    }

    const interval = window.setInterval(() => setClockPreviewNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [selectedScoreMatch?.id, selectedScoreMatch?.clockRunning, selectedScoreMatch?.clockStartedAt]);

  useEffect(() => {
    function applyHashSection() {
      const hashSection = window.location.hash.replace("#", "");
      if (adminSections.some((section) => section.id === hashSection)) {
        setActiveAdminSection(hashSection as AdminSection);
      }
    }

    applyHashSection();
    window.addEventListener("hashchange", applyHashSection);
    return () => window.removeEventListener("hashchange", applyHashSection);
  }, []);

  useEffect(() => {
    const nextFormation = (selectedLineupEntries.find((entry) => entry.formation)?.formation ?? "4-3-3") as LineupFormation;
    const nextRoles = Object.fromEntries(selectedLineupPlayers.map((player) => [player.id, selectedLineupEntries.find((entry) => entry.playerId === player.id)?.role ?? "reserve"])) as Record<string, MatchLineupRole>;
    const presetPositions = autoArrangePositions(selectedLineupPlayers, nextRoles, nextFormation, {});
    const nextPositions = { ...presetPositions };

    selectedLineupEntries.forEach((entry) => {
      if (typeof entry.x === "number" && typeof entry.y === "number") {
        nextPositions[entry.playerId] = { x: clampPercent(entry.x), y: clampPercent(entry.y) };
      }
    });

    queueMicrotask(() => {
      setLineupFormation(lineupFormations.includes(nextFormation) ? nextFormation : "4-3-3");
      setLineupRoles(nextRoles);
      setLineupPositions(nextPositions);
      setSelectedPitchPlayerId("");
      setSwapPlayerId("");
    });
    // selectedLineupPlayerKey and selectedLineupEntryKey intentionally carry the array contents.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLineupMatch?.id, selectedLineupTeam?.id, selectedLineupPlayerKey, selectedLineupEntryKey]);

  useEffect(() => {
    const matchId = selectedOfficialsMatchId || data.matches[0]?.id || "";
    if (!matchId) {
      queueMicrotask(() => setSelectedOfficialIds([]));
      return;
    }

    queueMicrotask(() => {
      setSelectedOfficialsMatchId(matchId);
      setSelectedOfficialIds(data.matchOfficials.filter((assignment) => assignment.matchId === matchId).map((assignment) => assignment.officialId));
    });
  }, [data.matchOfficials, data.matches, selectedOfficialsMatchId]);

  function adminClockStatus(match?: Match) {
    if (!match) {
      return "Paused";
    }

    const period = match.periodLabel.toLowerCase();
    const label = match.clockLabel?.toLowerCase().trim();

    if (match.status === "Final" || period.includes("full") || period.includes("final") || label === "ft" || label === "full time") {
      return "Full Time";
    }

    if (period.includes("half time") || label === "ht" || label === "half time" || label === "halftime") {
      return "Half Time";
    }

    return match.clockRunning ? "Running" : "Paused";
  }

  function adminClockDisplay(match?: Match) {
    if (!match) {
      return "--:--";
    }

    const status = adminClockStatus(match);

    if (match.sport === "Football" && status === "Half Time") {
      return "HT";
    }

    if (match.sport === "Football" && status === "Full Time") {
      return "90:00";
    }

    return formatMatchClock(match, match.clockRunning ? clockPreviewNow : 0);
  }

  function scorerControlButtonClass(tone: "green" | "amber" | "blue" | "slate" | "primary") {
    const tones = {
      green: "border-emerald-200 text-emerald-700 hover:bg-emerald-50",
      amber: "border-amber-200 text-amber-700 hover:bg-amber-50",
      blue: "border-blue-200 text-blue-700 hover:bg-blue-50",
      slate: "border-slate-300 text-slate-700 hover:bg-slate-50",
      primary: "border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
    };

    return clsx(
      "rounded-lg border px-3 py-2 text-sm font-semibold transition",
      compactScorerMode && "min-h-12 px-4 py-3 text-base font-black",
      tones[tone]
    );
  }

  function submitTournament(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!tournamentForm.name.trim()) {
      return;
    }

    const tournament: Tournament = {
      ...tournamentForm,
      id: tournamentForm.id || createId("tournament", tournamentForm.name),
      name: tournamentForm.name.trim(),
      location: tournamentForm.location.trim(),
      logoUrl: tournamentForm.logoUrl?.trim() || undefined,
      primaryColor: tournamentForm.primaryColor?.trim() || undefined,
      sponsorName: tournamentForm.sponsorName?.trim() || undefined,
      sponsorLogoUrl: tournamentForm.sponsorLogoUrl?.trim() || undefined
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

    const existingTeam = data.teams.find((item) => item.id === teamId);
    const team: Team = {
      ...existingTeam,
      ...teamForm,
      id: teamId,
      name: teamForm.name.trim(),
      logoUrl,
      rosterStatus: existingTeam?.rosterStatus ?? "Draft",
      rosterNote: existingTeam?.rosterNote,
      rosterLocked: existingTeam?.rosterLocked ?? false,
      rosterSubmittedAt: existingTeam?.rosterSubmittedAt,
      rosterApprovedAt: existingTeam?.rosterApprovedAt
    };
    await saveTeam(team);
    setTeamForm(emptyTeam);
    setTeamLogoFile(null);
    setMessage(`Saved team: ${team.name}`);
  }

  async function approveRoster(team: Team) {
    await saveTeam({
      ...team,
      rosterStatus: "Approved",
      rosterNote: "",
      rosterApprovedAt: new Date().toISOString(),
      rosterLocked: team.rosterLocked ?? false
    });
    setMessage(`Approved roster for ${team.name}.`);
  }

  async function requestRosterChanges(team: Team) {
    const note = rosterReviewNotes[team.id]?.trim();
    await saveTeam({
      ...team,
      rosterStatus: "Needs changes",
      rosterNote: note || "Please update and resubmit this roster.",
      rosterLocked: false
    });
    setRosterReviewNotes((current) => ({ ...current, [team.id]: "" }));
    setMessage(`Requested roster changes for ${team.name}.`);
  }

  async function toggleRosterLock(team: Team) {
    await saveTeam({ ...team, rosterLocked: !team.rosterLocked });
    setMessage(`${team.rosterLocked ? "Unlocked" : "Locked"} roster for ${team.name}.`);
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
    if (selectedLineupMatch && (selectedLineupMatch.homeTeamId === teamId || selectedLineupMatch.awayTeamId === teamId)) {
      const existingTeamEntries = data.matchLineups.filter((entry) => entry.matchId === selectedLineupMatch.id && entry.teamId === teamId && entry.playerId !== playerId);
      await saveMatchLineups([
        ...existingTeamEntries,
        {
          tournamentId: selectedLineupMatch.tournamentId ?? selectedTournamentId,
          matchId: selectedLineupMatch.id,
          teamId,
          playerId,
          role: playerForm.squadRole
        }
      ]);
    }
    setPlayerForm({ ...emptyPlayer, teamId: teamOptions[0]?.id ?? "" });
    setPlayerPhotoFile(null);
    setMessage(`Saved player: ${player.name}`);
  }

  function submitOfficial(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!officialForm.name.trim()) {
      return;
    }

    const official: Official = {
      id: officialForm.id || createId("official", officialForm.name),
      name: officialForm.name.trim(),
      role: officialForm.role,
      country: officialForm.country?.trim() || undefined,
      city: officialForm.city?.trim() || undefined,
      photoUrl: officialForm.photoUrl?.trim() || undefined
    };

    saveOfficial(official);
    setOfficialForm(emptyOfficial);
    setMessage(`Saved official: ${official.name}`);
  }

  function editOfficial(official: Official) {
    setOfficialForm({
      id: official.id,
      name: official.name,
      role: official.role,
      country: official.country ?? "",
      city: official.city ?? "",
      photoUrl: official.photoUrl ?? ""
    });
  }

  function saveOfficialAssignments() {
    const matchId = selectedOfficialsMatchId || data.matches[0]?.id;
    if (!matchId) {
      return;
    }

    saveMatchOfficials(matchId, selectedOfficialIds.map((officialId) => ({ matchId, officialId })));
    setMessage(`Saved ${selectedOfficialIds.length} official${selectedOfficialIds.length === 1 ? "" : "s"} for match.`);
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
      phase: matchForm.phase,
      roundLabel: matchForm.roundLabel?.trim() || undefined,
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

  function updateMatchPhase(match: Match, phase: MatchPhase, roundLabel = match.roundLabel ?? "") {
    saveMatch({
      ...match,
      phase,
      roundLabel: roundLabel.trim() || undefined
    });
    setMessage(`Updated ${match.id} to ${phase}${roundLabel.trim() ? ` / ${roundLabel.trim()}` : ""}.`);
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

  function submitMatchTeamStats(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedTeamStatsMatch) {
      return;
    }

    const formData = new FormData(event.currentTarget);

    selectedTeamStatsTeams.forEach((team) => {
      const stats = Object.fromEntries(
        matchTeamStatKeys.map((key) => [key, Number(formData.get(`${team.id}:${key}`) ?? 0)])
      ) as Record<MatchTeamStatKey, number>;

      saveMatchTeamStats({
        tournamentId: selectedTeamStatsMatch.tournamentId ?? selectedTournamentId,
        matchId: selectedTeamStatsMatch.id,
        teamId: team.id,
        stats
      });
    });

    setMessage(`Saved match statistics for ${selectedTeamStatsMatch.court}.`);
  }

  function lineupRoleForPlayer(playerId: string): MatchLineupRole {
    return lineupRoles[playerId] ?? selectedLineupEntries.find((entry) => entry.playerId === playerId)?.role ?? "reserve";
  }

  function lineupRoleLabel(role: MatchLineupRole) {
    if (role === "starting") return "Starting XI";
    if (role === "substitute") return "Substitute";
    return "Reserve / Not in squad";
  }

  function setLineupRole(playerId: string, role: MatchLineupRole) {
    setLineupRoles((current) => ({ ...current, [playerId]: role }));
    if (role === "starting") {
      setSelectedPitchPlayerId(playerId);
      setLineupPositions((current) => current[playerId] ? current : autoArrangePositions(selectedLineupPlayers, { ...lineupRoles, [playerId]: role }, lineupFormation, current));
    }
  }

  function applyFormationPreset(formation: LineupFormation) {
    setLineupFormation(formation);
    setLineupPositions((current) => autoArrangePositions(selectedLineupPlayers, lineupRoles, formation, current));
  }

  function autoArrangeLineup() {
    setLineupPositions((current) => autoArrangePositions(selectedLineupPlayers, lineupRoles, lineupFormation, current));
  }

  function moveLineupPlayer(playerId: string, position: LineupPosition) {
    setLineupPositions((current) => ({ ...current, [playerId]: { x: clampPercent(position.x), y: clampPercent(position.y) } }));
    setSelectedPitchPlayerId(playerId);
  }

  function swapLineupPlayers(firstPlayerId: string, secondPlayerId: string) {
    const first = lineupPositions[firstPlayerId];
    const second = lineupPositions[secondPlayerId];
    if (!first || !second) return;
    setLineupPositions((current) => ({ ...current, [firstPlayerId]: second, [secondPlayerId]: first }));
    setSwapPlayerId("");
    setSelectedPitchPlayerId(secondPlayerId);
  }

  function resetLineupToFormation() {
    setLineupPositions(autoArrangePositions(selectedLineupPlayers, lineupRoles, lineupFormation, {}));
    setSelectedPitchPlayerId("");
    setSwapPlayerId("");
  }

  function submitMatchLineups(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedLineupMatch || !selectedLineupTeam) {
      return;
    }

    const entries = selectedLineupPlayers.map((player) => ({
      tournamentId: selectedLineupMatch.tournamentId ?? selectedTournamentId,
      matchId: selectedLineupMatch.id,
      teamId: selectedLineupTeam.id,
      playerId: player.id,
      role: lineupRoleForPlayer(player.id),
      x: lineupPositions[player.id]?.x,
      y: lineupPositions[player.id]?.y,
      formation: lineupFormation
    }));
    const startingCount = entries.filter((entry) => entry.role === "starting").length;

    if (startingCount > 11) {
      setMessage("Starting XI cannot contain more than 11 players.");
      return;
    }

    saveMatchLineups(entries);
    setMessage(`Saved lineup roles for ${selectedLineupTeam.name}: ${startingCount} starters.`);
  }

  function submitSubstitution(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedSubstitutionMatch || !selectedSubstitutionTeam || !substitutionForm.minute.trim() || !substitutionForm.playerOutId || !substitutionForm.playerInId) {
      setMessage("Select match, team, player out, player in, and minute for the substitution.");
      return;
    }

    if (substitutionForm.playerOutId === substitutionForm.playerInId) {
      setMessage("Player out and player in must be different.");
      return;
    }

    if (selectedSubstitutionMatch.sport === "Football" && substitutionCount >= 5) {
      setMessage(`${selectedSubstitutionTeam.name} already used 5 substitutions.`);
      return;
    }

    const playerOut = data.players.find((player) => player.id === substitutionForm.playerOutId);
    const playerIn = data.players.find((player) => player.id === substitutionForm.playerInId);
    const matchEvent: MatchEvent = {
      id: createId("event", `${selectedSubstitutionMatch.id}-substitution-${substitutionForm.minute}`),
      tournamentId: selectedSubstitutionMatch.tournamentId ?? selectedTournamentId,
      matchId: selectedSubstitutionMatch.id,
      teamId: selectedSubstitutionTeam.id,
      playerId: substitutionForm.playerOutId,
      playerOutId: substitutionForm.playerOutId,
      playerInId: substitutionForm.playerInId,
      type: "substitution",
      minute: substitutionForm.minute.trim(),
      description: `${playerIn?.name ?? "Player in"} replaces ${playerOut?.name ?? "Player out"}`
    };

    saveEvent(matchEvent);
    setSubstitutionForm({ ...emptySubstitution, matchId: selectedSubstitutionMatch.id, teamId: selectedSubstitutionTeam.id });
    setMessage(`Saved substitution for ${selectedSubstitutionTeam.name}: ${matchEvent.description}.`);
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

  function startFootballSecondHalf() {
    if (!selectedScoreMatch) {
      return;
    }

    const secondHalfMatch = {
      ...selectedScoreMatch,
      periodLabel: "Second Half",
      clockBaseSeconds: 45 * 60,
      clockStartedAt: undefined,
      clockRunning: false
    };
    const clockState = getClockStateForAction(secondHalfMatch, "start");

    saveScore(selectedScoreMatch.id, {
      homeScore: selectedScoreMatch.homeScore,
      awayScore: selectedScoreMatch.awayScore,
      periodLabel: "Second Half",
      matchMinute: selectedScoreMatch.matchMinute,
      clockLabel: "",
      clockRunning: clockState.clockRunning,
      clockStartedAt: clockState.clockStartedAt,
      clockBaseSeconds: clockState.clockBaseSeconds,
      clockCountdownSeconds: selectedScoreMatch.clockCountdownSeconds,
      status: "Live"
    });
    setMessage("Started second half clock at 45:00.");
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
      squadRole: selectedLineupEntries.find((entry) => entry.playerId === player.id)?.role ?? "reserve",
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

  function adjustLivePlayerStat(player: Player, statKey: PlayerStatKey, amount: 1 | -1) {
    if (!selectedPlayerStatMatch) {
      return;
    }

    const currentValue = player.stats[statKey] ?? 0;
    const isScoringStat = statKey === "goals" || statKey === "points";
    const isHomePlayer = player.teamId === selectedPlayerStatMatch.homeTeamId;
    const isAwayPlayer = player.teamId === selectedPlayerStatMatch.awayTeamId;
    const teamScore = isHomePlayer ? selectedPlayerStatMatch.homeScore : isAwayPlayer ? selectedPlayerStatMatch.awayScore : 0;

    if (amount < 0 && currentValue <= 0) {
      setMessage(`${player.name} already has 0 ${playerStatLabels[statKey].toLowerCase()}.`);
      return;
    }

    if (amount < 0 && isScoringStat && teamScore <= 0) {
      setMessage("Team score is already 0, so this correction cannot be applied.");
      return;
    }

    if (amount < 0 && isScoringStat) {
      const confirmed = window.confirm(`Remove one ${statKey === "goals" ? "goal" : "point"} from ${player.name} and reduce the team score by 1?`);
      if (!confirmed) {
        return;
      }
    }

    savePlayerMatchStat(selectedPlayerStatMatch.id, player.id, statKey, amount);
    setMessage(`${amount > 0 ? "Added" : "Removed"} ${playerStatLabels[statKey].toLowerCase()} for ${player.name}.`);
  }

  function liveButtonLabel(statKey: PlayerStatKey, amount: 1 | -1) {
    const prefix = amount > 0 ? "+" : "-";
    if (statKey === "goals") return `${prefix} Goal`;
    if (statKey === "points") return `${prefix} Point`;
    if (statKey === "yellow_cards") return `${prefix} Yellow card`;
    if (statKey === "red_cards") return `${prefix} Red card`;
    return `${prefix} ${playerStatLabels[statKey]}`;
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
      phase: match.phase ?? "Group Stage",
      roundLabel: match.roundLabel ?? "",
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
      status: tournament.status,
      logoUrl: tournament.logoUrl ?? "",
      primaryColor: tournament.primaryColor ?? "#2563eb",
      sponsorName: tournament.sponsorName ?? "",
      sponsorLogoUrl: tournament.sponsorLogoUrl ?? ""
    });
  }

  async function copyFollowUpMessage(kind: "email" | "WhatsApp", text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMessage(`${kind} message copied.`);
    } catch {
      setMessage("Could not copy message to clipboard.");
    }
  }

  function markApplicationContacted(applicationId: string) {
    void saveTournamentApplicationFollowUp(applicationId, {
      status: "contacted",
      lastContactedAt: new Date().toISOString()
    });
    setMessage("Application marked as contacted.");
  }

  function saveApplicationNote(applicationId: string, note: string) {
    void saveTournamentApplicationFollowUp(applicationId, { adminNote: note });
    setMessage("Application note saved.");
  }

  async function createTeamFromApplication(application: TournamentApplication) {
    const teamName = application.club.trim();
    if (!teamName) {
      setMessage("Application club name is required before creating a team.");
      return;
    }

    const duplicate = data.teams.find(
      (team) =>
        (team.tournamentId === application.tournamentId || (!team.tournamentId && application.tournamentId === selectedTournamentId)) &&
        team.name.trim().toLowerCase() === teamName.toLowerCase()
    );
    if (duplicate) {
      setMessage(`A team named ${duplicate.name} already exists in this tournament.`);
      return;
    }

    const tournament = data.tournaments.find((item) => item.id === application.tournamentId) ?? selectedTournament;
    const applicationSport = sportOptions.find((sport) => sport.toLowerCase() === (application.sport ?? "").trim().toLowerCase());
    const tournamentSport = tournament?.sportType && tournament.sportType !== "Mixed" ? tournament.sportType : undefined;
    const teamId = createId("team", `${application.tournamentId}-${teamName}`);
    const createdNote = application.adminNote?.trim()
      ? `${application.adminNote.trim()}\nTeam created from application`
      : "Team created from application";

    try {
      await saveTeam({
        id: teamId,
        tournamentId: application.tournamentId,
        name: teamName,
        sport: (applicationSport ?? tournamentSport ?? selectedTournamentSport ?? "Football") as Sport,
        group: application.ageGroup || "Group A",
        logoUrl: "",
        city: application.city ?? "",
        coach: application.nameSurname,
        colors: "",
        rosterStatus: "Draft",
        rosterLocked: false
      });
      await saveTournamentApplicationFollowUp(application.id, {
        status: "accepted",
        teamId,
        adminNote: createdNote
      });
      setApplicationNotes((current) => ({ ...current, [application.id]: createdNote }));
      setMessage(`${teamName} created and application accepted.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create team from application.");
    }
  }

  return (
    <div className={clsx("admin-dashboard grid gap-6 rounded-2xl transition-colors", adminDarkMode && "admin-dark")}>
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">
        {lastError ?? message}
      </div>

      {!supabaseEnabled ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local` to save data.
        </div>
      ) : null}

      <section className="admin-shell rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 px-2">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">Admin dashboard</p>
            <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">Control center</h2>
          </div>
          <button
            type="button"
            onClick={toggleAdminDarkMode}
            aria-pressed={adminDarkMode}
            className={clsx(
              "inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-black shadow-sm transition sm:w-auto",
              adminDarkMode
                ? "border-blue-400 bg-blue-600 text-white hover:bg-blue-500"
                : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
            )}
          >
            {adminDarkMode ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
            {adminDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          </button>
        </div>
        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-black text-blue-800">
          Active workflow: <span className="text-blue-950">{activeAdminSectionLabel}</span>
        </div>
        <nav className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-3" aria-label="Admin workflow navigation">
          {adminSectionGroups.map((group) => {
            const groupSections = group.sections
              .map((sectionId) => visibleAdminSections.find((section) => section.id === sectionId))
              .filter((section): section is (typeof visibleAdminSections)[number] => Boolean(section));
            const groupLinks = group.links?.filter((link) => canManageAll || link.href !== "/qr-print") ?? [];
            const hasActiveSection = group.sections.includes(activeAdminSection);

            if (groupSections.length === 0 && groupLinks.length === 0) {
              return null;
            }

            return (
              <div
                key={group.title}
                className={clsx(
                  "rounded-2xl border p-3 transition",
                  hasActiveSection ? "border-blue-300 bg-blue-50 shadow-[0_16px_34px_rgba(37,99,235,0.12)]" : "border-slate-200 bg-white"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-slate-950">{group.title}</h3>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{group.description}</p>
                  </div>
                  {hasActiveSection ? <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-wide text-white">Active</span> : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {groupSections.map((section) => (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => setActiveAdminSection(section.id)}
                      className={clsx(
                        "min-h-10 rounded-xl px-3 py-2 text-left text-sm font-black transition",
                        activeAdminSection === section.id
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                          : "bg-slate-50 text-slate-600 hover:bg-blue-100 hover:text-blue-800"
                      )}
                    >
                      {section.label}
                    </button>
                  ))}
                  {groupLinks.map((link) => (
                    <Link key={link.href} href={link.href} className="inline-flex min-h-10 items-center rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-black text-blue-700 hover:bg-blue-50">
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>
      </section>

      {profile ? (
        <section className={adminPanelClass("overview")}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Overview</h2>
              <p className="mt-1 text-sm text-slate-400">
                {profile.email} - {profile.role}
              </p>
            </div>
            <button onClick={() => void logout()} className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">
              <LogOut size={16} aria-hidden="true" />
              Sign out
            </button>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Tournaments", data.tournaments.length],
              ["Teams", data.teams.length],
              ["Players", data.players.length],
              ["Matches", data.matches.length]
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                <p className="text-xs font-black uppercase tracking-wide text-blue-600">{label}</p>
                <p className="mt-1 text-3xl font-black text-blue-950">{value}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {canManageAll ? (
        <>
      <section className={adminPanelClass("fixture_builder", "blue")}>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white/70 p-4">
            <div>
              <h2 className="text-lg font-black text-blue-950">Fixture builder</h2>
              <p className="mt-1 text-sm font-semibold text-blue-700">Generate league, group stage, and knockout placeholder fixtures with preview before saving.</p>
            </div>
            <Link href="/admin/fixture-builder" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-blue-700">
              Open fixture builder
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white/70 p-4">
            <div>
              <h2 className="text-lg font-black text-blue-950">Player import</h2>
              <p className="mt-1 text-sm font-semibold text-blue-700">Upload CSV or Excel rosters, preview duplicates, and import players in bulk.</p>
            </div>
            <Link href="/admin/player-import" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-blue-700">
              Import players
            </Link>
          </div>
        </div>
      </section>

      <section className={adminPanelClass("tournaments")}>
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
          <label>
            <span className={labelClass()}>Tournament logo URL</span>
            <input value={tournamentForm.logoUrl ?? ""} onChange={(event) => setTournamentForm({ ...tournamentForm, logoUrl: event.target.value })} className={inputClass()} placeholder="https://..." />
          </label>
          <label>
            <span className={labelClass()}>Theme color</span>
            <div className="mt-2 grid grid-cols-[3.5rem_1fr] gap-2">
              <input type="color" value={tournamentForm.primaryColor || "#2563eb"} onChange={(event) => setTournamentForm({ ...tournamentForm, primaryColor: event.target.value })} className="h-11 rounded-lg border border-slate-200 bg-white p-1" />
              <input value={tournamentForm.primaryColor ?? ""} onChange={(event) => setTournamentForm({ ...tournamentForm, primaryColor: event.target.value })} className="orso-input" placeholder="#2563eb" />
            </div>
          </label>
          <label>
            <span className={labelClass()}>Sponsor name</span>
            <input value={tournamentForm.sponsorName ?? ""} onChange={(event) => setTournamentForm({ ...tournamentForm, sponsorName: event.target.value })} className={inputClass()} />
          </label>
          <label>
            <span className={labelClass()}>Sponsor logo URL</span>
            <input value={tournamentForm.sponsorLogoUrl ?? ""} onChange={(event) => setTournamentForm({ ...tournamentForm, sponsorLogoUrl: event.target.value })} className={inputClass()} placeholder="https://..." />
          </label>
          <div className="flex items-end md:col-span-4">
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
              {tournament.sponsorName || tournament.sponsorLogoUrl ? (
                <div className="mt-3 flex min-w-0 items-center gap-3 rounded-xl bg-blue-50 px-3 py-2">
                  {tournament.sponsorLogoUrl ? <span className="h-9 w-16 shrink-0 rounded-lg bg-white bg-contain bg-center bg-no-repeat ring-1 ring-blue-100" style={{ backgroundImage: `url(${tournament.sponsorLogoUrl})` }} /> : null}
                  <div className="min-w-0">
                    <p className="text-[0.65rem] font-black uppercase tracking-wide text-blue-500">Sponsor</p>
                    <p className="truncate text-sm font-black text-blue-950">{tournament.sponsorName || "Official partner"}</p>
                  </div>
                </div>
              ) : null}
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

      <section className={adminPanelClass("teams")}>
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

      <section className={adminPanelClass("players")}>
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
          <label className="md:col-span-2">
            <span className={labelClass()}>Match for squad role</span>
            <select value={selectedLineupMatch?.id ?? ""} onChange={(event) => setSelectedLineupMatchId(event.target.value)} className={inputClass()}>
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
            <span className="mt-1 block text-xs font-semibold text-slate-400">Saved per selected match when the player belongs to either match team.</span>
          </label>
          <label>
            <span className={labelClass()}>Squad role</span>
            <select value={playerForm.squadRole} onChange={(event) => setPlayerForm({ ...playerForm, squadRole: event.target.value as MatchLineupRole })} className={inputClass()}>
              <option value="starting">Starting XI</option>
              <option value="substitute">Substitute</option>
              <option value="reserve">Reserve / Not in squad</option>
            </select>
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

      <section className={adminPanelClass("roster_approvals")}>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          {sectionTitle("Roster approvals", "Review club-submitted team profiles and player lists before publishing rosters publicly.")}
          <span className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-black text-blue-700 ring-1 ring-blue-100">
            {rosterApprovalTeams.filter((team) => (team.rosterStatus ?? "Draft") === "Submitted").length} submitted
          </span>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {rosterApprovalTeams.map((team) => {
            const roster = data.players.filter((player) => player.teamId === team.id).sort((first, second) => first.number - second.number || first.name.localeCompare(second.name));
            const reviewNote = rosterReviewNotes[team.id] ?? "";
            return (
              <article key={team.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-black text-slate-950">{team.name}</h3>
                      {rosterStatusBadge(team)}
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      {team.sport} / {team.group} / {roster.length} player{roster.length === 1 ? "" : "s"}
                    </p>
                    {team.rosterSubmittedAt ? <p className="mt-1 text-xs font-bold text-slate-400">Submitted {new Date(team.rosterSubmittedAt).toLocaleString()}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => void approveRoster(team)} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-black text-white hover:bg-emerald-700">
                      <CheckCircle2 size={16} aria-hidden="true" />
                      Approve
                    </button>
                    <button type="button" onClick={() => void toggleRosterLock(team)} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
                      {team.rosterLocked ? <Unlock size={16} aria-hidden="true" /> : <Lock size={16} aria-hidden="true" />}
                      {team.rosterLocked ? "Unlock" : "Lock"}
                    </button>
                  </div>
                </div>
                {team.rosterNote ? (
                  <div className="mt-4 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                    <AlertCircle size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
                    <span>{team.rosterNote}</span>
                  </div>
                ) : null}
                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                  <textarea
                    value={reviewNote}
                    onChange={(event) => setRosterReviewNotes((current) => ({ ...current, [team.id]: event.target.value }))}
                    placeholder="Change request note for club admin"
                    className="min-h-24 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <button type="button" onClick={() => void requestRosterChanges(team)} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-black text-amber-800 hover:bg-amber-100">
                    Request changes
                  </button>
                </div>
                <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
                  <div className="max-h-72 overflow-y-auto">
                    <table className="min-w-full divide-y divide-slate-100 text-sm">
                      <thead className="sticky top-0 bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-3 py-2">#</th>
                          <th className="px-3 py-2">Player</th>
                          <th className="px-3 py-2">Position</th>
                          <th className="px-3 py-2">Photo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {roster.map((player) => (
                          <tr key={player.id}>
                            <td className="px-3 py-2 font-black text-slate-900">{player.number}</td>
                            <td className="px-3 py-2 font-semibold text-slate-900">{player.name}</td>
                            <td className="px-3 py-2 text-slate-600">{player.position || "-"}</td>
                            <td className="px-3 py-2 text-slate-500">{player.photoUrl ? "Uploaded" : "-"}</td>
                          </tr>
                        ))}
                        {roster.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-3 py-4 text-center font-semibold text-slate-400">No players submitted yet.</td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>
              </article>
            );
          })}
          {rosterApprovalTeams.length === 0 ? <p className="rounded-lg border border-slate-200 p-4 text-sm font-semibold text-slate-400">No teams are available for this tournament.</p> : null}
        </div>
      </section>

      <section className={adminPanelClass("applications")}>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          {sectionTitle("Tournament applications", "Review public participation requests and track follow-up status.")}
          <span className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-black text-blue-700 ring-1 ring-blue-100">
            {filteredApplications.filter((application) => application.status === "new").length} new
          </span>
        </div>
        <div className="mb-5 grid gap-3 rounded-xl border border-blue-100 bg-blue-50 p-3 sm:grid-cols-3">
          <label>
            <span className={labelClass()}>Tournament</span>
            <select value={applicationTournamentFilter} onChange={(event) => setApplicationTournamentFilter(event.target.value)} className={inputClass()}>
              <option value="all">All tournaments</option>
              {data.tournaments.map((tournament) => (
                <option key={tournament.id} value={tournament.id}>
                  {tournament.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelClass()}>Status</span>
            <select value={applicationStatusFilter} onChange={(event) => setApplicationStatusFilter(event.target.value as "all" | TournamentApplicationStatus)} className={inputClass()}>
              <option value="all">All statuses</option>
              {tournamentApplicationStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {status.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelClass()}>Age group</span>
            <select value={applicationAgeGroupFilter} onChange={(event) => setApplicationAgeGroupFilter(event.target.value)} className={inputClass()}>
              <option value="all">All age groups</option>
              {applicationAgeGroups.map((ageGroup) => (
                <option key={ageGroup} value={ageGroup}>
                  {ageGroup}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid gap-4">
          {filteredApplications
            .map((application) => {
              const tournament = data.tournaments.find((item) => item.id === application.tournamentId);
              const tournamentName = tournament?.name ?? selectedTournament?.name ?? "the tournament";
              const followUpMessage = applicationFollowUpMessage(application, tournamentName);
              const emailSubject = `${tournamentName} participation request`;
              const emailHref = applicationMailto(application.email, emailSubject, followUpMessage);
              const whatsapp = applicationWhatsappHref(application.phone, followUpMessage);
              const adminNote = applicationNotes[application.id] ?? application.adminNote ?? "";
              const assignedTeam = application.teamId ? data.teams.find((team) => team.id === application.teamId) : undefined;
              return (
                <article key={application.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="break-words text-lg font-black text-slate-950">{application.club}</h3>
                        {applicationStatusBadge(application.status)}
                      </div>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        {application.nameSurname} / {application.email} / {application.phone}
                      </p>
                      <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
                        <span><strong className="text-slate-900">Tournament:</strong> {tournamentName}</span>
                        <span><strong className="text-slate-900">Players:</strong> {application.estimatedPlayers}</span>
                        <span><strong className="text-slate-900">Age:</strong> {application.ageGroup}</span>
                        <span><strong className="text-slate-900">Staff:</strong> {application.estimatedStaff}</span>
                        <span><strong className="text-slate-900">Sport:</strong> {application.sport || "-"}</span>
                        <span><strong className="text-slate-900">Country:</strong> {application.country || "-"}</span>
                        <span><strong className="text-slate-900">City:</strong> {application.city || "-"}</span>
                        <span className="sm:col-span-2"><strong className="text-slate-900">Received:</strong> {application.createdAt ? new Date(application.createdAt).toLocaleString() : "-"}</span>
                        <span className="sm:col-span-2"><strong className="text-slate-900">Last contacted:</strong> {application.lastContactedAt ? new Date(application.lastContactedAt).toLocaleString() : "-"}</span>
                        <span className="sm:col-span-2">
                          <strong className="text-slate-900">Assigned team:</strong> {assignedTeam?.name ?? application.teamId ?? "-"}
                        </span>
                      </div>
                      {application.notes ? <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">{application.notes}</p> : null}
                      <div className="mt-3 grid gap-2">
                        <label>
                          <span className={labelClass()}>Admin note</span>
                          <textarea
                            value={adminNote}
                            onChange={(event) => setApplicationNotes((current) => ({ ...current, [application.id]: event.target.value }))}
                            className="mt-2 min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            placeholder="Internal follow-up note"
                          />
                        </label>
                        <div>
                          <button type="button" onClick={() => saveApplicationNote(application.id, adminNote)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
                            Save note
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 sm:min-w-56">
                      <select
                        value={application.status}
                        onChange={(event) => void saveTournamentApplicationFollowUp(application.id, { status: event.target.value as TournamentApplicationStatus })}
                        className={inputClass()}
                      >
                        {tournamentApplicationStatusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())}
                          </option>
                        ))}
                      </select>
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => void copyFollowUpMessage("email", followUpMessage)} className="inline-flex items-center justify-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-center text-sm font-black text-blue-700 hover:bg-blue-100">
                          <Copy size={14} aria-hidden="true" />
                          Copy email
                        </button>
                        <button type="button" onClick={() => void copyFollowUpMessage("WhatsApp", followUpMessage)} className="inline-flex items-center justify-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-center text-sm font-black text-emerald-700 hover:bg-emerald-100">
                          <Copy size={14} aria-hidden="true" />
                          Copy WA
                        </button>
                        <a href={emailHref} className="inline-flex items-center justify-center gap-1 rounded-lg border border-blue-200 bg-white px-3 py-2 text-center text-sm font-black text-blue-700 hover:bg-blue-50">
                          <Mail size={14} aria-hidden="true" />
                          Open email
                        </a>
                        {whatsapp ? (
                          <a href={whatsapp} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-1 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-center text-sm font-black text-emerald-700 hover:bg-emerald-50">
                            <MessageCircle size={14} aria-hidden="true" />
                            WhatsApp
                          </a>
                        ) : (
                          <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center text-sm font-black text-slate-300">WhatsApp</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => markApplicationContacted(application.id)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-black text-white hover:bg-blue-700"
                      >
                        <CheckCircle2 size={15} aria-hidden="true" />
                        Mark as contacted
                      </button>
                      <button
                        type="button"
                        onClick={() => void createTeamFromApplication(application)}
                        disabled={Boolean(application.teamId)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-black text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        <Plus size={15} aria-hidden="true" />
                        {application.teamId ? "Team linked" : "Create Team from Application"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Delete application from ${application.club}?`)) {
                            void removeTournamentApplication(application.id);
                          }
                        }}
                        className="rounded-lg border border-red-200 px-3 py-2 text-sm font-black text-red-700 hover:bg-red-50"
                      >
                        Delete application
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          {filteredApplications.length === 0 ? (
            <p className="rounded-lg border border-slate-200 p-4 text-sm font-semibold text-slate-400">No participation requests for this tournament yet.</p>
          ) : null}
        </div>
      </section>

      <section className={adminPanelClass("reports")}>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          {sectionTitle("Reports", "Open printable match reports and public QR destinations for sharing.")}
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
                  <div key={match.id} className="grid gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 sm:grid-cols-[1fr_auto] sm:items-center">
                    <Link href={`/matches/${match.id}`} className="break-words text-blue-700 hover:text-blue-800">
                      {home?.name} vs {away?.name} - {match.court}
                    </Link>
                    <Link href={`/reports/match/${match.id}`} className="rounded-md border border-blue-200 bg-white px-2.5 py-1 text-center text-xs font-black text-blue-700 hover:bg-blue-50">
                      Report
                    </Link>
                  </div>
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

      <section className={adminPanelClass("officials")}>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          {sectionTitle("Officials management", "Create referees and match officials, then assign them to fixtures for public pages and printable reports.")}
          {officialForm.id ? (
            <button type="button" onClick={() => setOfficialForm(emptyOfficial)} className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">
              <X size={16} aria-hidden="true" />
              Cancel edit
            </button>
          ) : null}
        </div>
        <form onSubmit={submitOfficial} className="grid gap-4 md:grid-cols-6">
          <label className="md:col-span-2">
            <span className={labelClass()}>Name</span>
            <input value={officialForm.name} onChange={(event) => setOfficialForm({ ...officialForm, name: event.target.value })} className={inputClass()} />
          </label>
          <label>
            <span className={labelClass()}>Role</span>
            <select value={officialForm.role} onChange={(event) => setOfficialForm({ ...officialForm, role: event.target.value as OfficialRole })} className={inputClass()}>
              {officialRoleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelClass()}>Country</span>
            <input value={officialForm.country ?? ""} onChange={(event) => setOfficialForm({ ...officialForm, country: event.target.value })} className={inputClass()} />
          </label>
          <label>
            <span className={labelClass()}>City</span>
            <input value={officialForm.city ?? ""} onChange={(event) => setOfficialForm({ ...officialForm, city: event.target.value })} className={inputClass()} />
          </label>
          <label>
            <span className={labelClass()}>Photo URL</span>
            <input value={officialForm.photoUrl ?? ""} onChange={(event) => setOfficialForm({ ...officialForm, photoUrl: event.target.value })} className={inputClass()} placeholder="https://..." />
          </label>
          <div className="flex items-end md:col-span-6">
            <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              {officialForm.id ? <Save size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
              {officialForm.id ? "Save official" : "Add official"}
            </button>
          </div>
        </form>

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
          <div className="grid gap-3 md:grid-cols-2">
            {data.officials.map((official) => (
              <div key={official.id} className="rounded-lg border border-slate-200 p-4">
                <p className="font-bold text-slate-900">{official.name}</p>
                <p className="text-sm font-semibold capitalize text-blue-700">{official.role}</p>
                <p className="text-sm text-slate-400">{[official.city, official.country].filter(Boolean).join(", ") || "Location not set"}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => editOfficial(official)} className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold">
                    <Pencil size={14} aria-hidden="true" />
                    Edit
                  </button>
                  <button type="button" onClick={() => removeOfficial(official.id)} className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-700">
                    <Trash2 size={14} aria-hidden="true" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {data.officials.length === 0 ? <p className="rounded-lg border border-dashed border-blue-200 bg-blue-50 px-4 py-5 text-sm font-semibold text-blue-700">No officials created yet.</p> : null}
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <h3 className="text-base font-black text-blue-950">Assign officials to match</h3>
            <label className="mt-3 block">
              <span className={labelClass()}>Match</span>
              <select value={selectedOfficialsMatchId || data.matches[0]?.id || ""} onChange={(event) => setSelectedOfficialsMatchId(event.target.value)} className={inputClass()}>
                {data.matches.map((match) => {
                  const home = data.teams.find((team) => team.id === match.homeTeamId);
                  const away = data.teams.find((team) => team.id === match.awayTeamId);
                  return (
                    <option key={match.id} value={match.id}>
                      {home?.name ?? "Home"} vs {away?.name ?? "Away"} / {match.date}
                    </option>
                  );
                })}
              </select>
            </label>
            <div className="mt-3 grid gap-2">
              {data.officials.map((official) => (
                <label key={official.id} className="flex items-center gap-3 rounded-lg bg-white px-3 py-2 text-sm font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={selectedOfficialIds.includes(official.id)}
                    onChange={(event) =>
                      setSelectedOfficialIds((current) =>
                        event.target.checked ? [...current, official.id] : current.filter((officialId) => officialId !== official.id)
                      )
                    }
                    className="h-4 w-4"
                  />
                  <span className="min-w-0 flex-1 truncate">{official.name}</span>
                  <span className="shrink-0 capitalize text-blue-700">{official.role}</span>
                </label>
              ))}
            </div>
            <button type="button" onClick={saveOfficialAssignments} className="mt-4 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              <Save size={16} aria-hidden="true" />
              Save assignments
            </button>
          </div>
        </div>
      </section>

      <section className={adminPanelClass("matches")}>
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
            <span className={labelClass()}>Phase</span>
            <select value={matchForm.phase ?? "Group Stage"} onChange={(event) => setMatchForm({ ...matchForm, phase: event.target.value as MatchPhase })} className={inputClass()}>
              {matchPhaseOptions.map((phase) => (
                <option key={phase} value={phase}>
                  {phase}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelClass()}>Round label</span>
            <input value={matchForm.roundLabel ?? ""} onChange={(event) => setMatchForm({ ...matchForm, roundLabel: event.target.value })} className={inputClass()} placeholder="QF 1, Semi 2, Final" />
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
                <p className="mt-1 text-xs font-black uppercase tracking-wide text-blue-600">
                  {match.phase ?? "Group Stage"}{match.roundLabel ? ` / ${match.roundLabel}` : ""}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={`/reports/match/${match.id}`} className="flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-1.5 text-sm font-semibold text-blue-700">
                    Report
                  </Link>
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

      <section className={adminPanelClass("bracket_phases")}>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          {sectionTitle("Bracket and phase management", "Assign each fixture to a tournament phase and optional round label. The public bracket page uses these fields without changing scoring or reports.")}
          {selectedTournament ? (
            <Link href={`/tournament/${selectedTournament.id}/bracket`} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-black text-blue-700">
              Open public bracket
            </Link>
          ) : null}
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {matchPhaseOptions.map((phase) => {
            const phaseMatches = data.matches.filter((match) => (match.phase ?? "Group Stage") === phase);
            return (
              <div key={phase} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-black text-slate-950">{phase}</h3>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-blue-700 ring-1 ring-blue-100">{phaseMatches.length} matches</span>
                </div>
                <div className="mt-3 grid gap-3">
                  {phaseMatches.length === 0 ? <p className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-4 text-sm font-bold text-slate-500">No matches assigned.</p> : null}
                  {phaseMatches.map((match) => {
                    const home = data.teams.find((team) => team.id === match.homeTeamId);
                    const away = data.teams.find((team) => team.id === match.awayTeamId);
                    return (
                      <div key={match.id} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-black text-slate-950">{home?.name ?? "Home"} vs {away?.name ?? "Away"}</p>
                          <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">{match.date} {match.time} / {match.status} / {match.homeScore}-{match.awayScore}</p>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                          <label>
                            <span className="text-xs font-black uppercase tracking-wide text-slate-500">Phase</span>
                            <select value={match.phase ?? "Group Stage"} onChange={(event) => updateMatchPhase(match, event.target.value as MatchPhase)} className={inputClass()}>
                              {matchPhaseOptions.map((phaseOption) => (
                                <option key={phaseOption} value={phaseOption}>
                                  {phaseOption}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            <span className="text-xs font-black uppercase tracking-wide text-slate-500">Round label</span>
                            <input
                              defaultValue={match.roundLabel ?? ""}
                              onBlur={(event) => updateMatchPhase(match, match.phase ?? "Group Stage", event.target.value)}
                              className={inputClass()}
                              placeholder="QF 1, Semi 2"
                            />
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className={adminPanelClass("disciplinary")}>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          {sectionTitle("Disciplinary tracking", "Cards are calculated from match events. Red card suspends automatically; yellow card accumulation can be adjusted for this operator device.")}
          <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-48">
              <span className={labelClass()}>Yellow suspension rule</span>
              <input
                type="number"
                min={1}
                value={yellowSuspensionThreshold}
                onChange={(event) => {
                  const next = Math.max(1, Number(event.target.value) || 1);
                  setYellowSuspensionThreshold(next);
                  window.localStorage.setItem(yellowCardSuspensionThresholdStorageKey, String(next));
                }}
                className={inputClass()}
              />
            </label>
            <Link href="/disciplinary" className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-black text-blue-700">
              Open public table
            </Link>
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3 text-center">Yellow</th>
                <th className="px-4 py-3 text-center">Red</th>
                <th className="px-4 py-3">Suspension</th>
                <th className="px-4 py-3">Next eligible</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {disciplinaryTableRows.map((row) => (
                <tr key={row.player.id}>
                  <td className="px-4 py-3 font-black text-slate-950">#{row.player.number} {row.player.name}</td>
                  <td className="px-4 py-3 font-bold text-slate-600">{row.team?.name ?? "Team"}</td>
                  <td className="px-4 py-3 text-center font-black text-yellow-700">{row.yellowCards}</td>
                  <td className="px-4 py-3 text-center font-black text-red-700">{row.redCards}</td>
                  <td className="px-4 py-3">
                    <span className={clsx("rounded-full px-3 py-1 text-xs font-black", row.isSuspended ? "bg-red-600 text-white" : "bg-emerald-50 text-emerald-700")}>
                      {row.isSuspended ? `Suspended ${row.matchesSuspended}` : "Eligible"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-600">{row.nextEligibleMatch ? `${row.nextEligibleMatch.date} ${row.nextEligibleMatch.time}` : "Not scheduled"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {disciplinaryTableRows.length === 0 ? <p className="p-4 text-sm font-bold text-slate-500">No cards have been recorded yet.</p> : null}
        </div>
      </section>

      <section className={adminPanelClass("lineups")}>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          {sectionTitle("Match lineup management", "Set match-day Starting XI, substitutes, and reserves per football fixture. These roles power the public Lineups tab.")}
          {selectedLineupMatch ? sportBadge(selectedLineupMatch.sport) : null}
        </div>
        <form onSubmit={submitMatchLineups} className="grid gap-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <span className={labelClass()}>Match</span>
              <select value={selectedLineupMatch?.id ?? ""} onChange={(event) => setSelectedLineupMatchId(event.target.value)} className={inputClass()}>
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
            <label>
              <span className={labelClass()}>Team</span>
              <select value={selectedLineupTeam?.id ?? ""} onChange={(event) => setSelectedLineupTeamId(event.target.value)} className={inputClass()}>
                {selectedLineupTeamOptions.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {selectedLineupMatch?.sport === "Football" && selectedLineupTeam ? (
            <>
              <div className="grid gap-3 rounded-lg border border-blue-100 bg-blue-50 p-4 sm:grid-cols-3">
                {(["starting", "substitute", "reserve"] as MatchLineupRole[]).map((role) => (
                  <div key={role} className="rounded-lg bg-white px-3 py-2">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">{lineupRoleLabel(role)}</p>
                    <p className="mt-1 text-2xl font-black text-blue-700">
                      {selectedLineupPlayers.filter((player) => lineupRoleForPlayer(player.id) === role).length}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
                <div className="grid gap-3">
                  <div className="flex flex-wrap items-end gap-3 rounded-xl border border-blue-100 bg-white p-3">
                    <label className="min-w-44 flex-1">
                      <span className={labelClass()}>Formation preset</span>
                      <select value={lineupFormation} onChange={(event) => applyFormationPreset(event.target.value as LineupFormation)} className={inputClass()}>
                        {lineupFormations.map((formation) => (
                          <option key={formation} value={formation}>{formation}</option>
                        ))}
                      </select>
                    </label>
                    <button type="button" onClick={resetLineupToFormation} className="min-h-11 rounded-lg border border-blue-200 px-3 py-2 text-sm font-black text-blue-700 hover:bg-blue-50">
                      Reset to formation
                    </button>
                    <button type="button" onClick={autoArrangeLineup} className="min-h-11 rounded-lg border border-blue-200 px-3 py-2 text-sm font-black text-blue-700 hover:bg-blue-50">
                      Auto arrange
                    </button>
                    <button type="button" onClick={() => setSwapPlayerId(selectedPitchPlayerId)} disabled={!selectedPitchPlayerId} className="min-h-11 rounded-lg border border-slate-200 px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45">
                      Swap players
                    </button>
                  </div>

                  <LineupPitchEditor
                    players={selectedLineupPlayers}
                    roles={lineupRoles}
                    positions={lineupPositions}
                    selectedPlayerId={selectedPitchPlayerId}
                    swapPlayerId={swapPlayerId}
                    onSelectPlayer={setSelectedPitchPlayerId}
                    onMovePlayer={moveLineupPlayer}
                    onSwapPlayers={swapLineupPlayers}
                  />

                  <p className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
                    Select a player card, then tap the pitch to place. Drag placed markers for fine adjustments. Coordinates are saved per player for this match.
                  </p>
                </div>

                <div className="grid content-start gap-3">
                  {[...selectedLineupPlayers]
                    .sort((first, second) => roleRank(lineupRoleForPlayer(first.id)) - roleRank(lineupRoleForPlayer(second.id)) || first.number - second.number || first.name.localeCompare(second.name))
                    .map((player) => {
                      const disciplinaryRow = disciplinaryRowForPlayer(player, disciplinaryTableRows);
                      return (
                      <div key={player.id} className={clsx("grid gap-3 rounded-lg border bg-white p-3 sm:grid-cols-[1fr_auto] sm:items-center", selectedPitchPlayerId === player.id ? "border-blue-500 shadow-[0_12px_30px_rgba(37,99,235,0.12)]" : disciplinaryRow?.isSuspended ? "border-red-200" : "border-slate-200")}>
                        <button type="button" draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", player.id)} onClick={() => setSelectedPitchPlayerId(player.id)} className="min-w-0 text-left">
                          <p className="font-black text-slate-950">#{player.number} {player.name}</p>
                          <p className="text-sm font-semibold text-slate-500">{player.position || "Player"}</p>
                          {disciplinaryRow?.isSuspended ? <p className="mt-1 text-xs font-black text-red-600">Suspended for {disciplinaryRow.matchesSuspended} match{disciplinaryRow.matchesSuspended === 1 ? "" : "es"}</p> : null}
                          {lineupPositions[player.id] ? <p className="mt-1 text-xs font-black text-blue-600">x {Math.round(lineupPositions[player.id].x)} / y {Math.round(lineupPositions[player.id].y)}</p> : null}
                        </button>
                        <select value={lineupRoleForPlayer(player.id)} onChange={(event) => setLineupRole(player.id, event.target.value as MatchLineupRole)} className="orso-input mt-0 min-w-48">
                          <option value="starting">Starting XI</option>
                          <option value="substitute">Substitute</option>
                          <option value="reserve">Reserve / Not in squad</option>
                        </select>
                      </div>
                      );
                    })}
                  {selectedLineupPlayers.length === 0 ? <p className="rounded-lg border border-dashed border-blue-200 bg-blue-50 px-4 py-5 text-sm font-semibold text-blue-700">No players available for this team.</p> : null}
                </div>
              </div>
              <div>
                <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                  <Save size={16} aria-hidden="true" />
                  Save tactical lineup
                </button>
              </div>
            </>
          ) : (
            <p className="rounded-lg border border-dashed border-blue-200 bg-blue-50 px-4 py-5 text-sm font-semibold text-blue-700">Select a football match to manage lineups.</p>
          )}
        </form>
      </section>

      {selectedEventSport === "Football" ? (
      <section className={adminPanelClass("timeline")}>
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
              <option value="assist">Assist</option>
              <option value="yellow">Yellow card</option>
              <option value="red">Red card</option>
              <option value="substitution">Substitution</option>
              <option value="own_goal">Own goal</option>
              <option value="penalty_goal">Penalty goal</option>
              <option value="missed_penalty">Missed penalty</option>
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
      <section className={adminPanelClass("live_scoring")}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          {sectionTitle("Scores", "Fast score update panel for live scoring.")}
          <div className="flex flex-wrap items-center gap-2">
            {sportBadge(selectedScoreSport)}
            {selectedScoreMatch ? (
              <Link href={`/admin/match-console/${selectedScoreMatch.id}`} className="rounded-lg border border-blue-200 bg-blue-600 px-3 py-2 text-sm font-black text-white shadow-sm transition hover:bg-blue-700">
                Open Match Console
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => setCompactScorerMode((current) => !current)}
              aria-pressed={compactScorerMode}
              className={clsx(
                "rounded-lg border px-3 py-2 text-sm font-black transition",
                compactScorerMode ? "border-blue-600 bg-blue-600 text-white" : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
              )}
            >
              {compactScorerMode ? "Tablet scorer mode on" : "Tablet scorer mode"}
            </button>
          </div>
        </div>
        {selectedScoreMatch ? (
          <div className="sticky top-2 z-20 mt-5 rounded-xl border border-blue-200 bg-white/95 p-3 shadow-[0_14px_34px_rgba(37,99,235,0.16)] backdrop-blur">
            <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wide text-blue-600">Selected match</p>
                <p className="orso-team-name orso-team-name-2 mt-1 text-base font-black text-slate-950">{selectedScoreHomeTeam?.name ?? "Home"} vs {selectedScoreAwayTeam?.name ?? "Away"}</p>
                <p className="mt-1 text-sm font-semibold text-slate-500">{selectedScoreMatch.court} / {selectedScoreMatch.status}</p>
              </div>
              <div className="rounded-xl bg-blue-700 px-5 py-3 text-center text-white">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/60">Clock</p>
                <p className="mt-1 text-4xl font-black leading-none">{adminClockDisplay(selectedScoreMatch)}</p>
                <p className="mt-1 text-xs font-black uppercase tracking-wide text-white/70">{adminClockStatus(selectedScoreMatch)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 px-5 py-3 text-center">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Score</p>
                <p className="mt-1 text-4xl font-black leading-none text-slate-950">{selectedScoreMatch.homeScore} - {selectedScoreMatch.awayScore}</p>
              </div>
            </div>
          </div>
        ) : null}
        <form key={`${selectedScoreMatch?.id ?? "none"}-${selectedScoreMatch?.homeScore ?? 0}-${selectedScoreMatch?.awayScore ?? 0}-${selectedScoreMatch?.status ?? ""}-${selectedScoreMatch?.periodLabel ?? ""}-${selectedScoreMatch?.matchMinute ?? ""}-${selectedScoreMatch?.clockLabel ?? ""}-${selectedScoreMatch?.clockRunning ?? false}`} onSubmit={submitScore} className={clsx("mt-5 grid gap-4 md:grid-cols-5", compactScorerMode && "md:grid-cols-6")}>
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
          <div className="md:col-span-5">
            <div className="grid gap-3 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-4 shadow-[0_12px_30px_rgba(37,99,235,0.10)] sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Live clock preview</p>
                <p className="mt-1 break-words text-sm font-semibold text-slate-500">
                  {selectedScoreMatch
                    ? `${data.teams.find((team) => team.id === selectedScoreMatch.homeTeamId)?.name ?? "Home"} vs ${data.teams.find((team) => team.id === selectedScoreMatch.awayTeamId)?.name ?? "Away"}`
                    : "Select a match"}
                </p>
              </div>
              <div className="rounded-xl bg-blue-700 px-5 py-4 text-center text-white shadow-lg shadow-blue-900/20">
                <div className="flex items-center justify-center gap-2">
                  {selectedScoreMatch?.clockRunning ? <span className="h-3 w-3 animate-pulse rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.95)]" aria-hidden="true" /> : null}
                  <span className="text-4xl font-black leading-none tracking-tight sm:text-5xl">{adminClockDisplay(selectedScoreMatch)}</span>
                </div>
                <p className="mt-2 text-xs font-black uppercase tracking-[0.22em] text-white/70">{adminClockStatus(selectedScoreMatch)}</p>
              </div>
            </div>
          </div>
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
            <button type="button" onClick={() => applyClockAction("start")} className={scorerControlButtonClass("green")}>
              Start clock
            </button>
            {selectedScoreSport === "Football" ? (
              <button type="button" onClick={startFootballSecondHalf} className={scorerControlButtonClass("green")}>
                Start second half
              </button>
            ) : null}
            <button type="button" onClick={() => applyClockAction("pause")} className={scorerControlButtonClass("amber")}>
              Pause clock
            </button>
            <button type="button" onClick={() => applyClockAction("resume")} className={scorerControlButtonClass("blue")}>
              Resume clock
            </button>
            <button type="button" onClick={() => applyClockAction("reset")} className={scorerControlButtonClass("slate")}>
              Reset clock
            </button>
            <button className={clsx("flex items-center gap-2", scorerControlButtonClass("primary"))}>
              <Save size={16} aria-hidden="true" />
              Save score
            </button>
          </div>
        </form>
        {selectedScoreSport === "Football" ? (
          <form onSubmit={submitSubstitution} className="mt-5 grid gap-4 rounded-xl border border-blue-100 bg-blue-50 p-4 md:grid-cols-6">
            <div className="md:col-span-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-blue-950">Substitution event</h3>
                  <p className="mt-1 text-sm font-semibold text-blue-700">Save football substitutions to the live match timeline. Maximum 5 per team.</p>
                </div>
                {selectedSubstitutionTeam ? (
                  <span className={clsx("rounded-lg px-3 py-2 text-sm font-black", substitutionLimitReached ? "bg-red-100 text-red-700" : "bg-white text-blue-700")}>
                    {substitutionCount}/5 used
                  </span>
                ) : null}
              </div>
              {substitutionLimitReached ? (
                <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{selectedSubstitutionTeam?.name ?? "Team"} already used 5 substitutions.</p>
              ) : null}
            </div>
            <label className="md:col-span-2">
              <span className={labelClass()}>Match</span>
              <select value={selectedSubstitutionMatch?.id ?? ""} onChange={(event) => setSubstitutionForm({ ...substitutionForm, matchId: event.target.value, teamId: "", playerInId: "", playerOutId: "" })} className={inputClass()}>
                {scoreMatches.filter((match) => match.sport === "Football").map((match) => {
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
              <span className={labelClass()}>Team</span>
              <select value={selectedSubstitutionTeam?.id ?? ""} onChange={(event) => setSubstitutionForm({ ...substitutionForm, teamId: event.target.value, playerInId: "", playerOutId: "" })} className={inputClass()}>
                {substitutionTeamOptions.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className={labelClass()}>Minute</span>
              <input value={substitutionForm.minute} onChange={(event) => setSubstitutionForm({ ...substitutionForm, minute: event.target.value })} className={inputClass()} placeholder="62' or 90+1'" />
            </label>
            <label>
              <span className={labelClass()}>Player out</span>
              <select value={substitutionForm.playerOutId} onChange={(event) => setSubstitutionForm({ ...substitutionForm, playerOutId: event.target.value })} className={inputClass()}>
                <option value="">Select player</option>
                {substitutionPlayers.map((player) => (
                  <option key={player.id} value={player.id}>
                    #{player.number} {player.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className={labelClass()}>Player in</span>
              <select value={substitutionForm.playerInId} onChange={(event) => setSubstitutionForm({ ...substitutionForm, playerInId: event.target.value })} className={inputClass()}>
                <option value="">Select player</option>
                {substitutionPlayers.map((player) => (
                  <option key={player.id} value={player.id}>
                    #{player.number} {player.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <button disabled={substitutionLimitReached} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                <Plus size={16} aria-hidden="true" />
                Add substitution
              </button>
            </div>
          </form>
        ) : null}
        {scoreMatches.length === 0 ? <p className="mt-4 text-sm text-slate-400">No matches are available.</p> : null}
      </section>

      <section className={adminPanelClass("match_stats")}>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          {sectionTitle("Match team statistics", "Add professional match dashboard stats for the public match center.")}
          {selectedTeamStatsMatch ? sportBadge(selectedTeamStatsMatch.sport) : null}
        </div>
        <form key={`${selectedTeamStatsMatch?.id ?? "none"}-${data.matchTeamStats.length}`} onSubmit={submitMatchTeamStats} className="grid gap-5">
          <label className="block max-w-xl">
            <span className={labelClass()}>Match</span>
            <select value={selectedTeamStatsMatch?.id ?? ""} onChange={(event) => setSelectedTeamStatsMatchId(event.target.value)} className={inputClass()}>
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
          {selectedTeamStatsMatch ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {selectedTeamStatsTeams.map((team) => {
                const existingStats = getMatchTeamStats(data, selectedTeamStatsMatch.id, team.id);

                return (
                  <div key={team.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="mb-4">
                      <p className="font-black text-slate-900">{team.name}</p>
                      <p className="text-sm font-semibold text-slate-400">{team.id === selectedTeamStatsMatch.homeTeamId ? "Home team" : "Away team"}</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {matchTeamStatKeys.map((statKey) => (
                        <label key={statKey}>
                          <span className={labelClass()}>{matchTeamStatLabels[statKey]}</span>
                          <input name={`${team.id}:${statKey}`} type="number" min={0} max={statKey === "possession" ? 100 : undefined} defaultValue={existingStats.stats[statKey]} className={inputClass()} />
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No matches are available.</p>
          )}
          <div>
            <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              <Save size={16} aria-hidden="true" />
              Save match statistics
            </button>
          </div>
        </form>
      </section>

      <section className={adminPanelClass("live_scoring")}>
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
        {selectedPlayerStatMatch ? (
          <div className="sticky top-2 z-20 mb-5 rounded-xl border border-blue-200 bg-white/95 p-3 shadow-[0_14px_34px_rgba(37,99,235,0.16)] backdrop-blur">
            <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wide text-blue-600">Scoring match</p>
                <p className="orso-team-name orso-team-name-2 mt-1 text-base font-black text-slate-950">{selectedPlayerStatMatchTeams[0]?.name ?? "Home"} vs {selectedPlayerStatMatchTeams[1]?.name ?? "Away"}</p>
                <p className="mt-1 text-sm font-semibold text-slate-500">{selectedPlayerStatMatch.court} / {selectedPlayerStatMatch.status}</p>
              </div>
              <div className="rounded-xl bg-blue-700 px-5 py-3 text-center text-white">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/60">Clock</p>
                <p className="mt-1 text-4xl font-black leading-none">{adminClockDisplay(selectedPlayerStatMatch)}</p>
                <p className="mt-1 text-xs font-black uppercase tracking-wide text-white/70">{adminClockStatus(selectedPlayerStatMatch)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 px-5 py-3 text-center">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Score</p>
                <p className="mt-1 text-4xl font-black leading-none text-slate-950">{selectedPlayerStatMatch.homeScore} - {selectedPlayerStatMatch.awayScore}</p>
              </div>
            </div>
          </div>
        ) : null}
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
          <div className={clsx("mt-5 grid gap-3", compactScorerMode ? "lg:grid-cols-2" : "md:grid-cols-2")}>
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
                            <div key={stat} className="flex overflow-hidden rounded-lg border border-blue-200 bg-white shadow-sm">
                              <button
                                type="button"
                                onClick={() => adjustLivePlayerStat(player, stat, 1)}
                                className={clsx("px-3 py-1.5 text-sm font-bold text-blue-700 hover:bg-blue-50", compactScorerMode && "min-h-12 px-4 py-3 text-base font-black")}
                              >
                                {liveButtonLabel(stat, 1)}
                              </button>
                              <button
                                type="button"
                                onClick={() => adjustLivePlayerStat(player, stat, -1)}
                                disabled={(player.stats[stat] ?? 0) <= 0}
                                className={clsx("border-l border-blue-100 px-3 py-1.5 text-sm font-bold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-300", compactScorerMode && "min-h-12 px-4 py-3 text-base font-black")}
                              >
                                {liveButtonLabel(stat, -1)}
                              </button>
                            </div>
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
      <section className={adminPanelClass("club_admins")}>
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
