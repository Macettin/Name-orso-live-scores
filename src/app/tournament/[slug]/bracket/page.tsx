import type { Metadata } from "next";
import TournamentBracketClient from "./tournament-bracket-client";

function titleFromSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const title = `${titleFromSlug(slug) || "Tournament"} Bracket | Orso Sports Hub`;
  const description = "Tournament phases, knockout bracket, winners, upcoming fixtures, and placement matches.";

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

export default async function TournamentBracketPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <TournamentBracketClient slug={slug} />;
}
