import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { matchTeamStatKeys, playerStatKeys, type Match, type MatchEvent, type MatchEventType, type MatchLineupEntry, type MatchLineupRole, type MatchOfficialAssignment, type MatchPhase, type MatchStatus, type MatchTeamStatKey, type MatchTeamStats, type Official, type OfficialRole, type Player, type PlayerMatchStat, type PlayerStatKey, type Team, type TeamAdmin, type TeamAdminAssignment, type Tournament, type TournamentStatus, type TournamentSportType, type UserProfile } from "./types";
import { normalizeMatch, slugify, type TournamentData } from "./data-store";
import { getYouTubeEmbedUrl } from "./youtube";

let browserClient: SupabaseClient | null = null;

export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function getSupabaseClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!browserClient) {
    browserClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  }

  return browserClient;
}

export async function getCurrentProfile(): Promise<UserProfile | null> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    throw userError;
  }

  if (!userData.user) {
    return null;
  }

  const { data, error } = await supabase.from("profiles").select("id,email,role").eq("id", userData.user.id).maybeSingle();
  if (error) {
    throw error;
  }

  return (data as UserProfile | null) ?? {
    id: userData.user.id,
    email: userData.user.email ?? "",
    role: "viewer"
  };
}

export async function signInWithEmail(email: string, password: string) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw error;
  }
}

export async function signOut() {
  const supabase = getSupabaseClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
}

type TeamRow = {
  id: string;
  tournament_id: string;
  name: string;
  sport: Team["sport"];
  group_name: string;
  logo_url: string | null;
  city: string | null;
  coach: string | null;
  colors: string | null;
};

type PlayerRow = {
  id: string;
  tournament_id: string;
  team_id: string;
  name: string;
  number: number;
  position: string | null;
  country: string | null;
  birthdate: string | null;
  photo_url: string | null;
  points: number | null;
  assists: number | null;
  rebounds: number | null;
  blocks: number | null;
  aces: number | null;
  digs: number | null;
  goals: number | null;
  yellow_cards: number | null;
  red_cards: number | null;
};

type MatchStatRow = {
  tournament_id: string;
  match_id: string;
  team_id: string | null;
  player_id: string | null;
  stat_key: string;
  stat_value: number | null;
};

type MatchTeamStatsRow = {
  tournament_id: string;
  match_id: string;
  team_id: string;
  total_shots: number | null;
  shots_on_target: number | null;
  corners: number | null;
  fouls: number | null;
  possession: number | null;
  yellow_cards: number | null;
  red_cards: number | null;
};

type MatchRow = {
  id: string;
  tournament_id: string;
  home_team_id: string;
  away_team_id: string;
  phase: MatchPhase | null;
  round_label: string | null;
  date: string;
  time: string;
  court: string;
  hall_slug: string;
  status: MatchStatus;
  home_score: number | null;
  away_score: number | null;
  period_label: string | null;
  match_minute: string | null;
  clock_label: string | null;
  clock_running: boolean | null;
  clock_started_at: string | null;
  clock_base_seconds: number | null;
  clock_countdown_seconds: number | null;
  youtube_url: string | null;
  report: string | null;
};

type MatchEventRow = {
  id: string;
  tournament_id: string;
  match_id: string;
  team_id: string | null;
  player_id: string | null;
  player_in_id?: string | null;
  player_out_id?: string | null;
  event_type: MatchEventType;
  minute: string;
  description: string | null;
  created_at: string | null;
};

type MatchLineupRow = {
  tournament_id: string;
  match_id: string;
  team_id: string;
  player_id: string;
  role: MatchLineupRole;
  x: number | null;
  y: number | null;
  formation: string | null;
};

type OfficialRow = {
  id: string;
  tournament_id: string;
  name: string;
  role: OfficialRole;
  country: string | null;
  city: string | null;
  photo_url: string | null;
};

type MatchOfficialRow = {
  tournament_id: string;
  match_id: string;
  official_id: string;
};

type TournamentRow = {
  id: string;
  name: string;
  sport_type: TournamentSportType;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  status: TournamentStatus;
  logo_url: string | null;
  primary_color: string | null;
  sponsor_name: string | null;
  sponsor_logo_url: string | null;
};

type TeamAdminRow = {
  user_id: string;
  team_id: string;
  tournament_id: string;
  created_at: string | null;
};

type ProfileEmailRow = {
  id: string;
  email: string | null;
};

function mapTournament(row: TournamentRow): Tournament {
  return {
    id: row.id,
    name: row.name,
    sportType: row.sport_type,
    location: row.location ?? "",
    startDate: row.start_date ?? "",
    endDate: row.end_date ?? "",
    status: row.status,
    logoUrl: row.logo_url ?? undefined,
    primaryColor: row.primary_color ?? undefined,
    sponsorName: row.sponsor_name ?? undefined,
    sponsorLogoUrl: row.sponsor_logo_url ?? undefined
  };
}

function mapTeam(row: TeamRow): Team {
  return {
    id: row.id,
    tournamentId: row.tournament_id,
    name: row.name,
    sport: row.sport,
    group: row.group_name,
    logoUrl: row.logo_url ?? undefined,
    city: row.city ?? "",
    coach: row.coach ?? "",
    colors: row.colors ?? ""
  };
}

function mapPlayer(row: PlayerRow, matchStatsByPlayer: Map<string, Partial<Player["stats"]>>): Player {
  const matchStats = matchStatsByPlayer.get(row.id);
  const baseStats: Player["stats"] = {
    points: row.points ?? 0,
    goals: row.goals ?? 0,
    assists: row.assists ?? 0,
    rebounds: row.rebounds ?? 0,
    blocks: row.blocks ?? 0,
    aces: row.aces ?? 0,
    digs: row.digs ?? 0,
    yellow_cards: row.yellow_cards ?? 0,
    red_cards: row.red_cards ?? 0
  };

  return {
    id: row.id,
    tournamentId: row.tournament_id,
    teamId: row.team_id,
    name: row.name,
    number: row.number,
    position: row.position ?? "",
    country: row.country ?? undefined,
    birthdate: row.birthdate ?? undefined,
    photoUrl: row.photo_url ?? undefined,
    baseStats,
    stats: {
      points: baseStats.points + (matchStats?.points ?? 0),
      goals: baseStats.goals + (matchStats?.goals ?? 0),
      assists: baseStats.assists + (matchStats?.assists ?? 0),
      rebounds: baseStats.rebounds + (matchStats?.rebounds ?? 0),
      blocks: baseStats.blocks + (matchStats?.blocks ?? 0),
      aces: baseStats.aces + (matchStats?.aces ?? 0),
      digs: baseStats.digs + (matchStats?.digs ?? 0),
      yellow_cards: baseStats.yellow_cards + (matchStats?.yellow_cards ?? 0),
      red_cards: baseStats.red_cards + (matchStats?.red_cards ?? 0)
    }
  };
}

function mapMatch(row: MatchRow, teams: Team[]): Match {
  const home = teams.find((team) => team.id === row.home_team_id);
  return {
    id: row.id,
    tournamentId: row.tournament_id,
    homeTeamId: row.home_team_id,
    awayTeamId: row.away_team_id,
    sport: home?.sport ?? "Volleyball",
    group: home?.group ?? "Group A",
    phase: row.phase ?? undefined,
    roundLabel: row.round_label ?? undefined,
    date: row.date,
    time: row.time,
    court: row.court,
    hallSlug: row.hall_slug,
    status: row.status,
    homeScore: row.home_score ?? 0,
    awayScore: row.away_score ?? 0,
    periodLabel: row.period_label ?? "",
    matchMinute: row.match_minute ?? undefined,
    clockLabel: row.clock_label ?? undefined,
    clockRunning: row.clock_running ?? false,
    clockStartedAt: row.clock_started_at ?? undefined,
    clockBaseSeconds: row.clock_base_seconds ?? undefined,
    clockCountdownSeconds: row.clock_countdown_seconds ?? undefined,
    youtubeUrl: row.youtube_url ?? undefined,
    report: row.report ?? undefined
  };
}

function mapMatchEvent(row: MatchEventRow): MatchEvent {
  return {
    id: row.id,
    tournamentId: row.tournament_id,
    matchId: row.match_id,
    teamId: row.team_id ?? undefined,
    playerId: row.player_id ?? undefined,
    playerInId: row.player_in_id ?? undefined,
    playerOutId: row.player_out_id ?? undefined,
    type: row.event_type,
    minute: row.minute,
    description: row.description ?? undefined,
    createdAt: row.created_at ?? undefined
  };
}

function mapMatchLineup(row: MatchLineupRow): MatchLineupEntry {
  return {
    tournamentId: row.tournament_id,
    matchId: row.match_id,
    teamId: row.team_id,
    playerId: row.player_id,
    role: row.role,
    x: row.x ?? undefined,
    y: row.y ?? undefined,
    formation: row.formation ?? undefined
  };
}

function mapOfficial(row: OfficialRow): Official {
  return {
    id: row.id,
    tournamentId: row.tournament_id,
    name: row.name,
    role: row.role,
    country: row.country ?? undefined,
    city: row.city ?? undefined,
    photoUrl: row.photo_url ?? undefined
  };
}

function mapMatchOfficial(row: MatchOfficialRow): MatchOfficialAssignment {
  return {
    tournamentId: row.tournament_id,
    matchId: row.match_id,
    officialId: row.official_id
  };
}

function mapPlayerMatchStat(row: MatchStatRow): PlayerMatchStat | null {
  if (!row.player_id || !playerStatKeys.includes(row.stat_key as PlayerStatKey)) {
    return null;
  }

  return {
    tournamentId: row.tournament_id,
    matchId: row.match_id,
    teamId: row.team_id ?? undefined,
    playerId: row.player_id,
    statKey: row.stat_key as PlayerStatKey,
    value: row.stat_value ?? 0
  };
}

function mapMatchTeamStats(row: MatchTeamStatsRow): MatchTeamStats {
  return {
    tournamentId: row.tournament_id,
    matchId: row.match_id,
    teamId: row.team_id,
    stats: {
      total_shots: row.total_shots ?? 0,
      shots_on_target: row.shots_on_target ?? 0,
      corners: row.corners ?? 0,
      fouls: row.fouls ?? 0,
      possession: row.possession ?? 0,
      yellow_cards: row.yellow_cards ?? 0,
      red_cards: row.red_cards ?? 0
    }
  };
}

function isMissingRelationError(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "42P01");
}

export async function fetchSupabaseTournamentData(tournamentId = "main-tournament"): Promise<TournamentData> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const [
    { data: tournamentRows, error: tournamentError },
    { data: teamRows, error: teamError },
    playerResult,
    { data: matchStatRows, error: matchStatError },
    { data: matchTeamStatsRows, error: matchTeamStatsError },
    { data: officialRows, error: officialError }
  ] = await Promise.all([
    supabase.from("tournaments").select("id,name,sport_type,location,start_date,end_date,status,logo_url,primary_color,sponsor_name,sponsor_logo_url").order("start_date").order("name"),
    supabase.from("teams").select("id,tournament_id,name,sport,group_name,logo_url,city,coach,colors").eq("tournament_id", tournamentId).order("name"),
    supabase
      .from("players")
      .select("id,tournament_id,team_id,name,number,position,country,birthdate,photo_url,points,goals,assists,rebounds,blocks,aces,digs,yellow_cards,red_cards")
      .eq("tournament_id", tournamentId)
      .order("name"),
    supabase.from("match_stats").select("tournament_id,match_id,team_id,player_id,stat_key,stat_value").eq("tournament_id", tournamentId),
    supabase
      .from("match_team_stats")
      .select("tournament_id,match_id,team_id,total_shots,shots_on_target,corners,fouls,possession,yellow_cards,red_cards")
      .eq("tournament_id", tournamentId),
    supabase.from("officials").select("id,tournament_id,name,role,country,city,photo_url").eq("tournament_id", tournamentId).order("name")
  ]);

  if (tournamentError) throw tournamentError;
  if (teamError) throw teamError;
  if (matchStatError) throw matchStatError;
  if (matchTeamStatsError && !isMissingRelationError(matchTeamStatsError)) throw matchTeamStatsError;
  if (officialError && !isMissingRelationError(officialError) && !(officialError.code === "PGRST204" || officialError.code === "42703")) throw officialError;

  let playerRows = playerResult.data as PlayerRow[] | null;
  if (playerResult.error && (playerResult.error.code === "PGRST204" || playerResult.error.code === "42703")) {
    const { data: fallbackPlayerRows, error: fallbackPlayerError } = await supabase
      .from("players")
      .select("id,tournament_id,team_id,name,number,position,photo_url,points,goals,assists,rebounds,blocks,aces,digs,yellow_cards,red_cards")
      .eq("tournament_id", tournamentId)
      .order("name");
    if (fallbackPlayerError) throw fallbackPlayerError;
    playerRows = fallbackPlayerRows as PlayerRow[] | null;
  } else if (playerResult.error) {
    throw playerResult.error;
  }

  const teams = ((teamRows ?? []) as TeamRow[]).map(mapTeam);
  const matchStatsByPlayer = new Map<string, Partial<Player["stats"]>>();

  const playerMatchStats = ((matchStatRows ?? []) as MatchStatRow[]).map(mapPlayerMatchStat).filter((stat): stat is PlayerMatchStat => Boolean(stat));

  for (const row of (matchStatRows ?? []) as MatchStatRow[]) {
    if (!row.player_id || !playerStatKeys.includes(row.stat_key as PlayerStatKey)) {
      continue;
    }

    const statKey = row.stat_key as PlayerStatKey;
    const stats = matchStatsByPlayer.get(row.player_id) ?? {};
    stats[statKey] = (stats[statKey] ?? 0) + (row.stat_value ?? 0);
    matchStatsByPlayer.set(row.player_id, stats);
  }

  const [
    matchResult,
    eventResult,
    { data: lineupRows, error: lineupError },
    { data: matchOfficialRows, error: matchOfficialError }
  ] = await Promise.all([
    supabase
    .from("matches")
      .select("id,tournament_id,home_team_id,away_team_id,phase,round_label,date,time,court,hall_slug,status,home_score,away_score,period_label,match_minute,clock_label,clock_running,clock_started_at,clock_base_seconds,clock_countdown_seconds,youtube_url,report")
    .eq("tournament_id", tournamentId)
    .order("date")
      .order("time"),
    supabase
      .from("match_events")
      .select("id,tournament_id,match_id,team_id,player_id,player_in_id,player_out_id,event_type,minute,description,created_at")
      .eq("tournament_id", tournamentId)
      .order("minute"),
    supabase
      .from("match_lineups")
      .select("tournament_id,match_id,team_id,player_id,role,x,y,formation")
      .eq("tournament_id", tournamentId),
    supabase
      .from("match_officials")
      .select("tournament_id,match_id,official_id")
      .eq("tournament_id", tournamentId)
  ]);

  let matchRows = matchResult.data as MatchRow[] | null;
  if (matchResult.error && (matchResult.error.code === "PGRST204" || matchResult.error.code === "42703")) {
    const { data: fallbackMatchRows, error: fallbackMatchError } = await supabase
      .from("matches")
      .select("id,tournament_id,home_team_id,away_team_id,date,time,court,hall_slug,status,home_score,away_score,period_label,match_minute,clock_label,clock_running,clock_started_at,clock_base_seconds,clock_countdown_seconds,youtube_url,report")
      .eq("tournament_id", tournamentId)
      .order("date")
      .order("time");
    if (fallbackMatchError) throw fallbackMatchError;
    matchRows = fallbackMatchRows as MatchRow[] | null;
  } else if (matchResult.error) {
    throw matchResult.error;
  }
  if (eventResult.error && !(eventResult.error.code === "PGRST204" || eventResult.error.code === "42703")) throw eventResult.error;
  if (lineupError && !isMissingRelationError(lineupError) && !(lineupError.code === "PGRST204" || lineupError.code === "42703")) throw lineupError;
  if (matchOfficialError && !isMissingRelationError(matchOfficialError) && !(matchOfficialError.code === "PGRST204" || matchOfficialError.code === "42703")) throw matchOfficialError;

  let eventRows = eventResult.data as MatchEventRow[] | null;
  if (eventResult.error && (eventResult.error.code === "PGRST204" || eventResult.error.code === "42703")) {
    const { data: fallbackEventRows, error: fallbackEventError } = await supabase
      .from("match_events")
      .select("id,tournament_id,match_id,team_id,player_id,event_type,minute,description,created_at")
      .eq("tournament_id", tournamentId)
      .order("minute");
    if (fallbackEventError) throw fallbackEventError;
    eventRows = fallbackEventRows as MatchEventRow[] | null;
  }

  let safeLineupRows = lineupRows as MatchLineupRow[] | null;
  if (lineupError && (lineupError.code === "PGRST204" || lineupError.code === "42703")) {
    const { data: fallbackLineupRows, error: fallbackLineupError } = await supabase
      .from("match_lineups")
      .select("tournament_id,match_id,team_id,player_id,role")
      .eq("tournament_id", tournamentId);
    if (fallbackLineupError && !isMissingRelationError(fallbackLineupError)) throw fallbackLineupError;
    safeLineupRows = fallbackLineupError ? [] : fallbackLineupRows as MatchLineupRow[] | null;
  }

  return {
    tournaments: ((tournamentRows ?? []) as TournamentRow[]).map(mapTournament),
    teams,
    players: ((playerRows ?? []) as PlayerRow[]).map((row) => mapPlayer(row, matchStatsByPlayer)),
    matches: ((matchRows ?? []) as MatchRow[]).map((row) => mapMatch(row, teams)),
    events: ((eventRows ?? []) as MatchEventRow[]).map(mapMatchEvent),
    matchLineups: lineupError && isMissingRelationError(lineupError) ? [] : ((safeLineupRows ?? []) as MatchLineupRow[]).map(mapMatchLineup),
    playerMatchStats,
    matchTeamStats: matchTeamStatsError ? [] : ((matchTeamStatsRows ?? []) as MatchTeamStatsRow[]).map(mapMatchTeamStats),
    officials: officialError ? [] : ((officialRows ?? []) as OfficialRow[]).map(mapOfficial),
    matchOfficials: matchOfficialError ? [] : ((matchOfficialRows ?? []) as MatchOfficialRow[]).map(mapMatchOfficial)
  };
}

export async function fetchSupabaseMyTeamAdmins(): Promise<TeamAdmin[]> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase.from("team_admins").select("user_id,team_id,tournament_id");
  if (error) throw error;

  return ((data ?? []) as TeamAdminRow[]).map((row) => ({
    userId: row.user_id,
    teamId: row.team_id,
    tournamentId: row.tournament_id
  }));
}

export async function fetchSupabaseTeamAdminAssignments(): Promise<TeamAdminAssignment[]> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase
    .from("team_admins")
    .select("user_id,team_id,tournament_id,created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as TeamAdminRow[];
  const userIds = Array.from(new Set(rows.map((row) => row.user_id)));
  const emailsByUserId = new Map<string, string>();

  if (userIds.length > 0) {
    const { data: profileRows, error: profileError } = await supabase.from("profiles").select("id,email").in("id", userIds);
    if (profileError) throw profileError;

    for (const profile of (profileRows ?? []) as ProfileEmailRow[]) {
      emailsByUserId.set(profile.id, profile.email ?? "");
    }
  }

  return rows.map((row) => ({
    userId: row.user_id,
    teamId: row.team_id,
    tournamentId: row.tournament_id,
    email: emailsByUserId.get(row.user_id) || undefined,
    createdAt: row.created_at ?? undefined
  }));
}

export async function deleteSupabaseTeamAdminAssignment(userId: string, teamId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const { error } = await supabase.from("team_admins").delete().eq("user_id", userId).eq("team_id", teamId);
  if (error) throw error;
}

export async function assignSupabaseClubAdmin(email: string, teamId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const { error } = await supabase.rpc("assign_club_admin", {
    p_email: email,
    p_team_id: teamId
  });
  if (error) throw error;
}

export async function saveSupabaseTournament(tournament: Tournament) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const { error } = await supabase.from("tournaments").upsert({
    id: tournament.id,
    name: tournament.name,
    sport_type: tournament.sportType,
    location: tournament.location || null,
    start_date: tournament.startDate || null,
    end_date: tournament.endDate || null,
    status: tournament.status,
    logo_url: tournament.logoUrl || null,
    primary_color: tournament.primaryColor || null,
    sponsor_name: tournament.sponsorName || null,
    sponsor_logo_url: tournament.sponsorLogoUrl || null
  });
  if (error) throw error;
}

export async function deleteSupabaseTournament(tournamentId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const { error } = await supabase.from("tournaments").delete().eq("id", tournamentId);
  if (error) throw error;
}

export async function saveSupabaseTeam(team: Team, tournamentId = "main-tournament") {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const { error } = await supabase.from("teams").upsert({
    id: team.id,
    tournament_id: team.tournamentId ?? tournamentId,
    name: team.name,
    sport: team.sport,
    group_name: team.group,
    logo_url: team.logoUrl ?? null,
    city: team.city,
    coach: team.coach,
    colors: team.colors
  });
  if (error) throw error;
}

export async function deleteSupabaseTeam(teamId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const { error } = await supabase.from("teams").delete().eq("id", teamId);
  if (error) throw error;
}

export async function saveSupabasePlayer(player: Player, tournamentId = "main-tournament") {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const payload = {
    id: player.id,
    tournament_id: player.tournamentId ?? tournamentId,
    team_id: player.teamId,
    name: player.name,
    number: player.number,
    position: player.position,
    country: player.country ?? null,
    birthdate: player.birthdate || null,
    photo_url: player.photoUrl ?? null,
    points: player.stats.points,
    goals: player.stats.goals,
    assists: player.stats.assists ?? 0,
    rebounds: player.stats.rebounds ?? 0,
    blocks: player.stats.blocks ?? 0,
    aces: player.stats.aces ?? 0,
    digs: player.stats.digs ?? 0,
    yellow_cards: player.stats.yellow_cards,
    red_cards: player.stats.red_cards
  };

  const { error } = await supabase.from("players").upsert(payload);
  if (error && (error.code === "PGRST204" || error.code === "42703")) {
    const fallbackPayload = {
      id: payload.id,
      tournament_id: payload.tournament_id,
      team_id: payload.team_id,
      name: payload.name,
      number: payload.number,
      position: payload.position,
      photo_url: payload.photo_url,
      points: payload.points,
      goals: payload.goals,
      assists: payload.assists,
      rebounds: payload.rebounds,
      blocks: payload.blocks,
      aces: payload.aces,
      digs: payload.digs,
      yellow_cards: payload.yellow_cards,
      red_cards: payload.red_cards
    };
    const { error: fallbackError } = await supabase.from("players").upsert(fallbackPayload);
    if (fallbackError) throw fallbackError;
    return;
  }
  if (error) throw error;
}

export async function uploadSupabasePlayerPhoto(playerId: string, file: File) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${playerId}/${Date.now().toString(36)}.${extension}`;
  const { error } = await supabase.storage.from("player-photos").upload(path, file, {
    cacheControl: "3600",
    upsert: true
  });
  if (error) throw error;

  const { data } = supabase.storage.from("player-photos").getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadSupabaseTeamLogo(teamId: string, file: File) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  const path = `${teamId}/${Date.now().toString(36)}.${extension}`;
  const { error } = await supabase.storage.from("team-logos").upload(path, file, {
    cacheControl: "3600",
    upsert: true
  });
  if (error) throw error;

  const { data } = supabase.storage.from("team-logos").getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteSupabasePlayer(playerId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const { error } = await supabase.from("players").delete().eq("id", playerId);
  if (error) throw error;
}

export async function saveSupabaseOfficial(official: Official, tournamentId = "main-tournament") {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const { error } = await supabase.from("officials").upsert({
    id: official.id,
    tournament_id: official.tournamentId ?? tournamentId,
    name: official.name,
    role: official.role,
    country: official.country || null,
    city: official.city || null,
    photo_url: official.photoUrl || null
  });
  if (error) throw error;
}

export async function deleteSupabaseOfficial(officialId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const { error } = await supabase.from("officials").delete().eq("id", officialId);
  if (error) throw error;
}

export async function saveSupabaseMatchOfficials(matchId: string, assignments: MatchOfficialAssignment[], tournamentId = "main-tournament") {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const { error: deleteError } = await supabase.from("match_officials").delete().eq("match_id", matchId);
  if (deleteError) throw deleteError;

  if (assignments.length === 0) {
    return;
  }

  const { error } = await supabase.from("match_officials").insert(
    assignments.map((assignment) => ({
      tournament_id: assignment.tournamentId ?? tournamentId,
      match_id: matchId,
      official_id: assignment.officialId
    }))
  );
  if (error) throw error;
}

export async function saveSupabaseMatch(data: TournamentData, match: Match, tournamentId = "main-tournament") {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const normalized = normalizeMatch(data, match);
  const { error } = await supabase.from("matches").upsert({
    id: normalized.id,
    tournament_id: normalized.tournamentId ?? tournamentId,
    home_team_id: normalized.homeTeamId,
    away_team_id: normalized.awayTeamId,
    date: normalized.date,
    time: normalized.time,
    court: normalized.court,
    hall_slug: normalized.hallSlug || slugify(normalized.court),
    status: normalized.status,
    home_score: normalized.homeScore,
    away_score: normalized.awayScore,
    period_label: normalized.periodLabel,
    match_minute: normalized.matchMinute ?? null,
    clock_label: normalized.clockLabel ?? null,
    clock_running: normalized.clockRunning ?? false,
    clock_started_at: normalized.clockStartedAt ?? null,
    clock_base_seconds: normalized.clockBaseSeconds ?? null,
    clock_countdown_seconds: normalized.clockCountdownSeconds ?? null,
    youtube_url: getYouTubeEmbedUrl(normalized.youtubeUrl) ?? null,
    report: normalized.report ?? null,
    phase: normalized.phase ?? null,
    round_label: normalized.roundLabel ?? null
  });
  if (error && (error.code === "PGRST204" || error.code === "42703")) {
    const { error: fallbackError } = await supabase.from("matches").upsert({
      id: normalized.id,
      tournament_id: normalized.tournamentId ?? tournamentId,
      home_team_id: normalized.homeTeamId,
      away_team_id: normalized.awayTeamId,
      date: normalized.date,
      time: normalized.time,
      court: normalized.court,
      hall_slug: normalized.hallSlug || slugify(normalized.court),
      status: normalized.status,
      home_score: normalized.homeScore,
      away_score: normalized.awayScore,
      period_label: normalized.periodLabel,
      match_minute: normalized.matchMinute ?? null,
      clock_label: normalized.clockLabel ?? null,
      clock_running: normalized.clockRunning ?? false,
      clock_started_at: normalized.clockStartedAt ?? null,
      clock_base_seconds: normalized.clockBaseSeconds ?? null,
      clock_countdown_seconds: normalized.clockCountdownSeconds ?? null,
      youtube_url: getYouTubeEmbedUrl(normalized.youtubeUrl) ?? null,
      report: normalized.report ?? null
    });
    if (fallbackError) throw fallbackError;
    return;
  }
  if (error) throw error;
}

export async function deleteSupabaseMatch(matchId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const { error } = await supabase.from("matches").delete().eq("id", matchId);
  if (error) throw error;
}

export async function saveSupabaseScore(
  matchId: string,
  score: {
    homeScore: number;
    awayScore: number;
    periodLabel: string;
    status: MatchStatus;
    matchMinute?: string;
    clockLabel?: string;
    clockRunning?: boolean;
    clockStartedAt?: string;
    clockBaseSeconds?: number;
    clockCountdownSeconds?: number;
  }
) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const { error } = await supabase
    .from("matches")
    .update({
      home_score: score.homeScore,
      away_score: score.awayScore,
      period_label: score.periodLabel,
      match_minute: score.matchMinute || null,
      clock_label: score.clockLabel || null,
      clock_running: score.clockRunning ?? false,
      clock_started_at: score.clockStartedAt ?? null,
      clock_base_seconds: score.clockBaseSeconds ?? null,
      clock_countdown_seconds: score.clockCountdownSeconds ?? null,
      status: score.status
    })
    .eq("id", matchId);
  if (error) throw error;
}

export async function saveSupabasePlayerMatchStat(matchId: string, playerId: string, statKey: PlayerStatKey, amount = 1) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const { error } = await supabase.rpc("add_player_match_stat", {
    p_match_id: matchId,
    p_player_id: playerId,
    p_stat_key: statKey,
    p_stat_value: amount
  });
  if (error) throw error;
}

export async function saveSupabaseMatchTeamStats(stats: MatchTeamStats, tournamentId = "main-tournament") {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const sanitizedStats = Object.fromEntries(matchTeamStatKeys.map((key) => [key, Math.max(0, Math.round(stats.stats[key] ?? 0))])) as Record<MatchTeamStatKey, number>;

  const { error } = await supabase.from("match_team_stats").upsert({
    tournament_id: stats.tournamentId ?? tournamentId,
    match_id: stats.matchId,
    team_id: stats.teamId,
    total_shots: sanitizedStats.total_shots,
    shots_on_target: sanitizedStats.shots_on_target,
    corners: sanitizedStats.corners,
    fouls: sanitizedStats.fouls,
    possession: sanitizedStats.possession,
    yellow_cards: sanitizedStats.yellow_cards,
    red_cards: sanitizedStats.red_cards
  });
  if (error) throw error;
}

export async function saveSupabaseMatchEvent(event: MatchEvent, tournamentId = "main-tournament") {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const payload = {
    id: event.id,
    tournament_id: event.tournamentId ?? tournamentId,
    match_id: event.matchId,
    team_id: event.teamId ?? null,
    player_id: event.playerId ?? null,
    player_in_id: event.playerInId ?? null,
    player_out_id: event.playerOutId ?? null,
    event_type: event.type,
    minute: event.minute,
    description: event.description ?? null
  };

  const { error } = await supabase.from("match_events").upsert(payload);
  if (error && (error.code === "PGRST204" || error.code === "42703")) {
    const { error: fallbackError } = await supabase.from("match_events").upsert({
      id: payload.id,
      tournament_id: payload.tournament_id,
      match_id: payload.match_id,
      team_id: payload.team_id,
      player_id: payload.player_id,
      event_type: payload.event_type,
      minute: payload.minute,
      description: payload.description
    });
    if (fallbackError) throw fallbackError;
    return;
  }
  if (error) throw error;
}

export async function saveSupabaseMatchLineups(entries: MatchLineupEntry[], tournamentId = "main-tournament") {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const firstEntry = entries[0];
  if (!firstEntry) {
    return;
  }

  const normalizedEntries = entries.map((entry) => ({
    tournament_id: entry.tournamentId ?? tournamentId,
    match_id: entry.matchId,
    team_id: entry.teamId,
    player_id: entry.playerId,
    role: entry.role,
    x: entry.x ?? null,
    y: entry.y ?? null,
    formation: entry.formation ?? null
  }));

  const { error: deleteError } = await supabase
    .from("match_lineups")
    .delete()
    .eq("tournament_id", firstEntry.tournamentId ?? tournamentId)
    .eq("match_id", firstEntry.matchId)
    .eq("team_id", firstEntry.teamId);
  if (deleteError) throw deleteError;

  const { error } = await supabase.from("match_lineups").upsert(normalizedEntries);
  if (error && (error.code === "PGRST204" || error.code === "42703")) {
    const legacyEntries = entries.map((entry) => ({
      tournament_id: entry.tournamentId ?? tournamentId,
      match_id: entry.matchId,
      team_id: entry.teamId,
      player_id: entry.playerId,
      role: entry.role
    }));
    const { error: fallbackError } = await supabase.from("match_lineups").upsert(legacyEntries);
    if (fallbackError) throw fallbackError;
    return;
  }
  if (error) throw error;
}

export async function deleteSupabaseMatchEvent(eventId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const { error } = await supabase.from("match_events").delete().eq("id", eventId);
  if (error) throw error;
}
