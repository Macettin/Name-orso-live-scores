"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { activeSponsorsForTournament, SponsorStrip } from "@/components/sponsor-strip";
import { TeamStaffList } from "@/components/team-staff-list";
import { useTournamentData } from "@/hooks/use-tournament-data";
import type { Player, Team, Tournament } from "@/lib/types";

function initials(value: string) {
  return value.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "T";
}

function ReportLogo({ src, alt, fallback, size = 64, rounded = "rounded-lg" }: { src?: string; alt: string; fallback: string; size?: number; rounded?: string }) {
  if (src) {
    return (
      <span className={`flex shrink-0 items-center justify-center ${rounded} border border-slate-200 bg-white p-1`} style={{ width: size, height: size }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} width={size} height={size} className="print-safe-image h-full w-full object-contain" />
      </span>
    );
  }

  return (
    <span className={`flex shrink-0 items-center justify-center ${rounded} bg-blue-50 font-black text-blue-700 ring-1 ring-blue-100`} style={{ width: size, height: size }}>
      {fallback}
    </span>
  );
}

function TournamentLogo({ tournament }: { tournament?: Tournament }) {
  return (
    <ReportLogo
      src={tournament?.logoUrl || "/orso-logo.png"}
      alt={tournament?.logoUrl ? `${tournament.name} logo` : "Orso Sports Events logo"}
      fallback={(tournament?.name || "OR").slice(0, 2).toUpperCase()}
      size={60}
    />
  );
}

function TeamReportLogo({ team }: { team: Team }) {
  return <ReportLogo src={team.logoUrl} alt={`${team.name} logo`} fallback={initials(team.name)} size={72} />;
}

function PlayerAvatar({ player }: { player: Player }) {
  if (player.photoUrl) {
    return (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={player.photoUrl} alt={`${player.name} photo`} width={40} height={40} className="print-safe-image h-full w-full object-cover" />
      </span>
    );
  }

  return <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-black text-blue-700 ring-1 ring-blue-100">{initials(player.name)}</span>;
}

function statusBadge(team: Team) {
  if (team.rosterStatus === "Approved") {
    return "Official approved roster";
  }
  return `${team.rosterStatus ?? "Draft"} / Not official`;
}

export default function TeamRosterReportPage() {
  const params = useParams<{ teamId: string }>();
  const { data, clubAdminAssignments } = useTournamentData();
  const team = data.teams.find((item) => item.id === params.teamId);

  if (!team) {
    return (
      <main className="report-page mx-auto max-w-4xl bg-white p-6 text-slate-950">
        <h1 className="text-2xl font-black">Team roster not found</h1>
        <Link href="/teams" className="print-hidden mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-black text-white">Back to teams</Link>
      </main>
    );
  }

  const tournament = data.tournaments.find((item) => item.id === team.tournamentId);
  const activeSponsors = activeSponsorsForTournament(data.sponsors, team.tournamentId);
  const players = data.players.filter((player) => player.teamId === team.id).sort((first, second) => first.number - second.number || first.name.localeCompare(second.name));
  const staff = data.teamStaff.filter((member) => member.teamId === team.id);
  const clubAdminEmails = clubAdminAssignments.filter((assignment) => assignment.teamId === team.id).map((assignment) => assignment.email).filter(Boolean);
  const contact = clubAdminEmails.join(", ") || team.coach || undefined;
  const approved = team.rosterStatus === "Approved";

  return (
    <main className="report-page mx-auto max-w-5xl bg-white p-4 text-slate-950 sm:p-6">
      <div className="print-hidden mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Link href={`/teams/${team.id}`} className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 hover:bg-blue-100">Back to team</Link>
          <Link href="/admin#roster_approvals" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">Admin approvals</Link>
        </div>
        <button type="button" onClick={() => window.print()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-blue-700">Print roster</button>
      </div>

      <article className="relative grid gap-5 overflow-hidden rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        {!approved ? (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center text-center text-6xl font-black uppercase tracking-wide text-slate-200/70 rotate-[-18deg]">
            Draft / Not official
          </div>
        ) : null}

        <header className="relative rounded-lg border border-blue-100 bg-blue-50 p-5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <TournamentLogo tournament={tournament} />
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Official team roster</p>
                <h1 className="break-words text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{tournament?.name ?? "Tournament"}</h1>
              </div>
            </div>
            <span className={`w-fit rounded-full px-4 py-2 text-xs font-black uppercase tracking-wide ring-1 ${approved ? "bg-emerald-100 text-emerald-700 ring-emerald-200" : "bg-amber-100 text-amber-700 ring-amber-200"}`}>
              {statusBadge(team)}
            </span>
          </div>
        </header>

        <SponsorStrip sponsors={activeSponsors} title="Tournament sponsors" compact printable />

        <TeamStaffList staff={staff} title="Team staff" compact />

        <section className="relative grid gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center">
          <TeamReportLogo team={team} />
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">Team</p>
            <h2 className="break-words text-3xl font-black text-slate-950">{team.name}</h2>
            <p className="mt-1 text-sm font-bold text-slate-500">{team.sport} / {team.group} / {team.city || "City not set"}</p>
          </div>
          <div className="grid gap-1 text-sm font-semibold text-slate-600 sm:text-right">
            <span>Roster status: {team.rosterStatus ?? "Draft"}</span>
            <span>{team.rosterLocked ? "Locked roster" : "Unlocked roster"}</span>
            <span>{players.length} player{players.length === 1 ? "" : "s"}</span>
          </div>
        </section>

        <section className="relative grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">Club admin / contact</p>
            <p className="mt-1 break-all font-black text-slate-950">{contact ?? "-"}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">Submitted</p>
            <p className="mt-1 font-black text-slate-950">{team.rosterSubmittedAt ? new Date(team.rosterSubmittedAt).toLocaleString() : "-"}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">Approved</p>
            <p className="mt-1 font-black text-slate-950">{team.rosterApprovedAt ? new Date(team.rosterApprovedAt).toLocaleString() : "-"}</p>
          </div>
        </section>

        {team.rosterNote ? (
          <section className="relative rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
            <p className="text-xs font-black uppercase tracking-wide">Admin note</p>
            <p className="mt-1">{team.rosterNote}</p>
          </section>
        ) : null}

        <section className="relative overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="report-table min-w-full divide-y divide-slate-100 text-sm">
            <thead>
              <tr>
                <th>Number</th>
                <th>Photo</th>
                <th>Player name</th>
                <th>Position</th>
                <th>Country</th>
                <th>Birthdate</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <tr key={player.id}>
                  <td className="font-black">#{player.number}</td>
                  <td><PlayerAvatar player={player} /></td>
                  <td className="font-black text-slate-950">{player.name}</td>
                  <td>{player.position || "-"}</td>
                  <td>{player.country || "-"}</td>
                  <td>{player.birthdate || "-"}</td>
                </tr>
              ))}
              {players.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center font-semibold text-slate-400">No players listed.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>

        {team.coach ? (
          <section className="relative rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-black text-slate-950">Staff / coach</h2>
            <p className="mt-3 font-bold text-slate-700">{team.coach}</p>
          </section>
        ) : null}

        <section className="relative grid gap-4 sm:grid-cols-2">
          {["Team Official", "Tournament Organizer"].map((label) => (
            <div key={label} className="rounded-lg border border-slate-300 bg-white p-4">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
              <div className="mt-14 border-t border-slate-400 pt-2 text-sm font-semibold text-slate-500">Signature / Date</div>
            </div>
          ))}
        </section>
      </article>
    </main>
  );
}
