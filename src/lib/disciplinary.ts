import type { Match, MatchEvent, Player, Team } from "./types";

export const defaultYellowCardSuspensionThreshold = 2;
export const yellowCardSuspensionThresholdStorageKey = "orso-yellow-card-suspension-threshold";

export function readYellowCardSuspensionThreshold() {
  if (typeof window === "undefined") {
    return defaultYellowCardSuspensionThreshold;
  }

  const value = Number(window.localStorage.getItem(yellowCardSuspensionThresholdStorageKey));
  return Number.isFinite(value) && value > 0 ? value : defaultYellowCardSuspensionThreshold;
}

export type DisciplinaryRow = {
  player: Player;
  team?: Team;
  yellowCards: number;
  redCards: number;
  matchesSuspended: number;
  isSuspended: boolean;
  nextEligibleMatch?: Match;
  lastCardMatch?: Match;
};

function eventMinuteValue(event: MatchEvent) {
  const minute = Number.parseInt(event.minute.replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(minute) ? minute : 0;
}

function eventOrderValue(event: MatchEvent, matches: Match[]) {
  const match = matches.find((item) => item.id === event.matchId);
  return `${match?.date ?? ""} ${match?.time ?? ""} ${eventMinuteValue(event).toString().padStart(3, "0")} ${event.createdAt ?? ""}`;
}

export function disciplinaryRows({
  players,
  teams,
  matches,
  events,
  yellowThreshold = defaultYellowCardSuspensionThreshold
}: {
  players: Player[];
  teams: Team[];
  matches: Match[];
  events: MatchEvent[];
  yellowThreshold?: number;
}): DisciplinaryRow[] {
  return players
    .map((player) => {
      const playerEvents = events
        .filter((event) => event.playerId === player.id && (event.type === "yellow" || event.type === "red"))
        .sort((first, second) => eventOrderValue(first, matches).localeCompare(eventOrderValue(second, matches)));
      const yellowCards = playerEvents.filter((event) => event.type === "yellow").length;
      const redCards = playerEvents.filter((event) => event.type === "red").length;
      const matchesSuspended = redCards + Math.floor(yellowCards / yellowThreshold);
      const lastCardEvent = playerEvents[playerEvents.length - 1];
      const lastCardMatch = lastCardEvent ? matches.find((match) => match.id === lastCardEvent.matchId) : undefined;
      const teamMatches = matches
        .filter((match) => match.homeTeamId === player.teamId || match.awayTeamId === player.teamId)
        .sort((first, second) => `${first.date} ${first.time}`.localeCompare(`${second.date} ${second.time}`));
      const lastCardMatchIndex = lastCardMatch ? teamMatches.findIndex((match) => match.id === lastCardMatch.id) : -1;
      const matchesAfterCard = lastCardMatchIndex >= 0 ? teamMatches.slice(lastCardMatchIndex + 1) : [];
      const servedSuspensions = matchesAfterCard.filter((match) => match.status === "Final").length;
      const remainingSuspensions = Math.max(0, matchesSuspended - servedSuspensions);

      return {
        player,
        team: teams.find((team) => team.id === player.teamId),
        yellowCards,
        redCards,
        matchesSuspended: remainingSuspensions,
        isSuspended: remainingSuspensions > 0,
        nextEligibleMatch: matchesAfterCard[remainingSuspensions],
        lastCardMatch
      };
    })
    .filter((row) => row.yellowCards > 0 || row.redCards > 0 || row.isSuspended)
    .sort((first, second) => Number(second.isSuspended) - Number(first.isSuspended) || second.redCards - first.redCards || second.yellowCards - first.yellowCards || first.player.name.localeCompare(second.player.name));
}

export function disciplinaryRowForPlayer(player: Player, rows: DisciplinaryRow[]) {
  return rows.find((row) => row.player.id === player.id);
}
