import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { TournamentDataProvider } from "@/hooks/use-tournament-data";

export const metadata: Metadata = {
  title: "Orso Live Scores",
  description: "Live volleyball and basketball tournament scores, fixtures, standings, and reports."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <TournamentDataProvider>
          <AppShell>{children}</AppShell>
        </TournamentDataProvider>
      </body>
    </html>
  );
}
