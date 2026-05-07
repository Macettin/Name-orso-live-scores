import { clsx } from "clsx";
import type { Team, Tournament } from "@/lib/types";

export function PageHeader({
  eyebrow,
  title,
  description,
  action
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 sm:mb-8 md:flex-row md:items-end">
      <div className="min-w-0">
        {eyebrow ? <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-blue-700">{eyebrow}</p> : null}
        <h1 className="break-words text-2xl font-black tracking-tight text-slate-950 sm:text-4xl">{title}</h1>
        {description ? <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-600 sm:text-base sm:leading-7">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function TournamentBrand({ tournament }: { tournament?: Tournament }) {
  if (!tournament) {
    return null;
  }

  const accent = tournament.primaryColor || "#2563eb";

  return (
    <div className="orso-card-soft mb-6 flex flex-wrap items-center justify-between gap-4 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        {tournament.logoUrl ? (
          <span className="h-12 w-12 shrink-0 rounded-lg bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${tournament.logoUrl})` }} />
        ) : (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-lg font-black text-white" style={{ backgroundColor: accent }}>
            {tournament.name.slice(0, 2).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-lg font-black text-slate-900">{tournament.name}</p>
          <p className="text-sm font-semibold text-slate-500">{tournament.sportType}</p>
        </div>
      </div>
      {tournament.sponsorName || tournament.sponsorLogoUrl ? (
        <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2">
          {tournament.sponsorLogoUrl ? (
            <span className="h-8 w-20 shrink-0 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${tournament.sponsorLogoUrl})` }} />
          ) : null}
          {tournament.sponsorName ? <span className="text-sm font-bold text-slate-600">{tournament.sponsorName}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

function initials(value: string) {
  const parts = value.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase()).join("") || "T";
}

export function TeamLogo({ team, size = "h-10 w-10", className }: { team?: Team | null; size?: string; className?: string }) {
  if (team?.logoUrl) {
    return (
      <span
        aria-hidden="true"
        className={clsx("shrink-0 rounded-lg border border-blue-100 bg-white bg-contain bg-center bg-no-repeat shadow-sm", size, className)}
        style={{ backgroundImage: `url(${team.logoUrl})` }}
      />
    );
  }

  return (
    <span className={clsx("flex shrink-0 items-center justify-center rounded-lg bg-blue-50 font-black text-blue-700 ring-1 ring-blue-100", size, className)}>
      {team ? initials(team.name) : "T"}
    </span>
  );
}

export function Card({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={clsx("orso-card p-4 sm:p-5", className)}>
      {children}
    </section>
  );
}

export function StatusPill({ status }: { status: "Scheduled" | "Live" | "Final" }) {
  const classes = {
    Scheduled: "bg-slate-100 text-slate-600",
    Live: "bg-red-100 text-red-700",
    Final: "bg-blue-100 text-blue-700"
  };

  return <span className={clsx("rounded-full px-2.5 py-1 text-xs font-semibold", classes[status])}>{status}</span>;
}
