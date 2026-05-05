"use client";

import { MatchCard } from "@/components/match-card";
import { PageHeader, TournamentBrand } from "@/components/ui";
import { useTournamentData } from "@/hooks/use-tournament-data";

export default function LivePage() {
  const { data, selectedTournamentId } = useTournamentData();
  const liveMatches = data.matches.filter((match) => match.status === "Live");
  const tournament = data.tournaments.find((item) => item.id === selectedTournamentId);

  return (
    <>
      <TournamentBrand tournament={tournament} />
      <PageHeader title="Live scores" description="Real-time match cards for matches currently in progress." />
      <div className="grid gap-4">
        {liveMatches.map((match) => (
          <MatchCard key={match.id} match={match} teams={data.teams} />
        ))}
      </div>
    </>
  );
}
