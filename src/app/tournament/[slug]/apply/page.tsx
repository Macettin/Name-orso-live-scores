import type { Metadata } from "next";
import TournamentApplyClient from "./tournament-apply-client";

function titleFromSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const title = `Apply for ${titleFromSlug(slug) || "Tournament"} | Orso Live Scores`;
  const description = "Submit a public participation request for this tournament.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: "/orso-logo.png", width: 1200, height: 630, alt: "Orso Live Scores" }]
    }
  };
}

export default async function TournamentApplyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <TournamentApplyClient slug={slug} />;
}
