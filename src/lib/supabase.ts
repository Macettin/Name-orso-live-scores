import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Match, MatchStatus, Player, Team, UserProfile } from "./types";
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
  name: string;
  sport: Team["sport"];
  group_name: string;
  city: string | null;
  coach: string | null;
  colors: string | null;
};

type PlayerRow = {
  id: string;
  team_id: string;
  name: string;
  number: number;
  position: string | null;
  points: number | null;
  assists: number | null;
  rebounds: number | null;
  blocks: number | null;
  aces: number | null;
  digs: number | null;
};

type MatchStatRow = {
  player_id: string | null;
  stat_key: string;
  stat_value: number | null;
};

type MatchRow = {
  id: string;
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
  report: string | null;
};

function mapTeam(row: TeamRow): Team {
  return {
    id: row.id,
    name: row.name,
    sport: row.sport,
    group: row.group_name,
    city: row.city ?? "",
    coach: row.coach ?? "",
    colors: row.colors ?? ""
  };
}

const statKeys = ["points", "assists", "rebounds", "blocks", "aces", "digs"] as const;

function mapPlayer(row: PlayerRow, matchStatsByPlayer: Map<string, Partial<Player["stats"]>>): Player {
  const matchStats = matchStatsByPlayer.get(row.id);

  return {
    id: row.id,
    teamId: row.team_id,
    name: row.name,
    number: row.number,
    position: row.position ?? "",
    stats: {
      points: matchStats?.points ?? row.points ?? 0,
      assists: matchStats?.assists ?? row.assists ?? 0,
      rebounds: matchStats?.rebounds ?? row.rebounds ?? 0,
      blocks: matchStats?.blocks ?? row.blocks ?? 0,
      aces: matchStats?.aces ?? row.aces ?? 0,
      digs: matchStats?.digs ?? row.digs ?? 0
    }
  };
}

function mapMatch(row: MatchRow, teams: Team[]): Match {
  const home = teams.find((team) => team.id === row.home_team_id);
  return {
    id: row.id,
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
    report: row.report ?? undefined
  };
}

export async function fetchSupabaseTournamentData(): Promise<TournamentData> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const [
    { data: teamRows, error: teamError },
    { data: playerRows, error: playerError },
    { data: matchStatRows, error: matchStatError }
  ] = await Promise.all([
    supabase.from("teams").select("id,name,sport,group_name,city,coach,colors").order("name"),
    supabase.from("players").select("id,team_id,name,number,position,points,assists,rebounds,blocks,aces,digs").order("name"),
    supabase.from("match_stats").select("player_id,stat_key,stat_value")
  ]);

  if (teamError) throw teamError;
  if (playerError) throw playerError;
  if (matchStatError) throw matchStatError;

  const teams = ((teamRows ?? []) as TeamRow[]).map(mapTeam);
  const matchStatsByPlayer = new Map<string, Partial<Player["stats"]>>();

  for (const row of (matchStatRows ?? []) as MatchStatRow[]) {
    if (!row.player_id || !statKeys.includes(row.stat_key as (typeof statKeys)[number])) {
      continue;
    }

    const statKey = row.stat_key as keyof Player["stats"];
    const stats = matchStatsByPlayer.get(row.player_id) ?? {};
    stats[statKey] = (stats[statKey] ?? 0) + (row.stat_value ?? 0);
    matchStatsByPlayer.set(row.player_id, stats);
  }

  const { data: matchRows, error: matchError } = await supabase
    .from("matches")
    .select("id,home_team_id,away_team_id,date,time,court,hall_slug,status,home_score,away_score,period_label,report")
    .order("date")
    .order("time");

  if (matchError) throw matchError;

  return {
    teams,
    players: ((playerRows ?? []) as PlayerRow[]).map((row) => mapPlayer(row, matchStatsByPlayer)),
    matches: ((matchRows ?? []) as MatchRow[]).map((row) => mapMatch(row, teams))
  };
}

export async function saveSupabaseTeam(team: Team) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const { error } = await supabase.from("teams").upsert({
    id: team.id,
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

export async function saveSupabasePlayer(player: Player) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const { error } = await supabase.from("players").upsert({
    id: player.id,
    team_id: player.teamId,
    name: player.name,
    number: player.number,
    position: player.position,
    points: player.stats.points,
    assists: player.stats.assists ?? 0,
    rebounds: player.stats.rebounds ?? 0,
    blocks: player.stats.blocks ?? 0,
    aces: player.stats.aces ?? 0,
    digs: player.stats.digs ?? 0
  });
  if (error) throw error;
}

export async function deleteSupabasePlayer(playerId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const { error } = await supabase.from("players").delete().eq("id", playerId);
  if (error) throw error;
}

export async function saveSupabaseMatch(data: TournamentData, match: Match) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const normalized = normalizeMatch(data, match);
  const { error } = await supabase.from("matches").upsert({
    id: normalized.id,
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
  score: { homeScore: number; awayScore: number; periodLabel: string; status: MatchStatus }
) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const { error } = await supabase
    .from("matches")
    .update({
      home_score: score.homeScore,
      away_score: score.awayScore,
      period_label: score.periodLabel,
      status: score.status
    })
    .eq("id", matchId);
  if (error) throw error;
}
