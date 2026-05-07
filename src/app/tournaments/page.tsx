"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { CalendarDays, MapPin, Shield, Trophy } from "lucide-react";
import { useTournamentData } from "@/hooks/use-tournament-data";
import type { Tournament, TournamentStatus } from "@/lib/types";
import { PageHeader } from "@/components/ui";

function formatDateRange(tournament: Tournament) {
  const start = tournament.startDate || "TBA";
  const end = tournament.endDate || "";

  if (!end || end === start) {
    return start;
  }

  return `${start} - ${end}`;
}

function TournamentLogo({ tournament }: { tournament: Tournament }) {
  if (tournament.logoUrl) {
    return (
      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-blue-100 bg-white p-2 shadow-sm">
        <Image src={tournament.logoUrl} alt={`${tournament.name} logo`} width={56} height={56} className="max-h-full max-w-full object-contain" />
      </span>
    );
  }

  return (
    <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xl font-black text-blue-700 ring-1 ring-blue-100">
      {tournament.name.slice(0, 2).toUpperCase()}
    </span>
  );
}

function TournamentStatusPill({ status }: { status: TournamentStatus }) {
  const classes: Record<TournamentStatus, string> = {
    Scheduled: "bg-slate-100 text-slate-600",
    Live: "bg-red-100 text-red-700",
    Final: "bg-blue-100 text-blue-700",
    Archived: "bg-slate-900 text-white"
  };

  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${classes[status]}`}>{status}</span>;
}

export default function TournamentsPage() {
  const router = useRouter();
  const { data, setSelectedTournamentId } = useTournamentData();

  function openTournament(tournamentId: string) {
    setSelectedTournamentId(tournamentId);
    router.push("/live");
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Tournament directory"
        title="Tournaments"
        description="Browse every Orso Sports Events tournament and open the live dashboard for the selected event."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data.tournaments.map((tournament) => (
          <button
            key={tournament.id}
            type="button"
            onClick={() => openTournament(tournament.id)}
            className="group flex h-full min-w-0 flex-col rounded-lg border border-slate-200 bg-white p-5 text-left shadow-[0_12px_30px_rgba(15,23,42,0.07)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_16px_36px_rgba(37,99,235,0.16)]"
          >
            <div className="flex min-w-0 items-start gap-4">
              <TournamentLogo tournament={tournament} />
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <TournamentStatusPill status={tournament.status} />
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700">
                    <Shield size={12} aria-hidden="true" />
                    {tournament.sportType}
                  </span>
                </div>
                <h2 className="break-words text-xl font-black leading-tight text-slate-950 transition group-hover:text-blue-700">{tournament.name}</h2>
              </div>
            </div>

            <div className="mt-5 grid gap-3 text-sm font-semibold text-slate-600">
              <p className="flex items-center gap-2">
                <MapPin size={16} className="shrink-0 text-blue-600" aria-hidden="true" />
                <span className="min-w-0 break-words">{tournament.location || "Location TBA"}</span>
              </p>
              <p className="flex items-center gap-2">
                <CalendarDays size={16} className="shrink-0 text-blue-600" aria-hidden="true" />
                <span>{formatDateRange(tournament)}</span>
              </p>
              {tournament.sponsorName || tournament.sponsorLogoUrl ? (
                <div className="mt-1 flex min-w-0 items-center gap-3 rounded-lg bg-slate-50 px-3 py-2">
                  {tournament.sponsorLogoUrl ? (
                    <span className="flex h-9 w-20 shrink-0 items-center justify-center rounded-md bg-white p-1">
                      <Image src={tournament.sponsorLogoUrl} alt={`${tournament.sponsorName || tournament.name} sponsor logo`} width={80} height={36} className="max-h-full max-w-full object-contain" />
                    </span>
                  ) : null}
                  {tournament.sponsorName ? <span className="min-w-0 break-words text-sm font-black text-slate-700">{tournament.sponsorName}</span> : null}
                </div>
              ) : null}
            </div>

            <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-blue-700">
              <Trophy size={16} aria-hidden="true" />
              Open live dashboard
            </span>
          </button>
        ))}
      </div>

      {data.tournaments.length === 0 ? (
        <section className="rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h2 className="text-lg font-black text-slate-900">No tournaments yet</h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">Tournaments created in Admin CMS will appear here.</p>
        </section>
      ) : null}
    </div>
  );
}
