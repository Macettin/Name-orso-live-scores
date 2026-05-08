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

export function TournamentCoverBanner({ tournament }: { tournament?: Tournament }) {
  if (!tournament) {
    return null;
  }

  const accent = tournament.primaryColor || "#2563eb";

  return (
    <section className="mb-6 overflow-hidden rounded-lg border border-blue-100 bg-white shadow-[0_20px_54px_rgba(37,99,235,0.12)]">
      <div className="relative min-h-36 overflow-hidden px-5 py-6 text-white sm:px-7">
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${accent}, #2563eb 48%, #0f172a)` }} />
        {tournament.logoUrl ? (
          <span
            aria-hidden="true"
            className="absolute -right-8 -top-10 h-44 w-44 bg-contain bg-center bg-no-repeat opacity-15 sm:h-56 sm:w-56"
            style={{ backgroundImage: `url(${tournament.logoUrl})` }}
          />
        ) : null}
        <div className="relative flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            {tournament.logoUrl ? (
              <span className="h-14 w-14 shrink-0 rounded-lg bg-white/15 bg-contain bg-center bg-no-repeat p-2 ring-1 ring-white/20" style={{ backgroundImage: `url(${tournament.logoUrl})` }} />
            ) : (
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-white/15 text-xl font-black ring-1 ring-white/20">
                {tournament.name.slice(0, 2).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/60">Tournament</p>
              <h2 className="orso-team-name orso-team-name-2 mt-1 text-2xl font-black leading-tight sm:text-3xl">{tournament.name}</h2>
              <p className="mt-1 text-sm font-bold text-white/70">{tournament.sportType} / {tournament.location || "Location TBA"}</p>
            </div>
          </div>
          {tournament.sponsorName || tournament.sponsorLogoUrl ? (
            <div className="flex w-fit max-w-full items-center gap-3 rounded-lg border border-white/15 bg-white/10 px-3 py-2 backdrop-blur">
              {tournament.sponsorLogoUrl ? (
                <span className="h-9 w-20 shrink-0 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${tournament.sponsorLogoUrl})` }} />
              ) : null}
              {tournament.sponsorName ? <span className="min-w-0 break-words text-sm font-black text-white">{tournament.sponsorName}</span> : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
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
