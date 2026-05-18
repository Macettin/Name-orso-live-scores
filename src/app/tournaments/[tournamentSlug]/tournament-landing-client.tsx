"use client";

import Link from "next/link";
import { CalendarDays, MapPin, Newspaper, Radio, Shield, Trophy, Users } from "lucide-react";
import { MatchCard } from "@/components/match-card";
import { NewsCard } from "@/components/news-card";
import { TeamLogo } from "@/components/ui";
import { buildStandings, getTeam, slugify, type TournamentData } from "@/lib/data-store";
import { useTournamentData } from "@/hooks/use-tournament-data";
import type { Match, Team, Tournament } from "@/lib/types";

function formatDateRange(tournament: Tournament) {
  if (!tournament.startDate && !tournament.endDate) {
    return "Dates TBA";
  }

  if (!tournament.endDate || tournament.endDate === tournament.startDate) {
    return tournament.startDate || "Dates TBA";
  }

  return `${tournament.startDate || "Start TBA"} - ${tournament.endDate}`;
}

function tournamentTeams(data: TournamentData, tournamentId: string) {
  return data.teams.filter((team) => team.tournamentId === tournamentId || (!team.tournamentId && tournamentId === "main-tournament"));
}

function tournamentMatches(data: TournamentData, tournamentId: string, teams: Team[]) {
  const teamIds = new Set(teams.map((team) => team.id));
  return data.matches.filter(
    (match) =>
      match.tournamentId === tournamentId ||
      (!match.tournamentId && tournamentId === "main-tournament") ||
      teamIds.has(match.homeTeamId) ||
      teamIds.has(match.awayTeamId)
  );
}

function formatMatchDate(match: Match) {
  return [match.date, match.time, match.court].filter(Boolean).join(" / ");
}

function MatchSummaryCard({ match, data, tone }: { match: Match; data: TournamentData; tone: "fixture" | "result" }) {
  const home = getTeam(data, match.homeTeamId);
  const away = getTeam(data, match.awayTeamId);

  return (
    <Link href={`/matches/${match.id}`} className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/40">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <TeamLogo team={home} size="h-9 w-9" />
          <span className="orso-team-name orso-team-name-2 text-sm font-black text-slate-950">{home?.name ?? "Home"}</span>
        </div>
        <span className={tone === "result" ? "rounded-lg bg-blue-600 px-3 py-2 text-lg font-black leading-none text-white" : "rounded-lg bg-slate-100 px-3 py-2 text-sm font-black uppercase text-slate-600"}>
          {tone === "result" ? `${match.homeScore} - ${match.awayScore}` : "vs"}
        </span>
        <div className="flex min-w-0 items-center justify-end gap-2 text-right">
          <span className="orso-team-name orso-team-name-2 text-sm font-black text-slate-950">{away?.name ?? "Away"}</span>
          <TeamLogo team={away} size="h-9 w-9" />
        </div>
      </div>
      <p className="mt-3 text-xs font-black uppercase tracking-wide text-slate-500">{formatMatchDate(match)}</p>
    </Link>
  );
}

function SectionShell({ id, eyebrow, title, children }: { id?: string; eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 rounded-2xl border border-blue-100 bg-white p-4 shadow-[0_18px_44px_rgba(37,99,235,0.08)] sm:p-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-black text-slate-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-5 text-sm font-bold text-blue-700">{text}</p>;
}

export default function TournamentLandingClient({ tournamentSlug }: { tournamentSlug: string }) {
  const { data, selectedTournamentId, setSelectedTournamentId } = useTournamentData();
  const tournament = data.tournaments.find((item) => slugify(item.name) === tournamentSlug || item.id === tournamentSlug);

  if (!tournament) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-2xl font-black text-slate-950">Tournament not found</h1>
        <p className="mt-2 text-sm font-semibold text-slate-500">Check the tournament link or open the tournament directory.</p>
        <Link href="/tournaments" className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white">
          Browse tournaments
        </Link>
      </section>
    );
  }

  const accent = tournament.primaryColor || "#2563eb";
  const tournamentId = tournament.id;
  const teams = tournamentTeams(data, tournamentId);
  const matches = tournamentMatches(data, tournamentId, teams);
  const liveMatches = matches.filter((match) => match.status === "Live");
  const upcomingFixtures = matches
    .filter((match) => match.status === "Scheduled")
    .sort((first, second) => `${first.date} ${first.time}`.localeCompare(`${second.date} ${second.time}`))
    .slice(0, 6);
  const recentResults = matches
    .filter((match) => match.status === "Final")
    .sort((first, second) => `${second.date} ${second.time}`.localeCompare(`${first.date} ${first.time}`))
    .slice(0, 6);
  const teamIds = new Set(teams.map((team) => team.id));
  const standings = buildStandings({ ...data, teams, matches })
    .filter((standing) => teamIds.has(standing.teamId) && standing.played > 0)
    .sort((first, second) => second.tournamentPoints - first.tournamentPoints || second.pointsFor - first.pointsFor);
  const latestNews = data.newsPosts
    .filter((post) => post.isPublished && post.tournamentId === tournamentId)
    .sort((first, second) => new Date(second.publishedAt).getTime() - new Date(first.publishedAt).getTime())
    .slice(0, 3);

  function chooseTournament() {
    if (selectedTournamentId !== tournamentId) {
      setSelectedTournamentId(tournamentId);
    }
  }

  const quickLinks = [
    { label: "Fixtures", href: "#fixtures", icon: CalendarDays },
    { label: "Live Scores", href: "#live-scores", icon: Radio },
    { label: "Standings", href: "#standings", icon: Trophy },
    { label: "Teams", href: "#teams", icon: Users },
    { label: "News", href: "#news", icon: Newspaper }
  ];

  return (
    <main className="grid gap-5 pb-8">
      <section className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-[0_28px_70px_rgba(37,99,235,0.16)]">
        <div className="relative overflow-hidden px-4 py-6 text-white sm:px-7 sm:py-8" style={{ background: `radial-gradient(circle at top right, ${accent} 0%, #2563eb 42%, #0f172a 100%)` }}>
          <div className="absolute -right-20 top-0 h-72 w-72 rounded-full border border-white/10" />
          <div className="absolute -left-16 bottom-0 h-60 w-60 rounded-full border border-white/10" />
          <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.08)_0_1px,transparent_1px_54px)] opacity-35" />
          <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-4">
                {tournament.logoUrl ? (
                  <span className="h-20 w-20 shrink-0 rounded-2xl border border-white/20 bg-white/95 bg-contain bg-center bg-no-repeat p-3 shadow-xl sm:h-24 sm:w-24" style={{ backgroundImage: `url(${tournament.logoUrl})` }} />
                ) : (
                  <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-2xl font-black text-white shadow-xl sm:h-24 sm:w-24">
                    {tournament.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-white/60">Tournament landing page</p>
                  <h1 className="mt-2 break-words text-3xl font-black leading-tight sm:text-5xl">{tournament.name}</h1>
                </div>
              </div>

              <div className="mt-5 grid gap-2 text-sm font-bold text-white/80 sm:grid-cols-2">
                <span className="inline-flex min-w-0 items-center gap-2 rounded-xl bg-white/10 px-3 py-3 ring-1 ring-white/10">
                  <MapPin size={17} className="shrink-0" aria-hidden="true" />
                  <span className="min-w-0 break-words">{tournament.location || "Location TBA"}</span>
                </span>
                <span className="inline-flex min-w-0 items-center gap-2 rounded-xl bg-white/10 px-3 py-3 ring-1 ring-white/10">
                  <CalendarDays size={17} className="shrink-0" aria-hidden="true" />
                  <span className="min-w-0 break-words">{formatDateRange(tournament)}</span>
                </span>
              </div>

              <nav className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap" aria-label="Tournament public navigation">
                {quickLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={chooseTournament}
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/12 px-4 py-2 text-sm font-black text-white shadow-sm backdrop-blur transition hover:bg-white/20"
                    >
                      <Icon size={17} aria-hidden="true" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/12 p-4 shadow-xl backdrop-blur">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/55">Tournament status</p>
              <p className="mt-2 text-2xl font-black">{tournament.status}</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-white/10 px-2 py-3">
                  <p className="text-2xl font-black">{teams.length}</p>
                  <p className="text-xs font-bold text-white/60">Teams</p>
                </div>
                <div className="rounded-xl bg-white/10 px-2 py-3">
                  <p className="text-2xl font-black">{liveMatches.length}</p>
                  <p className="text-xs font-bold text-white/60">Live</p>
                </div>
                <div className="rounded-xl bg-white/10 px-2 py-3">
                  <p className="text-2xl font-black">{matches.length}</p>
                  <p className="text-xs font-bold text-white/60">Matches</p>
                </div>
              </div>
              {tournament.sponsorName || tournament.sponsorLogoUrl ? (
                <div className="mt-4 flex min-w-0 items-center gap-3 rounded-xl bg-white/10 px-3 py-3">
                  {tournament.sponsorLogoUrl ? <span className="h-10 w-24 shrink-0 rounded-lg bg-white bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${tournament.sponsorLogoUrl})` }} /> : null}
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-wide text-white/50">Sponsor</p>
                    <p className="break-words text-sm font-black">{tournament.sponsorName || "Official partner"}</p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <SectionShell id="live-scores" eyebrow="Live scores" title="Live matches">
        <div className="orso-mobile-swipe sm:grid sm:gap-4">
          {liveMatches.map((match) => (
            <div key={match.id} className="orso-mobile-swipe-item">
              <MatchCard match={match} teams={data.teams} />
            </div>
          ))}
        </div>
        {liveMatches.length === 0 ? <EmptyState text="No matches are live right now." /> : null}
      </SectionShell>

      <div className="grid gap-5 xl:grid-cols-2">
        <SectionShell id="fixtures" eyebrow="Schedule" title="Upcoming fixtures">
          <div className="grid gap-3">
            {upcomingFixtures.map((match) => (
              <MatchSummaryCard key={match.id} match={match} data={data} tone="fixture" />
            ))}
            {upcomingFixtures.length === 0 ? <EmptyState text="No upcoming fixtures are listed yet." /> : null}
          </div>
        </SectionShell>

        <SectionShell eyebrow="Results" title="Recent results">
          <div className="grid gap-3">
            {recentResults.map((match) => (
              <MatchSummaryCard key={match.id} match={match} data={data} tone="result" />
            ))}
            {recentResults.length === 0 ? <EmptyState text="Recent results will appear after final matches." /> : null}
          </div>
        </SectionShell>
      </div>

      <SectionShell id="standings" eyebrow="Table" title="Standings">
        <div className="grid gap-3 sm:hidden">
          {standings.map((standing, index) => {
            const team = getTeam(data, standing.teamId);
            return (
              <Link key={standing.teamId} href={team ? `/teams/${team.id}` : "/teams"} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-black text-white">{index + 1}</span>
                <div className="flex min-w-0 items-center gap-2">
                  <TeamLogo team={team} size="h-9 w-9" />
                  <span className="orso-team-name orso-team-name-2 text-sm font-black text-slate-950">{team?.name ?? "Team"}</span>
                </div>
                <span className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-black text-blue-700">{standing.tournamentPoints} pts</span>
              </Link>
            );
          })}
        </div>
        <div className="hidden overflow-x-auto rounded-xl border border-slate-200 sm:block">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3 text-right">P</th>
                <th className="px-4 py-3 text-right">W</th>
                <th className="px-4 py-3 text-right">L</th>
                <th className="px-4 py-3 text-right">For</th>
                <th className="px-4 py-3 text-right">Against</th>
                <th className="px-4 py-3 text-right">Pts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {standings.map((standing, index) => {
                const team = getTeam(data, standing.teamId);
                return (
                  <tr key={standing.teamId}>
                    <td className="px-4 py-3 font-black text-slate-500">{index + 1}</td>
                    <td className="px-4 py-3">
                      <Link href={team ? `/teams/${team.id}` : "/teams"} className="flex min-w-56 items-center gap-3 font-black text-slate-950 hover:text-blue-700">
                        <TeamLogo team={team} size="h-9 w-9" />
                        <span className="orso-team-name orso-team-name-2">{team?.name ?? "Team"}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right">{standing.played}</td>
                    <td className="px-4 py-3 text-right">{standing.won}</td>
                    <td className="px-4 py-3 text-right">{standing.lost}</td>
                    <td className="px-4 py-3 text-right">{standing.pointsFor}</td>
                    <td className="px-4 py-3 text-right">{standing.pointsAgainst}</td>
                    <td className="px-4 py-3 text-right font-black">{standing.tournamentPoints}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {standings.length === 0 ? <EmptyState text="Standings will appear after results are available." /> : null}
      </SectionShell>

      <SectionShell id="teams" eyebrow="Clubs" title="Participating teams">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {teams.map((team) => (
            <Link key={team.id} href={`/teams/${team.id}`} className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm transition hover:border-blue-200 hover:bg-blue-50">
              <TeamLogo team={team} size="h-12 w-12" />
              <div className="min-w-0">
                <p className="orso-team-name orso-team-name-2 text-sm font-black text-slate-950">{team.name}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">{team.city || team.group || team.sport}</p>
              </div>
            </Link>
          ))}
        </div>
        {teams.length === 0 ? <EmptyState text="Participating teams will appear after tournament setup." /> : null}
      </SectionShell>

      <SectionShell id="news" eyebrow="Newsroom" title="Latest tournament news">
        <div className="grid gap-4 md:grid-cols-3">
          {latestNews.map((post) => (
            <NewsCard key={post.id} post={post} />
          ))}
        </div>
        {latestNews.length === 0 ? <EmptyState text="Tournament news will appear here after publishing." /> : null}
      </SectionShell>

      <section className="grid gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { icon: CalendarDays, label: "Fixtures", href: "/fixtures" },
          { icon: Radio, label: "Live Scores", href: "/live" },
          { icon: Trophy, label: "Standings", href: "/standings" },
          { icon: Users, label: "Teams", href: "/teams" },
          { icon: Shield, label: "Tournament Directory", href: "/tournaments" }
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.label} href={item.href} onClick={chooseTournament} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-black text-blue-700 shadow-sm transition hover:bg-blue-600 hover:text-white">
              <Icon size={17} aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </section>
    </main>
  );
}
