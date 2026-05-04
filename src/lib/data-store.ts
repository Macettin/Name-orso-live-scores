import type { Match, MatchStatus, Player, Standing, Team } from "./types";

export type TournamentData = {
  teams: Team[];
  players: Player[];
  matches: Match[];
};

export const defaultTournamentData: TournamentData = {
  teams: [
    { id: "orso-vc", name: "Orso VC", sport: "Volleyball", group: "Group A", city: "Istanbul", coach: "Mina Arslan", colors: "Emerald / White" },
    { id: "ankara-spikes", name: "Ankara Spikes", sport: "Volleyball", group: "Group A", city: "Ankara", coach: "Deniz Kaya", colors: "Navy / Lime" },
    { id: "izmir-waves", name: "Izmir Waves", sport: "Volleyball", group: "Group B", city: "Izmir", coach: "Selin Bora", colors: "Blue / White" },
    { id: "bursa-blockers", name: "Bursa Blockers", sport: "Volleyball", group: "Group B", city: "Bursa", coach: "Kerem Uslu", colors: "Black / Gold" },
    { id: "orso-hoops", name: "Orso Hoops", sport: "Basketball", group: "Group A", city: "Istanbul", coach: "Levent Sari", colors: "Emerald / Black" },
    { id: "capital-five", name: "Capital Five", sport: "Basketball", group: "Group A", city: "Ankara", coach: "Ece Yilmaz", colors: "Red / White" },
    { id: "aegean-rim", name: "Aegean Rim", sport: "Basketball", group: "Group B", city: "Izmir", coach: "Burak Tunc", colors: "Sky / Navy" },
    { id: "marmara-drive", name: "Marmara Drive", sport: "Basketball", group: "Group B", city: "Kocaeli", coach: "Aylin Keskin", colors: "Orange / Black" }
  ],
  players: [
    { id: "p-01", teamId: "orso-vc", name: "Lara Demir", number: 7, position: "Outside Hitter", stats: { points: 42, aces: 6, digs: 28, blocks: 4 } },
    { id: "p-02", teamId: "orso-vc", name: "Nehir Ak", number: 12, position: "Middle Blocker", stats: { points: 31, aces: 2, digs: 8, blocks: 11 } },
    { id: "p-03", teamId: "ankara-spikes", name: "Ipek Can", number: 4, position: "Setter", stats: { points: 18, aces: 5, digs: 24, blocks: 2 } },
    { id: "p-04", teamId: "orso-hoops", name: "Mert Ozan", number: 11, position: "Guard", stats: { points: 61, assists: 19, rebounds: 12 } },
    { id: "p-05", teamId: "orso-hoops", name: "Cem Eren", number: 22, position: "Forward", stats: { points: 48, assists: 8, rebounds: 27, blocks: 5 } },
    { id: "p-06", teamId: "capital-five", name: "Arda Koc", number: 3, position: "Guard", stats: { points: 55, assists: 22, rebounds: 9 } },
    { id: "p-07", teamId: "aegean-rim", name: "Efe Deniz", number: 9, position: "Wing", stats: { points: 44, assists: 11, rebounds: 20 } },
    { id: "p-08", teamId: "izmir-waves", name: "Duru Ekin", number: 15, position: "Opposite", stats: { points: 37, aces: 4, digs: 14, blocks: 6 } }
  ],
  matches: [
    { id: "m-1001", sport: "Volleyball", group: "Group A", court: "Court 1", hallSlug: "main-hall", date: "2026-05-03", time: "10:00", status: "Live", homeTeamId: "orso-vc", awayTeamId: "ankara-spikes", homeScore: 2, awayScore: 1, periodLabel: "Set 4", report: "Orso VC turned the second set with stronger serve pressure and late blocking from the middle." },
    { id: "m-1002", sport: "Basketball", group: "Group A", court: "Court 2", hallSlug: "main-hall", date: "2026-05-03", time: "11:30", status: "Live", homeTeamId: "orso-hoops", awayTeamId: "capital-five", homeScore: 54, awayScore: 49, periodLabel: "Q3 02:14", report: "Orso Hoops are controlling the paint, while Capital Five remain close through transition threes." },
    { id: "m-1003", sport: "Volleyball", group: "Group B", court: "Court 3", hallSlug: "east-hall", date: "2026-05-03", time: "13:00", status: "Scheduled", homeTeamId: "izmir-waves", awayTeamId: "bursa-blockers", homeScore: 0, awayScore: 0, periodLabel: "Warmup" },
    { id: "m-1004", sport: "Basketball", group: "Group B", court: "Court 4", hallSlug: "east-hall", date: "2026-05-03", time: "14:30", status: "Scheduled", homeTeamId: "aegean-rim", awayTeamId: "marmara-drive", homeScore: 0, awayScore: 0, periodLabel: "Pregame" },
    { id: "m-0998", sport: "Volleyball", group: "Group A", court: "Court 1", hallSlug: "main-hall", date: "2026-05-02", time: "17:00", status: "Final", homeTeamId: "orso-vc", awayTeamId: "bursa-blockers", homeScore: 3, awayScore: 0, periodLabel: "Final", report: "Orso VC opened the tournament with a clean sweep built on efficient side-out play." },
    { id: "m-0999", sport: "Basketball", group: "Group B", court: "Court 2", hallSlug: "main-hall", date: "2026-05-02", time: "19:00", status: "Final", homeTeamId: "aegean-rim", awayTeamId: "capital-five", homeScore: 78, awayScore: 74, periodLabel: "Final", report: "Aegean Rim closed the game on an 11-3 run after switching to a compact zone defense." }
  ]
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
