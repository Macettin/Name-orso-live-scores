import type { Metadata } from "next";
import TournamentApplyClient from "../tournament/[slug]/apply/tournament-apply-client";

export const metadata: Metadata = {
  title: "Apply / Join Tournament | Orso Live Scores",
  description: "Select a tournament and submit a public participation request."
};

export default function ApplyPage() {
  return <TournamentApplyClient />;
}
