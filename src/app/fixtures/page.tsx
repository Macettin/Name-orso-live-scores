"use client";

import { MatchCard } from "@/components/match-card";
import { PageHeader, TournamentCoverBanner } from "@/components/ui";
import { useTournamentData } from "@/hooks/use-tournament-data";

export default function FixturesPage() {
  const { data, selectedTournamentId } = useTournamentData();
  const tournament = data.tournaments.find((item) => item.id === selectedTournamentId);

  return (
    <>
      <TournamentCoverBanner tournament={tournament} />
      <PageHeader title="Fixtures" description="Tournament schedule across every court and hall." />
      <div className="orso-mobile-swipe sm:grid sm:gap-4">
        {data.matches.map((match) => (
          <div key={match.id} className="orso-mobile-swipe-item">
            <MatchCard match={match} teams={data.teams} />
          </div>
        ))}
      </div>
    </>
  );
}
