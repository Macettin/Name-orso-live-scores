"use client";

import { MatchCard } from "@/components/match-card";
import { PageHeader } from "@/components/ui";
import { useTournamentData } from "@/hooks/use-tournament-data";

export default function LivePage() {
  const { data } = useTournamentData();
  const liveMatches = data.matches.filter((match) => match.status === "Live");

  return (
    <>
      <PageHeader title="Live scores" description="Real-time match cards for matches currently in progress." />
      <div className="grid gap-4">
        {liveMatches.map((match) => (
          <MatchCard key={match.id} match={match} teams={data.teams} />
        ))}
      </div>
    </>
  );
}
