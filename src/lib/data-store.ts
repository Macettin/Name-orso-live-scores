import { matchTeamStatKeys } from "./types";
import type { AdminNotificationRead, Match, MatchEvent, MatchLineupEntry, MatchOfficialAssignment, MatchStatus, MatchTeamStats, MediaItem, NewsPost, Official, Player, PlayerMatchStat, PlayerStatKey, Sponsor, Standing, Team, TeamStaff, Tournament, TournamentApplication } from "./types";

export type TournamentData = {
  tournaments: Tournament[];
  teams: Team[];
  players: Player[];
  matches: Match[];
  events: MatchEvent[];
  matchLineups: MatchLineupEntry[];
  playerMatchStats: PlayerMatchStat[];
  matchTeamStats: MatchTeamStats[];
  officials: Official[];
  matchOfficials: MatchOfficialAssignment[];
  tournamentApplications: TournamentApplication[];
  newsPosts: NewsPost[];
  mediaItems: MediaItem[];
  sponsors: Sponsor[];
  teamStaff: TeamStaff[];
  adminNotificationReads: AdminNotificationRead[];
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
    events: data.events.filter((event) => event.teamId !== teamId && !removedMatchIds.has(event.matchId)),
    matchLineups: data.matchLineups.filter((entry) => entry.teamId !== teamId && !removedMatchIds.has(entry.matchId)),
    playerMatchStats: data.playerMatchStats.filter((stat) => stat.teamId !== teamId && !removedMatchIds.has(stat.matchId)),
    matchTeamStats: data.matchTeamStats.filter((stat) => stat.teamId !== teamId && !removedMatchIds.has(stat.matchId)),
    officials: data.officials,
    matchOfficials: data.matchOfficials.filter((assignment) => !removedMatchIds.has(assignment.matchId)),
    tournamentApplications: data.tournamentApplications,
    newsPosts: data.newsPosts,
    mediaItems: data.mediaItems,
    sponsors: data.sponsors,
    teamStaff: data.teamStaff.filter((staff) => staff.teamId !== teamId),
    adminNotificationReads: data.adminNotificationReads
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
    events: data.events.map((event) => (event.playerId === playerId || event.playerInId === playerId || event.playerOutId === playerId ? { ...event, playerId: event.playerId === playerId ? undefined : event.playerId, playerInId: event.playerInId === playerId ? undefined : event.playerInId, playerOutId: event.playerOutId === playerId ? undefined : event.playerOutId } : event)),
    matchLineups: data.matchLineups.filter((entry) => entry.playerId !== playerId),
    playerMatchStats: data.playerMatchStats.filter((stat) => stat.playerId !== playerId)
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
    events: data.events.filter((event) => event.matchId !== matchId),
    matchLineups: data.matchLineups.filter((entry) => entry.matchId !== matchId),
    playerMatchStats: data.playerMatchStats.filter((stat) => stat.matchId !== matchId),
    matchTeamStats: data.matchTeamStats.filter((stat) => stat.matchId !== matchId),
    matchOfficials: data.matchOfficials.filter((assignment) => assignment.matchId !== matchId)
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
              [statKey]: Math.max(0, item.stats[statKey] + amount)
            }
          }
        : item
    ),
    playerMatchStats: [
      ...data.playerMatchStats,
      {
        tournamentId: match.tournamentId,
        matchId,
        playerId,
        teamId: player.teamId,
        statKey,
        value: amount
      }
    ],
    matches: data.matches.map((item) =>
      item.id === matchId
        ? {
            ...item,
            homeScore: Math.max(0, item.homeScore + (isHomePlayer ? scoreIncrement : 0)),
            awayScore: Math.max(0, item.awayScore + (isAwayPlayer ? scoreIncrement : 0))
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
    events: data.events.filter((event) => event.tournamentId !== tournamentId),
    matchLineups: data.matchLineups.filter((entry) => entry.tournamentId !== tournamentId),
    playerMatchStats: data.playerMatchStats.filter((stat) => stat.tournamentId !== tournamentId),
    matchTeamStats: data.matchTeamStats.filter((stat) => stat.tournamentId !== tournamentId),
    officials: data.officials.filter((official) => official.tournamentId !== tournamentId),
    matchOfficials: data.matchOfficials.filter((assignment) => assignment.tournamentId !== tournamentId),
    tournamentApplications: data.tournamentApplications.filter((application) => application.tournamentId !== tournamentId),
    newsPosts: data.newsPosts.map((post) => (post.tournamentId === tournamentId ? { ...post, tournamentId: undefined } : post)),
    mediaItems: data.mediaItems.map((item) => (item.tournamentId === tournamentId ? { ...item, tournamentId: undefined } : item)),
    sponsors: data.sponsors.map((sponsor) => (sponsor.tournamentId === tournamentId ? { ...sponsor, tournamentId: undefined } : sponsor)),
    teamStaff: data.teamStaff.filter((staff) => staff.tournamentId !== tournamentId),
    adminNotificationReads: data.adminNotificationReads
  };
}

export function upsertAdminNotificationRead(data: TournamentData, read: AdminNotificationRead): TournamentData {
  const exists = data.adminNotificationReads.some((item) => item.userId === read.userId && item.notificationKey === read.notificationKey);
  return {
    ...data,
    adminNotificationReads: exists
      ? data.adminNotificationReads.map((item) => (item.userId === read.userId && item.notificationKey === read.notificationKey ? read : item))
      : [...data.adminNotificationReads, read]
  };
}

export function upsertTournamentApplication(data: TournamentData, application: TournamentApplication): TournamentData {
  const exists = data.tournamentApplications.some((item) => item.id === application.id);
  return {
    ...data,
    tournamentApplications: exists
      ? data.tournamentApplications.map((item) => (item.id === application.id ? application : item))
      : [...data.tournamentApplications, application]
  };
}

export function deleteTournamentApplication(data: TournamentData, applicationId: string): TournamentData {
  return {
    ...data,
    tournamentApplications: data.tournamentApplications.filter((application) => application.id !== applicationId)
  };
}

export function upsertNewsPost(data: TournamentData, post: NewsPost): TournamentData {
  const exists = data.newsPosts.some((item) => item.id === post.id);
  const newsPosts = exists ? data.newsPosts.map((item) => (item.id === post.id ? post : item)) : [...data.newsPosts, post];
  return {
    ...data,
    newsPosts: [...newsPosts].sort((first, second) => new Date(second.publishedAt).getTime() - new Date(first.publishedAt).getTime())
  };
}

export function deleteNewsPost(data: TournamentData, postId: string): TournamentData {
  return {
    ...data,
    newsPosts: data.newsPosts.filter((post) => post.id !== postId)
  };
}

export function upsertMediaItem(data: TournamentData, item: MediaItem): TournamentData {
  const exists = data.mediaItems.some((mediaItem) => mediaItem.id === item.id);
  const mediaItems = exists ? data.mediaItems.map((mediaItem) => (mediaItem.id === item.id ? item : mediaItem)) : [...data.mediaItems, item];
  return {
    ...data,
    mediaItems: [...mediaItems].sort((first, second) => new Date(second.publishedAt).getTime() - new Date(first.publishedAt).getTime())
  };
}

export function deleteMediaItem(data: TournamentData, itemId: string): TournamentData {
  return {
    ...data,
    mediaItems: data.mediaItems.filter((item) => item.id !== itemId)
  };
}

export function upsertSponsor(data: TournamentData, sponsor: Sponsor): TournamentData {
  const exists = data.sponsors.some((item) => item.id === sponsor.id);
  const sponsors = exists ? data.sponsors.map((item) => (item.id === sponsor.id ? sponsor : item)) : [...data.sponsors, sponsor];
  return {
    ...data,
    sponsors: [...sponsors].sort((first, second) => first.tier.localeCompare(second.tier) || first.name.localeCompare(second.name))
  };
}

export function deleteSponsor(data: TournamentData, sponsorId: string): TournamentData {
  return {
    ...data,
    sponsors: data.sponsors.filter((sponsor) => sponsor.id !== sponsorId)
  };
}

export function upsertTeamStaff(data: TournamentData, staff: TeamStaff): TournamentData {
  const exists = data.teamStaff.some((item) => item.id === staff.id);
  const teamStaff = exists ? data.teamStaff.map((item) => (item.id === staff.id ? staff : item)) : [...data.teamStaff, staff];
  return {
    ...data,
    teamStaff: [...teamStaff].sort((first, second) => first.teamId.localeCompare(second.teamId) || first.role.localeCompare(second.role) || first.name.localeCompare(second.name))
  };
}

export function deleteTeamStaff(data: TournamentData, staffId: string): TournamentData {
  return {
    ...data,
    teamStaff: data.teamStaff.filter((staff) => staff.id !== staffId)
  };
}

export function upsertOfficial(data: TournamentData, official: Official): TournamentData {
  const exists = data.officials.some((item) => item.id === official.id);
  return {
    ...data,
    officials: exists ? data.officials.map((item) => (item.id === official.id ? official : item)) : [...data.officials, official]
  };
}

export function deleteOfficial(data: TournamentData, officialId: string): TournamentData {
  return {
    ...data,
    officials: data.officials.filter((official) => official.id !== officialId),
    matchOfficials: data.matchOfficials.filter((assignment) => assignment.officialId !== officialId)
  };
}

export function upsertMatchOfficials(data: TournamentData, matchId: string, assignments: MatchOfficialAssignment[]): TournamentData {
  return {
    ...data,
    matchOfficials: [
      ...data.matchOfficials.filter((assignment) => assignment.matchId !== matchId),
      ...assignments
    ]
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

export function upsertMatchLineups(data: TournamentData, entries: MatchLineupEntry[]): TournamentData {
  const affectedKeys = new Set(entries.map((entry) => `${entry.matchId}:${entry.teamId}`));
  return {
    ...data,
    matchLineups: [
      ...data.matchLineups.filter((entry) => !affectedKeys.has(`${entry.matchId}:${entry.teamId}`)),
      ...entries
    ]
  };
}

export function emptyMatchTeamStats(matchId: string, teamId: string, tournamentId?: string): MatchTeamStats {
  return {
    tournamentId,
    matchId,
    teamId,
    stats: Object.fromEntries(matchTeamStatKeys.map((key) => [key, 0])) as MatchTeamStats["stats"]
  };
}

export function getMatchTeamStats(data: TournamentData, matchId: string, teamId: string) {
  return data.matchTeamStats.find((item) => item.matchId === matchId && item.teamId === teamId) ?? emptyMatchTeamStats(matchId, teamId, data.matches.find((match) => match.id === matchId)?.tournamentId);
}

export function upsertMatchTeamStats(data: TournamentData, stats: MatchTeamStats): TournamentData {
  const exists = data.matchTeamStats.some((item) => item.matchId === stats.matchId && item.teamId === stats.teamId);
  return {
    ...data,
    matchTeamStats: exists
      ? data.matchTeamStats.map((item) => (item.matchId === stats.matchId && item.teamId === stats.teamId ? stats : item))
      : [...data.matchTeamStats, stats]
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
