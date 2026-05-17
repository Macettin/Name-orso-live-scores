"use client";

import Link from "next/link";
import { Activity, CalendarDays, FileText, ShieldCheck } from "lucide-react";
import { MediaGrid } from "@/components/media-gallery";
import { MatchCard } from "@/components/match-card";
import { NewsCard } from "@/components/news-card";
import { activeSponsorsForTournament, SponsorStrip } from "@/components/sponsor-strip";
import { Card, TournamentCoverBanner } from "@/components/ui";
import { buildStandings } from "@/lib/data-store";
import { useTournamentData } from "@/hooks/use-tournament-data";

export default function Home() {
  const { data, selectedTournamentId } = useTournamentData();
  const liveMatches = data.matches.filter((match) => match.status === "Live");
  const nextFixtures = data.matches.filter((match) => match.status === "Scheduled").slice(0, 3);
  const standings = buildStandings(data);
  const tournament = data.tournaments.find((item) => item.id === selectedTournamentId);
  const latestNews = data.newsPosts
    .filter((post) => post.isPublished)
    .sort((first, second) => new Date(second.publishedAt).getTime() - new Date(first.publishedAt).getTime())
    .slice(0, 3);
  const latestMedia = data.mediaItems
    .filter((item) => item.isPublished)
    .sort((first, second) => new Date(second.publishedAt).getTime() - new Date(first.publishedAt).getTime())
    .slice(0, 6);
  const activeSponsors = activeSponsorsForTournament(data.sponsors, selectedTournamentId);
  const scoreboardMatch = liveMatches[0] ?? nextFixtures[0] ?? data.matches[0];
  const heroChips = [
    { label: "Live scores", href: "/live" },
    { label: "Team stats", href: "/standings" },
    { label: "Match timeline", href: scoreboardMatch ? `/matches/${scoreboardMatch.id}` : "/fixtures" },
    { label: "Apply / join", href: "/apply" },
    { label: "QR court pages", href: "/qr-print" }
  ];

  return (
    <>
      <section className="mb-8 overflow-hidden rounded-lg border border-blue-100 bg-white shadow-[0_20px_60px_rgba(37,99,235,0.14)]">
        <div className="home-hero relative overflow-hidden bg-gradient-to-br from-blue-950 via-blue-700 to-blue-500 px-5 py-8 text-white sm:px-7 lg:px-8 lg:py-10">
          <div className="absolute inset-x-0 top-0 h-px bg-white/35" />
          <div aria-hidden="true" className="home-hero-field" />
          <div aria-hidden="true" className="home-hero-glow home-hero-glow-one" />
          <div aria-hidden="true" className="home-hero-glow home-hero-glow-two" />
          <div aria-hidden="true" className="home-hero-athlete home-hero-athlete-one">
            <span className="home-hero-athlete-head" />
            <span className="home-hero-athlete-torso" />
            <span className="home-hero-athlete-arm home-hero-athlete-arm-front" />
            <span className="home-hero-athlete-arm home-hero-athlete-arm-back" />
            <span className="home-hero-athlete-leg home-hero-athlete-leg-front" />
            <span className="home-hero-athlete-leg home-hero-athlete-leg-back" />
          </div>
          <div aria-hidden="true" className="home-hero-athlete home-hero-athlete-two">
            <span className="home-hero-athlete-head" />
            <span className="home-hero-athlete-torso" />
            <span className="home-hero-athlete-arm home-hero-athlete-arm-front" />
            <span className="home-hero-athlete-arm home-hero-athlete-arm-back" />
            <span className="home-hero-athlete-leg home-hero-athlete-leg-front" />
            <span className="home-hero-athlete-leg home-hero-athlete-leg-back" />
          </div>
          <div aria-hidden="true" className="home-hero-icon home-hero-icon-ball">⚽</div>
          <div aria-hidden="true" className="home-hero-icon home-hero-icon-hoop">◎</div>
          <div aria-hidden="true" className="home-hero-icon home-hero-icon-pulse">⌁</div>
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-slate-950/55 via-blue-950/26 to-blue-950/46" />
          <div className="relative grid gap-7 lg:grid-cols-[1fr_0.42fr] lg:items-center">
            <div className="min-w-0">
              <div className="inline-flex max-w-full items-center rounded-full border border-white/20 bg-white/12 px-3 py-1.5 text-sm font-black uppercase tracking-wide text-blue-50 shadow-sm backdrop-blur">
                <span className="min-w-0 whitespace-normal break-words">{tournament?.name ?? "Tournament dashboard"}</span>
              </div>
              <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">Orso Sports Hub</h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-blue-50/90">
                Your digital sports event platform for fixtures, scoreboards, standings, team profiles, player stats, match reports, media, and court QR pages.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {heroChips.map((chip) => (
                  <Link
                    key={chip.label}
                    href={chip.href}
                    className="cursor-pointer rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-black text-blue-50 backdrop-blur transition duration-200 hover:scale-[1.03] hover:bg-white/18 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80"
                  >
                    {chip.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-white/18 bg-white/12 p-4 shadow-[0_18px_48px_rgba(15,23,42,0.20)] backdrop-blur md:p-5">
              <p className="text-sm font-semibold text-blue-50/80">Match operations</p>
              <div className="mt-4 grid gap-3">
                <Link
                  href="/apply"
                  className="inline-flex w-full items-center justify-center rounded-lg border border-white/30 bg-white/10 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-white/18"
                >
                  Apply / join tournament
                </Link>
                <Link
                  href="/live"
                  className="inline-flex w-full items-center justify-center rounded-lg border border-white/30 bg-white/10 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-white/18"
                >
                  View live scores
                </Link>
                {scoreboardMatch ? (
                  <Link
                    href={`/scoreboard/${scoreboardMatch.id}`}
                    className="inline-flex w-full items-center justify-center rounded-lg border border-white/30 bg-white/10 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-white/18"
                  >
                    Open scoreboard
                  </Link>
                ) : (
                  <span className="inline-flex w-full items-center justify-center rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-sm font-black text-white/60">Open scoreboard</span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="grid gap-0 border-t border-blue-100 bg-white sm:grid-cols-3">
          <div className="border-b border-blue-100 px-5 py-4 sm:border-b-0 sm:border-r">
            <p className="text-xs font-black uppercase tracking-wide text-blue-700">Selected tournament</p>
            <p className="mt-1 whitespace-normal break-words text-base font-black leading-snug text-slate-900 sm:text-lg">{tournament?.name ?? "Main Tournament"}</p>
          </div>
          <div className="border-b border-blue-100 px-5 py-4 sm:border-b-0 sm:border-r">
            <p className="text-xs font-black uppercase tracking-wide text-blue-700">Live matches</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{liveMatches.length}</p>
          </div>
          <div className="px-5 py-4">
            <p className="text-xs font-black uppercase tracking-wide text-blue-700">Upcoming</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{nextFixtures.length}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex items-center gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <Activity size={22} aria-hidden="true" />
          </span>
          <div>
            <p className="text-3xl font-black text-slate-900">{liveMatches.length}</p>
            <p className="text-sm font-medium text-slate-400">Live matches</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <CalendarDays size={22} aria-hidden="true" />
          </span>
          <div>
            <p className="text-3xl font-black text-slate-900">{data.matches.length}</p>
            <p className="text-sm font-medium text-slate-400">Fixtures</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <ShieldCheck size={22} aria-hidden="true" />
          </span>
          <div>
            <p className="text-3xl font-black text-slate-900">{data.teams.length}</p>
            <p className="text-sm font-medium text-slate-400">Teams</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <FileText size={22} aria-hidden="true" />
          </span>
          <div>
            <p className="text-3xl font-black text-slate-900">{standings.length}</p>
            <p className="text-sm font-medium text-slate-400">Table entries</p>
          </div>
        </Card>
      </div>
      <div className="mt-8">
        <SponsorStrip sponsors={activeSponsors} title="Featured sponsors" />
      </div>
      <TournamentCoverBanner tournament={tournament} />
      <section className="mt-8 rounded-lg border border-blue-100 bg-white p-4 shadow-[0_16px_42px_rgba(37,99,235,0.08)] sm:p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Newsroom</p>
            <h2 className="mt-1 text-xl font-black text-slate-900">Latest news and announcements</h2>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {latestNews.map((post) => (
            <NewsCard key={post.id} post={post} />
          ))}
          {latestNews.length === 0 ? (
            <p className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-5 text-sm font-semibold text-blue-700 md:col-span-3">
              Published tournament news will appear here.
            </p>
          ) : null}
        </div>
      </section>
      <section className="mt-8 rounded-lg border border-blue-100 bg-white p-4 shadow-[0_16px_42px_rgba(37,99,235,0.08)] sm:p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Gallery</p>
            <h2 className="mt-1 text-xl font-black text-slate-900">Latest tournament media</h2>
          </div>
          <Link href="/gallery" className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 hover:bg-blue-100">
            Open gallery
          </Link>
        </div>
        <MediaGrid items={latestMedia} emptyText="Published tournament media will appear here." />
      </section>
      <section className="mt-8 grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-900">Live now</h2>
            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black uppercase text-red-700">{liveMatches.length} live</span>
          </div>
          <div className="orso-mobile-swipe sm:grid sm:gap-4">
            {liveMatches.map((match) => (
              <div key={match.id} className="orso-mobile-swipe-item">
                <MatchCard match={match} teams={data.teams} />
              </div>
            ))}
            {liveMatches.length === 0 ? <p className="rounded-lg border border-blue-100 bg-white px-4 py-5 text-sm font-semibold text-slate-500">No matches are live right now.</p> : null}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
          <h2 className="mb-4 text-xl font-black text-slate-900">Coming up</h2>
          <div className="orso-mobile-swipe sm:grid sm:gap-4">
            {nextFixtures.map((match) => (
              <div key={match.id} className="orso-mobile-swipe-item">
                <MatchCard match={match} teams={data.teams} />
              </div>
            ))}
            {nextFixtures.length === 0 ? <p className="rounded-lg bg-slate-50 px-4 py-5 text-sm font-semibold text-slate-500">No scheduled matches are available.</p> : null}
          </div>
        </div>
      </section>
    </>
  );
}
