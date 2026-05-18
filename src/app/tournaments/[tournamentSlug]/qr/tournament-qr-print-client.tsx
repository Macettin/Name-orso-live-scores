"use client";

import Image from "next/image";
import Link from "next/link";
import { Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { slugify } from "@/lib/data-store";
import { useTournamentData } from "@/hooks/use-tournament-data";
import type { Tournament } from "@/lib/types";

function formatDateRange(tournament: Tournament) {
  if (!tournament.startDate && !tournament.endDate) {
    return "";
  }

  if (!tournament.endDate || tournament.endDate === tournament.startDate) {
    return tournament.startDate;
  }

  return `${tournament.startDate || "Start TBA"} - ${tournament.endDate}`;
}

export default function TournamentQrPrintClient({ tournamentSlug }: { tournamentSlug?: string }) {
  const { data } = useTournamentData();
  const safeSlug = tournamentSlug?.trim() ?? "";
  const tournament = data.tournaments.find((item) => slugify(item.name) === safeSlug || item.id === safeSlug);
  const publicPath = tournament ? `/tournaments/${slugify(tournament.name) || tournament.id}` : safeSlug ? `/tournaments/${safeSlug}` : "/tournaments";
  const publicUrl = typeof window === "undefined" ? publicPath : new URL(publicPath, window.location.origin).toString();
  const dateRange = tournament ? formatDateRange(tournament) : "";

  if (!safeSlug || !tournament) {
    return (
      <main className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm print:shadow-none">
        <Image src="/orso-logo.png" alt="Orso Sports Hub" width={80} height={80} className="mx-auto h-16 w-16 object-contain" />
        <h1 className="mt-4 text-2xl font-black text-slate-950">Tournament QR not found</h1>
        <p className="mt-2 text-sm font-semibold text-slate-500">Check the tournament QR link or open the tournament directory.</p>
        <Link href="/tournaments" className="mt-5 inline-flex rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white print:hidden">
          Browse tournaments
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl print:max-w-none">
      <div className="mb-4 flex justify-end print:hidden">
        <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-blue-700">
          <Printer size={16} aria-hidden="true" />
          Print QR
        </button>
      </div>

      <section className="break-inside-avoid overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_28px_70px_rgba(15,23,42,0.10)] print:rounded-none print:border-0 print:shadow-none">
        <div className="border-b border-blue-100 bg-white px-5 py-5 sm:px-8 print:px-0">
          <div className="flex min-w-0 items-center gap-4">
            <Image src="/orso-logo.png" alt="Orso Sports Hub" width={80} height={80} className="h-14 w-14 shrink-0 object-contain sm:h-16 sm:w-16" priority />
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">Orso Sports Hub</p>
              <h1 className="mt-1 break-words text-2xl font-black tracking-tight text-slate-950 sm:text-4xl">{tournament.name}</h1>
            </div>
          </div>
        </div>

        <div className="grid gap-6 px-5 py-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center print:grid-cols-[1fr_auto] print:px-0">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-4">
              {tournament.logoUrl ? (
                <span className="h-20 w-20 shrink-0 rounded-2xl border border-blue-100 bg-white bg-contain bg-center bg-no-repeat shadow-sm" style={{ backgroundImage: `url(${tournament.logoUrl})` }} />
              ) : (
                <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-black text-white">
                  {tournament.name.slice(0, 2).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Public tournament page</p>
                {dateRange ? <p className="mt-2 break-words text-base font-black text-slate-950">{dateRange}</p> : null}
                {tournament.location ? <p className="mt-1 break-words text-sm font-semibold text-slate-600">{tournament.location}</p> : null}
              </div>
            </div>

            <p className="mt-6 max-w-xl text-xl font-black leading-tight text-slate-950 sm:text-2xl">
              Scan to follow live scores, fixtures, standings and news.
            </p>
            <p className="mt-4 break-all rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-black text-blue-700 print:border-slate-200 print:bg-white print:text-slate-700">
              {publicUrl}
            </p>
          </div>

          <div className="flex justify-center">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm print:shadow-none">
              <QRCodeSVG value={publicUrl} size={280} level="M" includeMargin />
            </div>
          </div>
        </div>

        <div className="border-t border-blue-100 bg-slate-50 px-5 py-4 text-center text-xs font-black uppercase tracking-[0.18em] text-slate-500 sm:px-8 print:bg-white print:px-0">
          Orso Sports Hub / Your digital sports event platform
        </div>
      </section>
    </main>
  );
}
