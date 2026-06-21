export const sportOptions = ["Volleyball", "Basketball", "Football", "Futsal"] as const;
export type Sport = (typeof sportOptions)[number];
export function isFootballLikeSport(sport?: string): sport is "Football" | "Futsal" {
  return sport === "Football" || sport === "Futsal";
}
export type MatchStatus = "Scheduled" | "Live" | "Final";
export type UserRole = "admin" | "scorer" | "viewer" | "club_admin";
export type TournamentStatus = "Scheduled" | "Live" | "Final" | "Archived";
export const tournamentSportOptions = ["Mixed", ...sportOptions] as const;
export type TournamentSportType = (typeof tournamentSportOptions)[number];
export function toTournamentSportType(value: string): TournamentSportType | null {
  return tournamentSportOptions.find((sportType) => sportType === value) ?? null;
}
export const matchPhaseOptions = ["Group Stage", "Quarter Final", "Semi Final", "Final", "3rd Place Match", "Placement Matches"] as const;
export type MatchPhase = (typeof matchPhaseOptions)[number];
export const officialRoleOptions = ["referee", "assistant referee", "fourth official", "table official", "commissioner"] as const;
export type OfficialRole = (typeof officialRoleOptions)[number];
export const rosterStatusOptions = ["Draft", "Submitted", "Approved", "Needs changes"] as const;
export type RosterStatus = (typeof rosterStatusOptions)[number];
export const tournamentApplicationStatusOptions = ["new", "contacted", "waiting_for_confirmation", "accepted", "rejected"] as const;
export type TournamentApplicationStatus = (typeof tournamentApplicationStatusOptions)[number];
export const newsCategoryOptions = ["News", "Announcement", "Result", "Media"] as const;
export type NewsCategory = (typeof newsCategoryOptions)[number];
export const mediaTypeOptions = ["photo", "video", "youtube"] as const;
export type MediaType = (typeof mediaTypeOptions)[number];
export const sponsorTierOptions = ["Main Sponsor", "Gold", "Silver", "Partner"] as const;
export type SponsorTier = (typeof sponsorTierOptions)[number];
export const teamStaffRoleOptions = ["Head Coach", "Assistant Coach", "Doctor", "Physio", "Team Manager", "Media Officer"] as const;
export type TeamStaffRole = (typeof teamStaffRoleOptions)[number];
export type MatchEventType = "goal" | "assist" | "yellow" | "red" | "substitution" | "own_goal" | "penalty_goal" | "missed_penalty";
export const playerStatKeys = ["points", "goals", "assists", "rebounds", "blocks", "aces", "digs", "yellow_cards", "red_cards"] as const;
export type PlayerStatKey = (typeof playerStatKeys)[number];
export const playerStatsBySport = {
  Football: ["goals", "assists", "yellow_cards", "red_cards"],
  Futsal: ["goals", "assists", "yellow_cards", "red_cards"],
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
  rosterStatus?: RosterStatus;
  rosterNote?: string;
  rosterLocked?: boolean;
  rosterSubmittedAt?: string;
  rosterApprovedAt?: string;
};

export type TournamentApplication = {
  id: string;
  tournamentId: string;
  teamId?: string;
  nameSurname: string;
  club: string;
  phone: string;
  email: string;
  estimatedPlayers: number;
  ageGroup: string;
  estimatedStaff: number;
  country?: string;
  city?: string;
  sport?: string;
  notes?: string;
  adminNote?: string;
  status: TournamentApplicationStatus;
  lastContactedAt?: string;
  createdAt?: string;
};

export type NewsPost = {
  id: string;
  title: string;
  summary: string;
  content: string;
  imageUrl?: string;
  category: NewsCategory;
  tournamentId?: string;
  publishedAt: string;
  isPublished: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type MediaItem = {
  id: string;
  tournamentId?: string;
  title: string;
  type: MediaType;
  imageUrl?: string;
  videoUrl?: string;
  caption?: string;
  publishedAt: string;
  isPublished: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Sponsor = {
  id: string;
  name: string;
  logoUrl: string;
  websiteUrl?: string;
  tier: SponsorTier;
  tournamentId?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type TeamStaff = {
  id: string;
  tournamentId?: string;
  teamId: string;
  name: string;
  role: TeamStaffRole;
  phone?: string;
  email?: string;
  photoUrl?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type AdminNotificationRead = {
  userId: string;
  notificationKey: string;
  readAt: string;
};

export type Player = {
  id: string;
  tournamentId?: string;
  teamId: string;
  name: string;
  number: number;
  position: string;
  country?: string;
  birthdate?: string;
  photoUrl?: string;
  stats: Record<PlayerStatKey, number>;
  baseStats?: Record<PlayerStatKey, number>;
};

export type Match = {
  id: string;
  tournamentId?: string;
  sport: Sport;
  group: string;
  phase?: MatchPhase;
  roundLabel?: string;
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
  playerInId?: string;
  playerOutId?: string;
  type: MatchEventType;
  minute: string;
  description?: string;
  createdAt?: string;
};

export const matchLineupRoles = ["starting", "substitute", "reserve"] as const;
export type MatchLineupRole = (typeof matchLineupRoles)[number];

export type MatchLineupEntry = {
  tournamentId?: string;
  matchId: string;
  teamId: string;
  playerId: string;
  role: MatchLineupRole;
  x?: number;
  y?: number;
  formation?: string;
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

export type Official = {
  id: string;
  tournamentId?: string;
  name: string;
  role: OfficialRole;
  country?: string;
  city?: string;
  photoUrl?: string;
};

export type MatchOfficialAssignment = {
  tournamentId?: string;
  matchId: string;
  officialId: string;
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
