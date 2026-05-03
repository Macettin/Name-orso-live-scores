"use client";

import { PlayerStatTable } from "@/components/stat-table";
import { PageHeader } from "@/components/ui";
import { useTournamentData } from "@/hooks/use-tournament-data";

export default function PlayersPage() {
  const { data } = useTournamentData();
  const sortedPlayers = [...data.players].sort((a, b) => b.stats.points - a.stats.points);

  return (
    <>
      <PageHeader title="Player stats" description="Combined volleyball and basketball player leaderboard from shared tournament data." />
      <PlayerStatTable players={sortedPlayers} teams={data.teams} />
    </>
  );
}
