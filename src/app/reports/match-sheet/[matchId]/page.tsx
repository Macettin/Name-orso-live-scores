"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { activeSponsorsForTournament, SponsorStrip } from "@/components/sponsor-strip";
import { TeamStaffList } from "@/components/team-staff-list";
import { getTeam } from "@/lib/data-store";
import { disciplinaryRowForPlayer, disciplinaryRows } from "@/lib/disciplinary";
import { useTournamentData } from "@/hooks/use-tournament-data";
import { isFootballLikeSport, type MatchLineupRole, type Official, type Player, type Team, type Tournament } from "@/lib/types";

function initials(value: string) {
  return value.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "T";
}

function ReportLogo({ src, alt, fallback, size = 52 }: { src?: string; alt: string; fallback: string; size?: number }) {
  if (src) {
    return (
      <span className="flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white p-1" style={{ width: size, height: size }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} width={size} height={size} className="print-safe-image h-full w-full object-contain" />
      </span>
    );
  }

  return (
    <span className="flex shrink-0 items-center justify-center rounded-lg bg-blue-50 font-black text-blue-700 ring-1 ring-blue-100" style={{ width: size, height: size }}>
      {fallback}
    </span>
  );
}

function TournamentLogo({ tournament }: { tournament?: Tournament }) {
  return <ReportLogo src={tournament?.logoUrl || "/orso-logo.png"} alt={tournament?.logoUrl ? `${tournament.name} logo` : "Orso Sports Events logo"} fallback={(tournament?.name || "OR").slice(0, 2).toUpperCase()} />;
}

function TeamHeader({ team, label }: { team?: Team; label: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <ReportLogo src={team?.logoUrl} alt={team ? `${team.name} logo` : "Team logo"} fallback={team ? initials(team.name) : "T"} size={48} />
      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-wide text-blue-600">{label}</p>
        <h2 className="break-words text-xl font-black text-slate-950">{team?.name ?? label}</h2>
      </div>
    </div>
  );
}

function PlayerAvatar({ player }: { player: Player }) {
  if (player.photoUrl) {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={player.photoUrl} alt={`${player.name} photo`} width={32} height={32} className="print-safe-image h-full w-full object-cover" />
      </span>
    );
  }

  return <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-black text-blue-700 ring-1 ring-blue-100">{initials(player.name)}</span>;
}

function rolePlayers(players: Player[], roles: Map<string, MatchLineupRole>, role: MatchLineupRole) {
  return players.filter((player) => (roles.get(player.id) ?? "reserve") === role).sort((first, second) => first.number - second.number || first.name.localeCompare(second.name));
}

function startingLabel(sport?: string) {
  return sport === "Futsal" ? "Starting 5" : isFootballLikeSport(sport) ? "Starting XI" : "Starters";
}

function PlayerTable({ title, players }: { title: string; players: Player[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <h3 className="bg-slate-50 px-3 py-2 text-sm font-black text-slate-950">{title}</h3>
      <table className="report-table min-w-full text-sm">
        <thead>
          <tr>
            <th>No.</th>
            <th>Player</th>
            <th>Position</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player) => (
            <tr key={player.id}>
              <td className="font-black">#{player.number}</td>
              <td>
                <div className="flex min-w-0 items-center gap-2">
                  <PlayerAvatar player={player} />
                  <span className="font-bold text-slate-950">{player.name}</span>
                </div>
              </td>
              <td>{player.position || "Player"}</td>
            </tr>
          ))}
          {players.length === 0 ? (
            <tr>
              <td colSpan={3} className="text-slate-400">Not submitted.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function OfficialsList({ officials }: { officials: Official[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {officials.map((official) => (
        <div key={official.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-xs font-black uppercase tracking-wide text-blue-600">{official.role}</p>
          <p className="font-black text-slate-950">{official.name}</p>
          <p className="text-sm font-semibold text-slate-500">{[official.city, official.country].filter(Boolean).join(", ") || "Location not set"}</p>
        </div>
      ))}
      {officials.length === 0 ? <p className="text-sm font-semibold text-slate-500">Officials to be confirmed.</p> : null}
    </div>
  );
}

function SignatureGrid() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {["Home Team Official", "Away Team Official", "Referee", "Commissioner"].map((label) => (
        <div key={label} className="rounded-lg border border-slate-300 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
          <div className="mt-10 border-t border-slate-400 pt-2 text-sm font-semibold text-slate-500">Signature</div>
        </div>
      ))}
    </div>
  );
}

export default function MatchSheetPage() {
  const params = useParams<{ matchId: string }>();
  const { data } = useTournamentData();
  const match = data.matches.find((item) => item.id === params.matchId);

  if (!match) {
    return (
      <main className="mx-auto max-w-4xl rounded-lg border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-black text-slate-950">Match sheet not found</h1>
        <Link href="/fixtures" className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-black text-white">Back to fixtures</Link>
      </main>
    );
  }

  const home = getTeam(data, match.homeTeamId);
  const away = getTeam(data, match.awayTeamId);
  const tournament = data.tournaments.find((item) => item.id === match.tournamentId);
  const activeSponsors = activeSponsorsForTournament(data.sponsors, match.tournamentId);
  const homePlayers = data.players.filter((player) => player.teamId === match.homeTeamId);
  const awayPlayers = data.players.filter((player) => player.teamId === match.awayTeamId);
  const homeStaff = data.teamStaff.filter((staff) => staff.teamId === match.homeTeamId);
  const awayStaff = data.teamStaff.filter((staff) => staff.teamId === match.awayTeamId);
  const lineupEntries = data.matchLineups.filter((entry) => entry.matchId === match.id);
  const homeRoles = new Map(lineupEntries.filter((entry) => entry.teamId === match.homeTeamId).map((entry) => [entry.playerId, entry.role]));
  const awayRoles = new Map(lineupEntries.filter((entry) => entry.teamId === match.awayTeamId).map((entry) => [entry.playerId, entry.role]));
  const officials = data.matchOfficials
    .filter((assignment) => assignment.matchId === match.id)
    .map((assignment) => data.officials.find((official) => official.id === assignment.officialId))
    .filter((official): official is Official => Boolean(official));
  const disciplinary = disciplinaryRows({ players: [...homePlayers, ...awayPlayers], teams: data.teams, matches: data.matches, events: data.events });
  const suspendedRows = disciplinary.filter((row) => row.isSuspended);

  return (
    <main className="report-page mx-auto max-w-5xl bg-white p-4 text-slate-950 sm:p-6">
      <div className="print-hidden mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href={`/matches/${match.id}`} className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 hover:bg-blue-100">Back to match</Link>
        <button type="button" onClick={() => window.print()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-blue-700">Print sheet</button>
      </div>

      <article className="grid gap-5">
        <header className="rounded-lg border border-blue-100 bg-blue-50 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <TournamentLogo tournament={tournament} />
              <div className="min-w-0">
                <p className="text-sm font-black uppercase tracking-wide text-blue-700">Pre-match sheet</p>
                <h1 className="break-words text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{tournament?.name ?? "Tournament"}</h1>
              </div>
            </div>
            <div className="grid gap-1 text-sm font-semibold text-slate-600 sm:text-right">
              <span>{match.date} {match.time}</span>
              <span>{match.court} / {match.hallSlug}</span>
              <span>{match.sport} / {match.group}</span>
            </div>
          </div>
        </header>

        <SponsorStrip sponsors={activeSponsors} title="Match sponsors" compact printable />

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <TeamHeader team={home} label="Home" />
            <div className="rounded-lg bg-blue-600 px-5 py-3 text-center text-xl font-black text-white">VS</div>
            <div className="sm:flex sm:justify-end sm:text-right">
              <TeamHeader team={away} label="Away" />
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <TeamStaffList staff={homeStaff} title={`${home?.name ?? "Home"} staff`} compact />
          <TeamStaffList staff={awayStaff} title={`${away?.name ?? "Away"} staff`} compact />
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="grid gap-4">
            <PlayerTable title={`${home?.name ?? "Home"} ${startingLabel(match.sport)}`} players={rolePlayers(homePlayers, homeRoles, "starting")} />
            <PlayerTable title={`${home?.name ?? "Home"} Substitutes`} players={rolePlayers(homePlayers, homeRoles, "substitute")} />
          </div>
          <div className="grid gap-4">
            <PlayerTable title={`${away?.name ?? "Away"} ${startingLabel(match.sport)}`} players={rolePlayers(awayPlayers, awayRoles, "starting")} />
            <PlayerTable title={`${away?.name ?? "Away"} Substitutes`} players={rolePlayers(awayPlayers, awayRoles, "substitute")} />
          </div>
        </section>

        <section className="report-section rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="border-b border-slate-100 pb-2 text-lg font-black text-slate-950">Suspended / ineligible warning</h2>
          <div className="mt-4 grid gap-2">
            {suspendedRows.map((row) => (
              <p key={row.player.id} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-black text-red-700">
                #{row.player.number} {row.player.name} / {row.team?.name ?? "Team"} / Suspended {row.matchesSuspended} match{row.matchesSuspended === 1 ? "" : "es"}
              </p>
            ))}
            {suspendedRows.length === 0 ? <p className="text-sm font-semibold text-slate-500">No suspended players currently detected.</p> : null}
          </div>
        </section>

        <section className="report-section rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="border-b border-slate-100 pb-2 text-lg font-black text-slate-950">Assigned officials</h2>
          <div className="mt-4">
            <OfficialsList officials={officials} />
          </div>
        </section>

        <section className="report-section rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="border-b border-slate-100 pb-2 text-lg font-black text-slate-950">Signatures</h2>
          <div className="mt-4">
            <SignatureGrid />
          </div>
        </section>
      </article>
    </main>
  );
}
