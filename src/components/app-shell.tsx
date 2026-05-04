import Link from "next/link";
import Image from "next/image";
import { Activity, BarChart3, CalendarDays, ClipboardPenLine, Shield, Users } from "lucide-react";

const navItems = [
  { href: "/fixtures", label: "Fixtures", icon: CalendarDays },
  { href: "/live", label: "Live", icon: Activity },
  { href: "/standings", label: "Standings", icon: BarChart3 },
  { href: "/teams", label: "Teams", icon: Shield },
  { href: "/players", label: "Players", icon: Users },
  { href: "/admin", label: "Admin", icon: ClipboardPenLine }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 lg:flex-1">
            <Link href="/" className="flex min-w-0 items-center gap-4">
              <Image src="/orso-logo.png" alt="Orso Sports Events" width={64} height={64} className="h-14 w-14 shrink-0 object-contain sm:h-16 sm:w-16" priority />
              <span className="min-w-0">
                <span className="block text-xl font-black leading-tight tracking-tight text-slate-900 sm:text-2xl">Orso Live Scores</span>
                <span className="block text-sm font-medium text-slate-400">Volleyball and basketball tournaments</span>
              </span>
            </Link>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
            <nav className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end lg:flex-nowrap">
              {navItems.map((item) => {
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
