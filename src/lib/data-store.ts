import type { Match, MatchStatus, Player, Standing, Team } from "./types";

export type TournamentData = {
  teams: Team[];
  players: Player[];
  matches: Match[];
};

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function createId(prefix: string, label: string) {
  const slug = slugify(label) || "item";
  return `${prefix}-${slug}-${Date.now().toString(36)}`;
}

export function getTeam(data: TournamentData, teamId: string) {
  return data.teams.find((team) => team.id === teamId);
}

export function getMatch(data: TournamentData, matchId: string) {
  return data.matches.find((match) => match.id === matchId);
}

export function teamPlayers(data: TournamentData, teamId: string) {
  return data.players.filter((player) => player.teamId === teamId);
}

export function teamMatches(data: TournamentData, teamId: string) {
  return data.matches.filter((match) => match.homeTeamId === teamId || match.awayTeamId === teamId);
}

export function normalizeMatch(data: TournamentData, match: Match): Match {
  const homeTeam = getTeam(data, match.homeTeamId);
  return {
    ...match,
    sport: homeTeam?.sport ?? match.sport,
    group: homeTeam?.group ?? match.group,
    hallSlug: slugify(match.court) || match.hallSlug || "main-hall"
  };
}

export function upsertTeam(data: TournamentData, team: Team): TournamentData {
  const exists = data.teams.some((item) => item.id === team.id);
  const teams = exists ? data.teams.map((item) => (item.id === team.id ? team : item)) : [...data.teams, team];
  const nextData = { ...data, teams };

  return {
    ...nextData,
    matches: nextData.matches.map((match) => normalizeMatch(nextData, match))
  };
}

export function deleteTeam(data: TournamentData, teamId: string): TournamentData {
  return {
    teams: data.teams.filter((team) => team.id !== teamId),
    players: data.players.filter((player) => player.teamId !== teamId),
    matches: data.matches.filter((match) => match.homeTeamId !== teamId && match.awayTeamId !== teamId)
  };
}

export function upsertPlayer(data: TournamentData, player: Player): TournamentData {
  const exists = data.players.some((item) => item.id === player.id);
  return {
    ...data,
    players: exists ? data.players.map((item) => (item.id === player.id ? player : item)) : [...data.players, player]
  };
}

export function deletePlayer(data: TournamentData, playerId: string): TournamentData {
  return {
    ...data,
    players: data.players.filter((player) => player.id !== playerId)
  };
}

export function upsertMatch(data: TournamentData, match: Match): TournamentData {
  const normalized = normalizeMatch(data, match);
  const exists = data.matches.some((item) => item.id === match.id);
  return {
    ...data,
    matches: exists ? data.matches.map((item) => (item.id === match.id ? normalized : item)) : [...data.matches, normalized]
  };
}

export function deleteMatch(data: TournamentData, matchId: string): TournamentData {
  return {
    ...data,
    matches: data.matches.filter((match) => match.id !== matchId)
  };
}

export function updateMatchScore(
  data: TournamentData,
  matchId: string,
  score: { homeScore: number; awayScore: number; periodLabel: string; status: MatchStatus }
): TournamentData {
  return {
    ...data,
    matches: data.matches.map((match) => (match.id === matchId ? { ...match, ...score } : match))
  };
}

export function buildStandings(data: TournamentData): Standing[] {
  return data.teams.map((team) => {
    const finalMatches = data.matches.filter(
      (match) => match.status === "Final" && (match.homeTeamId === team.id || match.awayTeamId === team.id)
    );

    return finalMatches.reduce<Standing>(
      (row, match) => {
        const isHome = match.homeTeamId === team.id;
        const pointsFor = isHome ? match.homeScore : match.awayScore;
        const pointsAgainst = isHome ? match.awayScore : match.homeScore;
        const won = pointsFor > pointsAgainst ? 1 : 0;

        return {
          ...row,
          played: row.played + 1,
          won: row.won + won,
          lost: row.lost + (won ? 0 : 1),
          pointsFor: row.pointsFor + pointsFor,
          pointsAgainst: row.pointsAgainst + pointsAgainst,
          tournamentPoints: row.tournamentPoints + (team.sport === "Volleyball" ? (won ? 3 : 0) : won ? 2 : 0)
        };
      },
      { teamId: team.id, played: 0, won: 0, lost: 0, pointsFor: 0, pointsAgainst: 0, tournamentPoints: 0 }
    );
  });
}
