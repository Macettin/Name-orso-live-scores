import type { MatchEvent, Player } from "./types";

export type GroupedGoalScorer = {
  key: string;
  label: string;
  minutes: string[];
  player?: Player;
};

export function groupGoalEventsByScorer(events: MatchEvent[], players: Player[]): GroupedGoalScorer[] {
  const grouped = new Map<string, GroupedGoalScorer>();

  events.forEach((event) => {
    const player = event.playerId ? players.find((item) => item.id === event.playerId) : undefined;
    const label = player?.name ?? event.description?.trim() ?? "Goal";
    const key = player ? `player:${player.id}` : `description:${label.toLowerCase()}`;
    const existing = grouped.get(key);

    if (existing) {
      existing.minutes.push(event.minute);
      return;
    }

    grouped.set(key, {
      key,
      label,
      minutes: [event.minute],
      player
    });
  });

  return Array.from(grouped.values());
}
