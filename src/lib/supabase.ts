import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { playerStatKeys, type Match, type MatchEvent, type MatchEventType, type MatchStatus, type Player, type PlayerStatKey, type Team, type Tournament, type TournamentStatus, type TournamentSportType, type UserProfile } from "./types";
import { normalizeMatch, slugify, type TournamentData } from "./data-store";

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
  player_id: string | null;
  stat_key: string;
  stat_value: number | null;
};

type MatchRow = {
  id: string;
  tournament_id: string;
  home_team_id: string;
  away_team_id: string;
  date: string;
  time: string;
  court: string;
  hall_slug: string;
  status: MatchStatus;
  home_score: number | null;
  away_score: number | null;
  period_label: string | null;
  match_minute: string | null;
  report: string | null;
};

type MatchEventRow = {
  id: string;
  tournament_id: string;
  match_id: string;
  team_id: string | null;
  player_id: string | null;
  event_type: MatchEventType;
  minute: string;
  description: string | null;
  created_at: string | null;
};

type TournamentRow = {
  id: string;
  name: string;
  sport_type: TournamentSportType;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  status: TournamentStatus;
};

function mapTournament(row: TournamentRow): Tournament {
  return {
    id: row.id,
    name: row.name,
    sportType: row.sport_type,
    location: row.location ?? "",
    startDate: row.start_date ?? "",
    endDate: row.end_date ?? "",
    status: row.status
  };
}

function mapTeam(row: TeamRow): Team {
  return {
    id: row.id,
    tournamentId: row.tournament_id,
    name: row.name,
    sport: row.sport,
    group: row.group_name,
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
    date: row.date,
    time: row.time,
    court: row.court,
    hallSlug: row.hall_slug,
    status: row.status,
    homeScore: row.home_score ?? 0,
    awayScore: row.away_score ?? 0,
    periodLabel: row.period_label ?? "",
    matchMinute: row.match_minute ?? undefined,
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
    type: row.event_type,
    minute: row.minute,
    description: row.description ?? undefined,
    createdAt: row.created_at ?? undefined
  };
}

export async function fetchSupabaseTournamentData(tournamentId = "main-tournament"): Promise<TournamentData> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const [
    { data: tournamentRows, error: tournamentError },
    { data: teamRows, error: teamError },
    { data: playerRows, error: playerError },
    { data: matchStatRows, error: matchStatError }
  ] = await Promise.all([
    supabase.from("tournaments").select("id,name,sport_type,location,start_date,end_date,status").order("start_date").order("name"),
    supabase.from("teams").select("id,tournament_id,name,sport,group_name,city,coach,colors").eq("tournament_id", tournamentId).order("name"),
    supabase
      .from("players")
      .select("id,tournament_id,team_id,name,number,position,photo_url,points,goals,assists,rebounds,blocks,aces,digs,yellow_cards,red_cards")
      .eq("tournament_id", tournamentId)
      .order("name"),
    supabase.from("match_stats").select("tournament_id,player_id,stat_key,stat_value").eq("tournament_id", tournamentId)
  ]);

  if (tournamentError) throw tournamentError;
  if (teamError) throw teamError;
  if (playerError) throw playerError;
  if (matchStatError) throw matchStatError;

  const teams = ((teamRows ?? []) as TeamRow[]).map(mapTeam);
  const matchStatsByPlayer = new Map<string, Partial<Player["stats"]>>();

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
    { data: matchRows, error: matchError },
    { data: eventRows, error: eventError }
  ] = await Promise.all([
    supabase
    .from("matches")
      .select("id,tournament_id,home_team_id,away_team_id,date,time,court,hall_slug,status,home_score,away_score,period_label,match_minute,report")
    .eq("tournament_id", tournamentId)
    .order("date")
      .order("time"),
    supabase
      .from("match_events")
      .select("id,tournament_id,match_id,team_id,player_id,event_type,minute,description,created_at")
      .eq("tournament_id", tournamentId)
      .order("minute")
  ]);

  if (matchError) throw matchError;
  if (eventError) throw eventError;

  return {
    tournaments: ((tournamentRows ?? []) as TournamentRow[]).map(mapTournament),
    teams,
    players: ((playerRows ?? []) as PlayerRow[]).map((row) => mapPlayer(row, matchStatsByPlayer)),
    matches: ((matchRows ?? []) as MatchRow[]).map((row) => mapMatch(row, teams)),
    events: ((eventRows ?? []) as MatchEventRow[]).map(mapMatchEvent)
  };
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
    status: tournament.status
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

  const { error } = await supabase.from("players").upsert({
    id: player.id,
    tournament_id: player.tournamentId ?? tournamentId,
    team_id: player.teamId,
    name: player.name,
    number: player.number,
    position: player.position,
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
  });
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

export async function deleteSupabasePlayer(playerId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const { error } = await supabase.from("players").delete().eq("id", playerId);
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
    report: normalized.report ?? null
  });
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
  score: { homeScore: number; awayScore: number; periodLabel: string; status: MatchStatus; matchMinute?: string }
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

export async function saveSupabaseMatchEvent(event: MatchEvent, tournamentId = "main-tournament") {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const { error } = await supabase.from("match_events").upsert({
    id: event.id,
    tournament_id: event.tournamentId ?? tournamentId,
    match_id: event.matchId,
    team_id: event.teamId ?? null,
    player_id: event.playerId ?? null,
    event_type: event.type,
    minute: event.minute,
    description: event.description ?? null
  });
  if (error) throw error;
}

export async function deleteSupabaseMatchEvent(eventId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const { error } = await supabase.from("match_events").delete().eq("id", eventId);
  if (error) throw error;
}
