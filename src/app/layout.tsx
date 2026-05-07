import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { TournamentDataProvider } from "@/hooks/use-tournament-data";

export const metadata: Metadata = {
  title: "Orso Live Scores",
  description: "Live volleyball and basketball tournament scores, fixtures, standings, and reports.",
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/orso-logo.png", type: "image/png" }
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  }
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
