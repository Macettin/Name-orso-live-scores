import Link from "next/link";
import { Activity, BarChart3, CalendarDays, ClipboardPenLine, Shield, Trophy, Users } from "lucide-react";

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
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white">
                <Trophy size={22} aria-hidden="true" />
              </span>
              <span>
                <span className="block text-lg font-bold text-slate-950">Orso Live Scores</span>
                <span className="block text-sm text-slate-500">Volleyball and basketball tournaments</span>
              </span>
            </Link>
            <Link
              href="/court/main-hall"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              QR court view
            </Link>
          </div>
          <nav className="flex gap-2 overflow-x-auto pb-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                >
                  <Icon size={16} aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
