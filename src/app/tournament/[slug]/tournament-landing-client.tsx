"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ExternalLink, GitBranch, MapPin, PlayCircle, Radio, Shield, Star, Trophy, Users } from "lucide-react";
import { LiveUpdateIndicator } from "@/components/live-update-indicator";
import { MediaGrid } from "@/components/media-gallery";
import { NewsCard } from "@/components/news-card";
import { activeSponsorsForTournament, SponsorStrip as ManagedSponsorStrip } from "@/components/sponsor-strip";
import { TeamLogo } from "@/components/ui";
import { YouTubeEmbed } from "@/components/youtube-embed";
import { useTournamentData } from "@/hooks/use-tournament-data";
import { buildStandings, getTeam, slugify } from "@/lib/data-store";
import type { Match, Player, Team, Tournament } from "@/lib/types";

function formatDateRange(tournament: Tournament) {
  if (!tournament.endDate || tournament.endDate === tournament.startDate) {
    return tournament.startDate || "Dates TBA";
  }

  return `${tournament.startDate || "Start TBA"} - ${tournament.endDate}`;
}

function teamName(match: Match, teams: ReturnType<typeof getTeam>[]) {
  const home = teams.find((team) => team?.id === match.homeTeamId);
  const away = teams.find((team) => team?.id === match.awayTeamId);
  return `${home?.name ?? "Home"} vs ${away?.name ?? "Away"}`;
}

function TournamentLogoMark({ tournament }: { tournament: Tournament }) {
  if (tournament.logoUrl) {
    return (
      <span
        aria-hidden="true"
        className="h-20 w-20 shrink-0 rounded-2xl border border-white/20 bg-white/95 bg-contain bg-center bg-no-repeat p-3 shadow-xl sm:h-24 sm:w-24"
        style={{ backgroundImage: `url(${tournament.logoUrl})` }}
      />
    );
  }

  return (
    <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-2xl font-black text-white shadow-xl sm:h-24 sm:w-24">
      {tournament.name.slice(0, 2).toUpperCase()}
    </span>
  );
}

function TournamentCta({ label, href, tournamentId, onSelect }: { label: string; href: string; tournamentId: string; onSelect: (id: string) => void }) {
  return (
    <Link
      href={href}
      onClick={() => onSelect(tournamentId)}
      className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/20 bg-white/12 px-4 py-2 text-sm font-black text-white shadow-sm backdrop-blur transition hover:bg-white/20"
    >
      {label}
    </Link>
  );
}

function SectionShell({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-[0_18px_44px_rgba(37,99,235,0.08)] sm:p-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-black text-slate-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function SponsorStrip({ tournament, accent }: { tournament: Tournament; accent: string }) {
  if (!tournament.sponsorName && !tournament.sponsorLogoUrl) {
    return null;
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-[0_18px_44px_rgba(37,99,235,0.08)]">
      <div className="relative flex flex-col gap-3 px-4 py-4 text-white sm:flex-row sm:items-center sm:justify-between sm:px-5" style={{ background: `linear-gradient(120deg, ${accent}, #2563eb 50%, #0f172a)` }}>
        <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(255,255,255,0.10)_0_1px,transparent_1px_42px)] opacity-25" />
        <div className="relative min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-white/55">Official tournament partner</p>
          <p className="mt-1 break-words text-lg font-black">{tournament.sponsorName || "Presented by our official partner"}</p>
        </div>
        {tournament.sponsorLogoUrl ? (
          <span className="relative h-14 w-36 shrink-0 rounded-xl bg-white bg-contain bg-center bg-no-repeat p-3 shadow-lg ring-1 ring-white/20" style={{ backgroundImage: `url(${tournament.sponsorLogoUrl})` }} />
        ) : null}
      </div>
    </section>
  );
}

function SponsorShowcase({ tournament }: { tournament: Tournament }) {
  if (!tournament.sponsorName && !tournament.sponsorLogoUrl) {
    return null;
  }

  return (
    <SectionShell eyebrow="Partners" title="Sponsor showcase">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm">
          <div className="flex min-w-0 items-center gap-3">
            {tournament.sponsorLogoUrl ? (
              <span className="h-16 w-28 shrink-0 rounded-xl border border-blue-100 bg-white bg-contain bg-center bg-no-repeat p-3" style={{ backgroundImage: `url(${tournament.sponsorLogoUrl})` }} />
            ) : (
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-xl font-black text-white">
                <Star size={24} aria-hidden="true" />
              </span>
            )}
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Official sponsor</p>
              <h3 className="mt-1 break-words text-lg font-black text-slate-950">{tournament.sponsorName || "Tournament partner"}</h3>
              <p className="mt-1 text-sm font-semibold text-slate-500">Brand visibility across live matches, scoreboard views, and tournament media.</p>
            </div>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

function MediaGallery({ tournament, teams, streamMatch, teamLookups }: { tournament: Tournament; teams: Team[]; streamMatch?: Match; teamLookups: ReturnType<typeof getTeam>[] }) {
  const photoCards = [
    tournament.logoUrl ? { title: tournament.name, label: "Tournament identity", imageUrl: tournament.logoUrl } : null,
    tournament.sponsorLogoUrl ? { title: tournament.sponsorName || "Official sponsor", label: "Partner spotlight", imageUrl: tournament.sponsorLogoUrl } : null,
    ...teams
      .filter((team) => team.logoUrl)
      .slice(0, 4)
      .map((team) => ({ title: team.name, label: team.city || team.group || "Participating team", imageUrl: team.logoUrl! }))
  ].filter(Boolean) as { title: string; label: string; imageUrl: string }[];

  if (photoCards.length === 0 && !streamMatch?.youtubeUrl) {
    return null;
  }

  return (
    <SectionShell eyebrow="Media" title="Media showcase">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {photoCards.map((card) => (
          <div key={`${card.label}-${card.title}`} className="group overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-sm">
            <div className="relative aspect-[16/10] bg-slate-900">
              <div className="absolute inset-0 bg-contain bg-center bg-no-repeat transition duration-500 group-hover:scale-[1.03]" style={{ backgroundImage: `url(${card.imageUrl})` }} />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-200">{card.label}</p>
                <p className="mt-1 break-words text-lg font-black">{card.title}</p>
              </div>
            </div>
          </div>
        ))}
        {streamMatch?.youtubeUrl ? (
          <Link href={`/matches/${streamMatch.id}`} className="overflow-hidden rounded-2xl border border-blue-100 bg-blue-600 text-white shadow-sm transition hover:bg-blue-700">
            <div className="flex aspect-[16/10] flex-col justify-between p-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15">
                <PlayCircle size={26} aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-100">Video / livestream</p>
                <p className="mt-1 break-words text-lg font-black">{teamName(streamMatch, teamLookups)}</p>
                <p className="mt-1 text-sm font-bold text-blue-100">{streamMatch.date} / {streamMatch.time}</p>
              </div>
            </div>
          </Link>
        ) : null}
      </div>
    </SectionShell>
  );
}

function MatchRow({ match, teams }: { match: Match; teams: ReturnType<typeof getTeam>[] }) {
  const home = teams.find((team) => team?.id === match.homeTeamId);
  const away = teams.find((team) => team?.id === match.awayTeamId);

  return (
    <Link href={`/matches/${match.id}`} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 transition hover:border-blue-200 hover:bg-blue-50 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <TeamLogo team={home} size="h-8 w-8" />
          <span className="orso-team-name orso-team-name-2 text-sm font-black text-slate-950">{home?.name ?? "Home"}</span>
        </div>
        <span className="rounded-lg bg-blue-600 px-3 py-2 text-lg font-black leading-none text-white">{match.homeScore} - {match.awayScore}</span>
        <div className="flex min-w-0 items-center justify-end gap-2 text-right">
          <span className="orso-team-name orso-team-name-2 text-sm font-black text-slate-950">{away?.name ?? "Away"}</span>
          <TeamLogo team={away} size="h-8 w-8" />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500 sm:justify-end">
        <span>{match.status}</span>
        <span className="text-slate-300">/</span>
        <span>{match.date} {match.time}</span>
      </div>
    </Link>
  );
}

function topScorers(players: Player[]) {
  return [...players]
    .sort((first, second) => (second.stats.goals || second.stats.points || 0) - (first.stats.goals || first.stats.points || 0))
    .slice(0, 5);
}

export default function TournamentLandingClient({ slug }: { slug: string }) {
  const router = useRouter();
  const { data, lastUpdatedAt, selectedTournamentId, setSelectedTournamentId } = useTournamentData();
  const tournament = useMemo(
    () => data.tournaments.find((item) => slugify(item.name) === slug || item.id === slug),
    [data.tournaments, slug]
  );

  useEffect(() => {
    if (tournament && selectedTournamentId !== tournament.id) {
      setSelectedTournamentId(tournament.id);
    }
  }, [selectedTournamentId, setSelectedTournamentId, tournament]);

  if (!tournament) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-2xl font-black text-slate-950">Tournament not found</h1>
        <p className="mt-2 text-sm font-semibold text-slate-500">Check the public tournament link or open the tournament directory.</p>
        <Link href="/tournaments" className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white">Browse tournaments</Link>
      </section>
    );
  }

  const tournamentId = tournament.id;
  const accent = tournament.primaryColor || "#2563eb";
  const teams = data.teams.filter((team) => team.tournamentId === tournament.id);
  const teamIds = new Set(teams.map((team) => team.id));
  const matches = data.matches.filter((match) => match.tournamentId === tournament.id || teamIds.has(match.homeTeamId) || teamIds.has(match.awayTeamId));
  const players = data.players.filter((player) => player.tournamentId === tournament.id || teamIds.has(player.teamId));
  const liveMatches = matches.filter((match) => match.status === "Live").slice(0, 4);
  const upcomingFixtures = matches.filter((match) => match.status === "Scheduled").slice(0, 5);
  const tournamentNews = data.newsPosts
    .filter((post) => post.isPublished && post.tournamentId === tournament.id)
    .sort((first, second) => new Date(second.publishedAt).getTime() - new Date(first.publishedAt).getTime())
    .slice(0, 3);
  const tournamentMedia = data.mediaItems
    .filter((item) => item.isPublished && item.tournamentId === tournament.id)
    .sort((first, second) => new Date(second.publishedAt).getTime() - new Date(first.publishedAt).getTime())
    .slice(0, 6);
  const managedSponsors = activeSponsorsForTournament(data.sponsors, tournament.id);
  const streamMatch = matches.find((match) => match.youtubeUrl);
  const standings = buildStandings({ ...data, teams, matches }).filter((standing) => teamIds.has(standing.teamId)).sort((first, second) => second.tournamentPoints - first.tournamentPoints).slice(0, 5);
  const scorers = topScorers(players);
  const teamLookups = data.teams.map((team) => team);

  function openSection(path: string) {
    setSelectedTournamentId(tournamentId);
    router.push(path);
  }

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
                <TournamentLogoMark tournament={tournament} />
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-white/60">Tournament homepage</p>
                  <h1 className="mt-2 break-words text-3xl font-black leading-tight sm:text-5xl">{tournament.name}</h1>
                </div>
              </div>

              <div className="mt-5 grid gap-2 text-sm font-bold text-white/80 sm:grid-cols-2">
                <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-3 ring-1 ring-white/10"><MapPin size={17} /> {tournament.location || "Location TBA"}</span>
                <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-3 ring-1 ring-white/10"><CalendarDays size={17} /> {formatDateRange(tournament)}</span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                <TournamentCta label="Live Matches" href="/live" tournamentId={tournament.id} onSelect={setSelectedTournamentId} />
                <TournamentCta label="Fixtures" href="/fixtures" tournamentId={tournament.id} onSelect={setSelectedTournamentId} />
                <TournamentCta label="Standings" href="/standings" tournamentId={tournament.id} onSelect={setSelectedTournamentId} />
                <TournamentCta label="Teams" href="/teams" tournamentId={tournament.id} onSelect={setSelectedTournamentId} />
                <TournamentCta label="Bracket" href={`/tournament/${slug}/bracket`} tournamentId={tournament.id} onSelect={setSelectedTournamentId} />
                <TournamentCta label="Apply / Join Tournament" href={`/tournament/${slug}/apply`} tournamentId={tournament.id} onSelect={setSelectedTournamentId} />
              </div>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/12 p-4 shadow-xl backdrop-blur">
              <LiveUpdateIndicator lastUpdatedAt={lastUpdatedAt} />
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

      <SponsorStrip tournament={tournament} accent={accent} />

      <ManagedSponsorStrip sponsors={managedSponsors} title={`${tournament.name} sponsors`} />

      {tournamentNews.length > 0 ? (
        <SectionShell eyebrow="Newsroom" title="Tournament updates">
          <div className="grid gap-4 md:grid-cols-3">
            {tournamentNews.map((post) => (
              <NewsCard key={post.id} post={post} />
            ))}
          </div>
        </SectionShell>
      ) : null}

      <SectionShell eyebrow="Gallery" title="Tournament media gallery">
        <MediaGrid items={tournamentMedia} emptyText="Tournament media will appear here after publishing." />
      </SectionShell>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
        <SectionShell eyebrow="Live now" title="Latest live matches">
          <div className="grid gap-3">
            {liveMatches.map((match) => <MatchRow key={match.id} match={match} teams={teamLookups} />)}
            {liveMatches.length === 0 ? <p className="rounded-xl bg-blue-50 px-4 py-5 text-sm font-bold text-blue-700">No matches are live right now.</p> : null}
          </div>
        </SectionShell>

        <SectionShell eyebrow="Table" title="Standings preview">
          <div className="grid gap-2">
            {standings.map((standing, index) => {
              const team = getTeam(data, standing.teamId);
              return (
                <Link key={standing.teamId} href={team ? `/teams/${team.id}` : "/teams"} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 transition hover:border-blue-200 hover:bg-blue-50">
                  <span className="text-sm font-black text-slate-400">{index + 1}</span>
                  <div className="flex min-w-0 items-center gap-2">
                    <TeamLogo team={team} size="h-8 w-8" />
                    <span className="orso-team-name orso-team-name-2 text-sm font-black text-slate-950">{team?.name ?? "Team"}</span>
                  </div>
                  <span className="rounded-lg bg-blue-600 px-2.5 py-1 text-sm font-black text-white">{standing.tournamentPoints} pts</span>
                </Link>
              );
            })}
            {standings.length === 0 ? <p className="rounded-xl bg-slate-50 px-4 py-5 text-sm font-bold text-slate-500">Standings will appear after final results.</p> : null}
          </div>
        </SectionShell>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <SectionShell eyebrow="Clubs" title="Participating teams">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {teams.slice(0, 8).map((team) => (
              <Link key={team.id} href={`/teams/${team.id}`} className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 transition hover:border-blue-200 hover:bg-blue-50">
                <TeamLogo team={team} size="h-10 w-10" />
                <div className="min-w-0">
                  <p className="orso-team-name orso-team-name-2 text-sm font-black text-slate-950">{team.name}</p>
                  <p className="text-xs font-bold text-slate-500">{team.city || team.group || team.sport}</p>
                </div>
              </Link>
            ))}
          </div>
        </SectionShell>

        <SectionShell eyebrow="Players" title="Top scorers">
          <div className="grid gap-3">
            {scorers.map((player, index) => {
              const team = getTeam(data, player.teamId);
              const goals = player.stats.goals || player.stats.points || 0;
              return (
                <div key={player.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <span className="text-sm font-black text-blue-600">{index + 1}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-950">{player.name}</p>
                    <p className="truncate text-xs font-bold text-slate-500">{team?.name ?? "Team"}</p>
                  </div>
                  <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-sm font-black text-blue-700">{goals}</span>
                </div>
              );
            })}
          </div>
        </SectionShell>

        <SectionShell eyebrow="Schedule" title="Upcoming fixtures">
          <div className="grid gap-3">
            {upcomingFixtures.map((match) => (
              <button key={match.id} type="button" onClick={() => openSection(`/matches/${match.id}`)} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-left transition hover:border-blue-200 hover:bg-blue-50">
                <p className="text-sm font-black text-slate-950">{teamName(match, teamLookups)}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">{match.date} / {match.time} / {match.court}</p>
              </button>
            ))}
            {upcomingFixtures.length === 0 ? <p className="rounded-xl bg-slate-50 px-4 py-5 text-sm font-bold text-slate-500">No upcoming fixtures listed.</p> : null}
          </div>
        </SectionShell>
      </div>

      <SponsorShowcase tournament={tournament} />

      <MediaGallery tournament={tournament} teams={teams} streamMatch={streamMatch} teamLookups={teamLookups} />

      {streamMatch?.youtubeUrl ? (
        <SectionShell eyebrow="Broadcast" title="Livestream">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-center">
            <YouTubeEmbed url={streamMatch.youtubeUrl} title={`${teamName(streamMatch, teamLookups)} livestream`} />
            <div className="rounded-2xl bg-blue-50 p-4">
              <PlayCircle className="h-9 w-9 text-blue-600" />
              <h3 className="mt-3 text-lg font-black text-slate-950">{teamName(streamMatch, teamLookups)}</h3>
              <p className="mt-2 text-sm font-bold text-slate-600">{streamMatch.date} / {streamMatch.time}</p>
            </div>
          </div>
        </SectionShell>
      ) : null}

      <section className="grid gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:grid-cols-2 lg:grid-cols-6">
        {[
          { icon: Radio, label: "Live Matches", href: "/live" },
          { icon: CalendarDays, label: "Fixtures", href: "/fixtures" },
          { icon: Trophy, label: "Standings", href: "/standings" },
          { icon: Users, label: "Teams", href: "/teams" },
          { icon: GitBranch, label: "Bracket", href: `/tournament/${slug}/bracket` },
          { icon: Shield, label: "Apply", href: `/tournament/${slug}/apply` }
        ].map((item) => (
          <button key={item.label} type="button" onClick={() => openSection(item.href)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-black text-blue-700 shadow-sm transition hover:bg-blue-600 hover:text-white">
            <item.icon size={17} />
            {item.label}
          </button>
        ))}
        <Link href="/tournaments" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-100 px-3 py-2 text-sm font-black text-blue-700 sm:col-span-2 lg:col-span-6">
          <Shield size={17} />
          Tournament directory
          <ExternalLink size={15} />
        </Link>
      </section>
    </main>
  );
}
