"use client";

import Link from "next/link";
import { Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { TeamLogo } from "@/components/ui";
import { slugify } from "@/lib/data-store";
import { useTournamentData } from "@/hooks/use-tournament-data";
import type { Player, Team, TeamStaff, Tournament } from "@/lib/types";

type AccreditationPerson =
  | { id: string; type: "player"; name: string; role: string; number?: number; photoUrl?: string; team: Team }
  | { id: string; type: "staff"; name: string; role: string; photoUrl?: string; team: Team };

function initials(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "A";
}

function formatDateRange(tournament?: Tournament) {
  if (!tournament?.startDate && !tournament?.endDate) {
    return "Dates TBA";
  }

  if (!tournament.endDate || tournament.endDate === tournament.startDate) {
    return tournament.startDate || "Dates TBA";
  }

  return `${tournament.startDate || "Start TBA"} - ${tournament.endDate}`;
}

function publicVerificationPlaceholder(person: AccreditationPerson, tournament?: Tournament) {
  const tournamentSlug = tournament ? slugify(tournament.name) || tournament.id : "tournament";
  const path = `/verify/accreditation/${tournamentSlug}/${person.type}/${person.id}`;
  return typeof window === "undefined" ? path : new URL(path, window.location.origin).toString();
}

function PersonPhoto({ person }: { person: AccreditationPerson }) {
  if (person.photoUrl) {
    return (
      <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={person.photoUrl} alt={`${person.name} photo`} width={80} height={80} className="print-safe-image h-full w-full object-cover" />
      </span>
    );
  }

  return <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl font-black text-blue-700 ring-1 ring-blue-100">{initials(person.name)}</span>;
}

function AccreditationCard({ person, tournament }: { person: AccreditationPerson; tournament?: Tournament }) {
  const verificationUrl = publicVerificationPlaceholder(person, tournament);

  return (
    <article className="break-inside-avoid overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm print:shadow-none">
      <div className="bg-blue-700 px-3 py-2 text-white">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[0.58rem] font-black uppercase tracking-[0.18em] text-blue-100">Orso Sports Hub</p>
            <h2 className="truncate text-sm font-black">{tournament?.name ?? "Tournament"}</h2>
          </div>
          <span className="rounded-md bg-white/15 px-2 py-1 text-[0.58rem] font-black uppercase tracking-wide">{person.type}</span>
        </div>
      </div>

      <div className="grid grid-cols-[auto_1fr] gap-3 p-3">
        <PersonPhoto person={person} />
        <div className="min-w-0">
          <p className="text-[0.58rem] font-black uppercase tracking-[0.16em] text-slate-400">Accreditation</p>
          <h3 className="mt-1 break-words text-lg font-black leading-tight text-slate-950">{person.name}</h3>
          <p className="mt-1 break-words text-xs font-bold text-blue-700">{person.role || "Team member"}</p>
          {"number" in person && typeof person.number === "number" ? <p className="mt-1 text-xs font-black text-slate-600">Player #{person.number}</p> : null}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-3 border-t border-slate-200 p-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <TeamLogo team={person.team} size="h-8 w-8" />
            <div className="min-w-0">
              <p className="truncate text-xs font-black text-slate-950">{person.team.name}</p>
              <p className="truncate text-[0.62rem] font-bold text-slate-500">{person.team.sport} / {person.team.group}</p>
            </div>
          </div>
          <p className="mt-2 text-[0.58rem] font-black uppercase tracking-wide text-slate-400">Verification placeholder</p>
          <p className="mt-0.5 break-all text-[0.56rem] font-semibold leading-tight text-slate-500">Future digital ID check</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-1">
          <QRCodeSVG value={verificationUrl} size={72} level="M" includeMargin={false} />
        </div>
      </div>
    </article>
  );
}

function buildPeople(players: Player[], staff: TeamStaff[], teams: Team[]) {
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const playerPeople = players.flatMap<AccreditationPerson>((player) => {
      const team = teamById.get(player.teamId);
      if (!team) return [];
      return [{
        id: player.id,
        type: "player" as const,
        name: player.name,
        role: player.position || "Player",
        number: player.number,
        photoUrl: player.photoUrl,
        team
      }];
    });
  const staffPeople = staff.flatMap<AccreditationPerson>((member) => {
      const team = teamById.get(member.teamId);
      if (!team) return [];
      return [{
        id: member.id,
        type: "staff" as const,
        name: member.name,
        role: member.role,
        photoUrl: member.photoUrl,
        team
      }];
    });

  return [...playerPeople, ...staffPeople].sort((first, second) => first.team.name.localeCompare(second.team.name) || first.type.localeCompare(second.type) || first.name.localeCompare(second.name));
}

export default function AccreditationPrintPage() {
  const { data, selectedTournamentId } = useTournamentData();
  const tournament = data.tournaments.find((item) => item.id === selectedTournamentId);
  const teams = data.teams.filter((team) => !team.tournamentId || team.tournamentId === selectedTournamentId);
  const teamIds = new Set(teams.map((team) => team.id));
  const players = data.players.filter((player) => teamIds.has(player.teamId) || player.tournamentId === selectedTournamentId);
  const staff = data.teamStaff.filter((member) => teamIds.has(member.teamId) || member.tournamentId === selectedTournamentId);
  const people = buildPeople(players, staff, teams);

  return (
    <main className="report-page mx-auto max-w-7xl bg-white p-4 text-slate-950 sm:p-6">
      <div className="print-hidden mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Link href="/admin#reports" className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 hover:bg-blue-100">
            Back to reports
          </Link>
          <Link href="/admin#roster_approvals" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
            Roster approvals
          </Link>
        </div>
        <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-blue-700">
          <Printer size={16} aria-hidden="true" />
          Print cards
        </button>
      </div>

      <header className="mb-5 rounded-xl border border-blue-100 bg-blue-50 p-5 print:border-slate-200 print:bg-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Accreditation cards</p>
            <h1 className="mt-1 break-words text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{tournament?.name ?? "Selected tournament"}</h1>
            <p className="mt-2 text-sm font-bold text-slate-600">
              {formatDateRange(tournament)} {tournament?.location ? `/ ${tournament.location}` : ""}
            </p>
          </div>
          <div className="rounded-lg bg-white px-4 py-3 text-sm font-black text-blue-700 ring-1 ring-blue-100 print:border print:border-slate-200 print:ring-0">
            {people.length} card{people.length === 1 ? "" : "s"} / {teams.length} team{teams.length === 1 ? "" : "s"}
          </div>
        </div>
        <p className="mt-4 text-sm font-semibold leading-6 text-slate-600">
          First version generated from current roster and team staff data only. QR codes are placeholders for a future accreditation verification upgrade.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 print:grid-cols-3">
        {people.map((person) => (
          <AccreditationCard key={`${person.type}-${person.id}`} person={person} tournament={tournament} />
        ))}
      </section>

      {people.length === 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-6 text-center">
          <h2 className="text-xl font-black text-slate-950">No accreditation cards available</h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">Add players or team staff to the selected tournament roster before printing cards.</p>
        </section>
      ) : null}
    </main>
  );
}
