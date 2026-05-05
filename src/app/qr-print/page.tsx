"use client";

import Link from "next/link";
import { Printer } from "lucide-react";
import { MatchQrCode } from "@/components/qr-code";
import { PageHeader } from "@/components/ui";
import { getTeam } from "@/lib/data-store";
import { useTournamentData } from "@/hooks/use-tournament-data";

export default function QrPrintPage() {
  const { data } = useTournamentData();
  const courts = Array.from(new Map(data.matches.map((match) => [match.hallSlug, { hallSlug: match.hallSlug, court: match.court }])).values()).sort((first, second) =>
    first.court.localeCompare(second.court)
  );

  return (
    <>
      <PageHeader
        title="Printable QR codes"
        description="Print public match and court QR codes for spectators, staff, and court signage."
        action={
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-blue-700 print:hidden">
            <Printer size={16} aria-hidden="true" />
            Print
          </button>
        }
      />

      <section className="grid gap-5">
        <div>
          <h2 className="mb-3 text-xl font-black text-slate-900">Match QR codes</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-2">
            {data.matches.map((match) => {
              const home = getTeam(data, match.homeTeamId);
              const away = getTeam(data, match.awayTeamId);
              return (
                <article key={match.id} className="break-inside-avoid rounded-lg border border-slate-200 bg-white p-4 shadow-sm print:shadow-none">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-wide text-blue-700">Match page</p>
                      <h3 className="mt-1 break-words text-lg font-black text-slate-900">
                        {home?.name} vs {away?.name}
                      </h3>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        {match.court} - {match.date} {match.time}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">{match.status}</span>
                  </div>
                  <div className="mt-4 flex justify-center">
                    <MatchQrCode value={`/matches/${match.id}`} size={150} />
                  </div>
                  <Link href={`/matches/${match.id}`} className="mt-3 block break-all text-center text-xs font-semibold text-blue-700 print:text-slate-700">
                    /matches/{match.id}
                  </Link>
                </article>
              );
            })}
          </div>
          {data.matches.length === 0 ? <p className="rounded-lg bg-slate-50 px-4 py-5 text-sm font-semibold text-slate-500">No matches available.</p> : null}
        </div>

        <div>
          <h2 className="mb-3 text-xl font-black text-slate-900">Court QR codes</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-2">
            {courts.map((court) => (
              <article key={court.hallSlug} className="break-inside-avoid rounded-lg border border-slate-200 bg-white p-4 shadow-sm print:shadow-none">
                <p className="text-xs font-black uppercase tracking-wide text-blue-700">Court page</p>
                <h3 className="mt-1 break-words text-lg font-black text-slate-900">{court.court}</h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">Current or next match board</p>
                <div className="mt-4 flex justify-center">
                  <MatchQrCode value={`/court/${court.hallSlug}`} size={150} />
                </div>
                <Link href={`/court/${court.hallSlug}`} className="mt-3 block break-all text-center text-xs font-semibold text-blue-700 print:text-slate-700">
                  /court/{court.hallSlug}
                </Link>
              </article>
            ))}
          </div>
          {courts.length === 0 ? <p className="rounded-lg bg-slate-50 px-4 py-5 text-sm font-semibold text-slate-500">No courts available.</p> : null}
        </div>
      </section>
    </>
  );
}
