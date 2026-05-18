import type { Metadata } from "next";
import TournamentLandingClient from "./tournament-landing-client";

function titleFromSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function generateMetadata({ params }: { params: Promise<{ tournamentSlug: string }> }): Promise<Metadata> {
  const { tournamentSlug } = await params;
  const title = `${titleFromSlug(tournamentSlug) || "Tournament"} | Orso Sports Hub`;
  const description = "Public tournament landing page with live matches, fixtures, standings, teams, results, and news.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: "/orso-logo.png", width: 1200, height: 630, alt: "Orso Sports Hub" }]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/orso-logo.png"]
    }
  };
}

export default async function TournamentLandingPage({ params }: { params: Promise<{ tournamentSlug: string }> }) {
  const { tournamentSlug } = await params;
  return <TournamentLandingClient tournamentSlug={tournamentSlug} />;
}
