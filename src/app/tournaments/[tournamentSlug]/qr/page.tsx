import type { Metadata } from "next";
import TournamentQrPrintClient from "./tournament-qr-print-client";

function titleFromSlug(slug?: string) {
  return (slug ?? "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function generateMetadata({ params }: { params: Promise<{ tournamentSlug?: string }> }): Promise<Metadata> {
  const { tournamentSlug } = await params;
  const title = `${titleFromSlug(tournamentSlug) || "Tournament"} QR | Orso Sports Hub`;

  return {
    title,
    description: "Printable public tournament QR code for Orso Sports Hub."
  };
}

export default async function TournamentQrPrintPage({ params }: { params: Promise<{ tournamentSlug?: string }> }) {
  const { tournamentSlug = "" } = await params;
  return <TournamentQrPrintClient tournamentSlug={tournamentSlug} />;
}
