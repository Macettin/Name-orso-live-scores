"use client";

import { MatchCard } from "@/components/match-card";
import { PageHeader } from "@/components/ui";
import { useTournamentData } from "@/hooks/use-tournament-data";

export default function FixturesPage() {
  const { data } = useTournamentData();

  return (
    <>
      <PageHeader title="Fixtures" description="Tournament schedule across every court and hall." />
      <div className="grid gap-4">
        {data.matches.map((match) => (
          <MatchCard key={match.id} match={match} teams={data.teams} />
        ))}
      </div>
    </>
  );
}
