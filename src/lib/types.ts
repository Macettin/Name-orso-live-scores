export const sportOptions = ["Volleyball", "Basketball", "Football"] as const;
export type Sport = (typeof sportOptions)[number];
export type MatchStatus = "Scheduled" | "Live" | "Final";
export type UserRole = "admin" | "scorer" | "viewer" | "club_admin";
export type TournamentStatus = "Scheduled" | "Live" | "Final" | "Archived";
export const tournamentSportOptions = ["Mixed", ...sportOptions] as const;
export type TournamentSportType = (typeof tournamentSportOptions)[number];
export type MatchEventType = "goal" | "yellow" | "red" | "substitution";
export const playerStatKeys = ["points", "goals", "assists", "rebounds", "blocks", "aces", "digs", "yellow_cards", "red_cards"] as const;
export type PlayerStatKey = (typeof playerStatKeys)[number];
export const playerStatsBySport = {
  Football: ["goals", "assists", "yellow_cards", "red_cards"],
  Basketball: ["points", "assists", "rebounds", "blocks"],
  Volleyball: ["points", "aces", "digs", "blocks"]
} as const satisfies Record<Sport, readonly PlayerStatKey[]>;
export const playerStatLabels: Record<PlayerStatKey, string> = {
  points: "Points / Goals",
  goals: "Points / Goals",
  assists: "Assists",
  rebounds: "Rebounds",
  blocks: "Blocks",
  aces: "Aces",
  digs: "Digs",
  yellow_cards: "Yellow cards",
  red_cards: "Red cards"
};
export const matchTeamStatKeys = ["total_shots", "shots_on_target", "corners", "fouls", "possession", "yellow_cards", "red_cards"] as const;
export type MatchTeamStatKey = (typeof matchTeamStatKeys)[number];
export const matchTeamStatLabels: Record<MatchTeamStatKey, string> = {
  total_shots: "Total shots",
  shots_on_target: "Shots on target",
  corners: "Corners",
  fouls: "Fouls",
  possession: "Possession",
  yellow_cards: "Yellow cards",
  red_cards: "Red cards"
};

export type Tournament = {
  id: string;
  name: string;
  sportType: TournamentSportType;
  location: string;
  startDate: string;
  endDate: string;
  status: TournamentStatus;
  logoUrl?: string;
  primaryColor?: string;
  sponsorName?: string;
  sponsorLogoUrl?: string;
};

export type Team = {
  id: string;
  tournamentId?: string;
  name: string;
  sport: Sport;
  group: string;
  logoUrl?: string;
  city: string;
  coach: string;
  colors: string;
};

export type Player = {
  id: string;
  tournamentId?: string;
  teamId: string;
  name: string;
  number: number;
  position: string;
  photoUrl?: string;
  stats: Record<PlayerStatKey, number>;
  baseStats?: Record<PlayerStatKey, number>;
};

export type Match = {
  id: string;
  tournamentId?: string;
  sport: Sport;
  group: string;
  court: string;
  hallSlug: string;
  date: string;
  time: string;
  status: MatchStatus;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  periodLabel: string;
  matchMinute?: string;
  clockLabel?: string;
  clockRunning?: boolean;
  clockStartedAt?: string;
  clockBaseSeconds?: number;
  clockCountdownSeconds?: number;
  youtubeUrl?: string;
  report?: string;
};

export type MatchEvent = {
  id: string;
  tournamentId?: string;
  matchId: string;
  teamId?: string;
  playerId?: string;
  type: MatchEventType;
  minute: string;
  description?: string;
  createdAt?: string;
};

export type PlayerMatchStat = {
  tournamentId?: string;
  matchId: string;
  teamId?: string;
  playerId: string;
  statKey: PlayerStatKey;
  value: number;
};

export type MatchTeamStats = {
  tournamentId?: string;
  matchId: string;
  teamId: string;
  stats: Record<MatchTeamStatKey, number>;
};

export type Standing = {
  teamId: string;
  played: number;
  won: number;
  lost: number;
  pointsFor: number;
  pointsAgainst: number;
  tournamentPoints: number;
};

export type UserProfile = {
  id: string;
  email: string;
  role: UserRole;
};

export type TeamAdmin = {
  userId: string;
  teamId: string;
  tournamentId: string;
};

export type TeamAdminAssignment = TeamAdmin & {
  email?: string;
  createdAt?: string;
};
