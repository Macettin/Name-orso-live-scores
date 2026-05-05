"use client";

import { PlayerStatTable } from "@/components/stat-table";
import { PageHeader } from "@/components/ui";
import { useTournamentData } from "@/hooks/use-tournament-data";

export default function PlayersPage() {
  const { data } = useTournamentData();
  const sortedPlayers = [...data.players].sort((a, b) => Math.max(b.stats.points, b.stats.goals) - Math.max(a.stats.points, a.stats.goals));

  return (
    <>
      <PageHeader title="Player stats" description="Sport-specific player leaderboard from shared tournament data." />
      <PlayerStatTable players={sortedPlayers} teams={data.teams} />
    </>
  );
}
