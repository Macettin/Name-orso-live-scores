"use client";

import Link from "next/link";
import Image from "next/image";
import { Activity, BarChart3, CalendarDays, Camera, ClipboardPenLine, MessageCircle, Shield, Users } from "lucide-react";
import { useTournamentData } from "@/hooks/use-tournament-data";

const navItems = [
  { href: "/fixtures", label: "Fixtures", icon: CalendarDays },
  { href: "/live", label: "Live", icon: Activity },
  { href: "/standings", label: "Standings", icon: BarChart3 },
  { href: "/teams", label: "Teams", icon: Shield },
  { href: "/players", label: "Players", icon: Users },
  { href: "/admin", label: "Admin", icon: ClipboardPenLine }
];

const socialItems = [
  { href: "https://wa.me/905427857750", label: "WhatsApp", icon: MessageCircle },
  { href: "https://www.facebook.com/p/Orso-Sports-Events-61564303367247/", label: "Facebook", text: "f" },
  { href: "https://www.instagram.com/orsosportsevents/", label: "Instagram", icon: Camera }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data, profile, selectedTournamentId, setSelectedTournamentId } = useTournamentData();
  const visibleNavItems =
    profile?.role === "club_admin" ? [...navItems, { href: "/club-admin", label: "Club Admin", icon: Shield }] : navItems;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 lg:flex-1">
            <div className="flex min-w-0 items-center gap-4">
              <Image src="/orso-logo.png" alt="Orso Sports Events" width={64} height={64} className="h-14 w-14 shrink-0 object-contain sm:h-16 sm:w-16" priority />
              <span className="min-w-0">
                <Link href="/" className="block text-xl font-black leading-tight tracking-tight text-slate-900 transition hover:text-blue-700 sm:text-2xl">
                  Orso Live Scores
                </Link>
                <span className="block text-sm font-semibold text-slate-600">Orso Sports Events</span>
                <a
                  href="https://www.orsosportsevents.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-fit text-xs font-medium text-slate-400 transition hover:text-blue-700"
                >
                  www.orsosportsevents.com
                </a>
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
            <label className="min-w-0 sm:w-52">
              <span className="sr-only">Tournament</span>
              <select
                value={selectedTournamentId}
                onChange={(event) => setSelectedTournamentId(event.target.value)}
                className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 shadow-sm outline-none transition hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {data.tournaments.length === 0 ? <option value="main-tournament">Main Tournament</option> : null}
                {data.tournaments.map((tournament) => (
                  <option key={tournament.id} value={tournament.id}>
                    {tournament.name}
                  </option>
                ))}
              </select>
            </label>
            <nav className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end lg:flex-nowrap">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-blue-50 hover:text-blue-700 sm:justify-start"
                  >
                    <Icon size={16} aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="flex items-center gap-2">
              {socialItems.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={item.label}
                    title={item.label}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-blue-100 bg-white text-sm font-black text-blue-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
                  >
                    {Icon ? <Icon size={16} aria-hidden="true" /> : <span aria-hidden="true">{item.text}</span>}
                  </a>
                );
              })}
            </div>
            <Link
              href="/court/main-hall"
              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-100"
            >
              QR court view
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
