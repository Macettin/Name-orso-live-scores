import type { Metadata } from "next";
import TournamentLandingClient from "./tournament-landing-client";

function titleFromSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const title = `${titleFromSlug(slug) || "Tournament"} | Orso Live Scores`;
  const description = "Live tournament hub with fixtures, standings, teams, top scorers, livestreams, and match updates.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: "/orso-logo.png", width: 1200, height: 630, alt: "Orso Live Scores" }]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/orso-logo.png"]
    }
  };
}

export default async function TournamentLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <TournamentLandingClient slug={slug} />;
}
