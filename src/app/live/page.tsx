"use client";

import { MatchCard } from "@/components/match-card";
import { PageHeader, TournamentCoverBanner } from "@/components/ui";
import { useTournamentData } from "@/hooks/use-tournament-data";

export default function LivePage() {
  const { data, selectedTournamentId } = useTournamentData();
  const liveMatches = data.matches.filter((match) => match.status === "Live");
  const tournament = data.tournaments.find((item) => item.id === selectedTournamentId);

  return (
    <>
      <TournamentCoverBanner tournament={tournament} />
      <PageHeader title="Live scores" description="Real-time match cards for matches currently in progress." />
      <div className="orso-mobile-swipe sm:grid sm:gap-4">
        {liveMatches.map((match) => (
          <div key={match.id} className="orso-mobile-swipe-item">
            <MatchCard match={match} teams={data.teams} />
          </div>
        ))}
      </div>
    </>
  );
}
