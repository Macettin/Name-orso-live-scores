import type { Match, MatchEvent, MatchStatus, Player, PlayerStatKey, Standing, Team, Tournament } from "./types";

export type TournamentData = {
  tournaments: Tournament[];
  teams: Team[];
  players: Player[];
  matches: Match[];
  events: MatchEvent[];
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
  const removedMatchIds = new Set(data.matches.filter((match) => match.homeTeamId === teamId || match.awayTeamId === teamId).map((match) => match.id));

  return {
    tournaments: data.tournaments,
    teams: data.teams.filter((team) => team.id !== teamId),
    players: data.players.filter((player) => player.teamId !== teamId),
    matches: data.matches.filter((match) => match.homeTeamId !== teamId && match.awayTeamId !== teamId),
    events: data.events.filter((event) => event.teamId !== teamId && !removedMatchIds.has(event.matchId))
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
    players: data.players.filter((player) => player.id !== playerId),
    events: data.events.map((event) => (event.playerId === playerId ? { ...event, playerId: undefined } : event))
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
    matches: data.matches.filter((match) => match.id !== matchId),
    events: data.events.filter((event) => event.matchId !== matchId)
  };
}

export function updateMatchScore(
  data: TournamentData,
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
): TournamentData {
  return {
    ...data,
    matches: data.matches.map((match) => (match.id === matchId ? { ...match, ...score } : match))
  };
}

export function addPlayerMatchStat(
  data: TournamentData,
  matchId: string,
  playerId: string,
  statKey: PlayerStatKey,
  amount = 1
): TournamentData {
  const match = getMatch(data, matchId);
  const player = data.players.find((item) => item.id === playerId);

  if (!match || !player) {
    return data;
  }

  const scoreIncrement = statKey === "points" || statKey === "goals" ? amount : 0;
  const isHomePlayer = player.teamId === match.homeTeamId;
  const isAwayPlayer = player.teamId === match.awayTeamId;

  return {
    ...data,
    players: data.players.map((item) =>
      item.id === playerId
        ? {
            ...item,
            stats: {
              ...item.stats,
              [statKey]: item.stats[statKey] + amount
            }
          }
        : item
    ),
    matches: data.matches.map((item) =>
      item.id === matchId
        ? {
            ...item,
            homeScore: item.homeScore + (isHomePlayer ? scoreIncrement : 0),
            awayScore: item.awayScore + (isAwayPlayer ? scoreIncrement : 0)
          }
        : item
    )
  };
}

export function upsertTournament(data: TournamentData, tournament: Tournament): TournamentData {
  const exists = data.tournaments.some((item) => item.id === tournament.id);

  return {
    ...data,
    tournaments: exists ? data.tournaments.map((item) => (item.id === tournament.id ? tournament : item)) : [...data.tournaments, tournament]
  };
}

export function deleteTournament(data: TournamentData, tournamentId: string): TournamentData {
  return {
    tournaments: data.tournaments.filter((tournament) => tournament.id !== tournamentId),
    teams: data.teams.filter((team) => team.tournamentId !== tournamentId),
    players: data.players.filter((player) => player.tournamentId !== tournamentId),
    matches: data.matches.filter((match) => match.tournamentId !== tournamentId),
    events: data.events.filter((event) => event.tournamentId !== tournamentId)
  };
}

export function upsertMatchEvent(data: TournamentData, event: MatchEvent): TournamentData {
  const exists = data.events.some((item) => item.id === event.id);

  return {
    ...data,
    events: exists ? data.events.map((item) => (item.id === event.id ? event : item)) : [...data.events, event]
  };
}

export function deleteMatchEvent(data: TournamentData, eventId: string): TournamentData {
  return {
    ...data,
    events: data.events.filter((event) => event.id !== eventId)
  };
}

export function buildStandings(data: TournamentData): Standing[] {
  const winPointsBySport: Record<Team["sport"], number> = {
    Volleyball: 3,
    Basketball: 2,
    Football: 3
  };

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
          tournamentPoints: row.tournamentPoints + (won ? winPointsBySport[team.sport] : 0)
        };
      },
      { teamId: team.id, played: 0, won: 0, lost: 0, pointsFor: 0, pointsAgainst: 0, tournamentPoints: 0 }
    );
  });
}
