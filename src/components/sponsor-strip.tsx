import type { Sponsor } from "@/lib/types";

const tierRank: Record<Sponsor["tier"], number> = {
  "Main Sponsor": 0,
  Gold: 1,
  Silver: 2,
  Partner: 3
};

export function activeSponsorsForTournament(sponsors: Sponsor[], tournamentId?: string) {
  return sponsors
    .filter((sponsor) => sponsor.isActive && (!sponsor.tournamentId || sponsor.tournamentId === tournamentId))
    .sort((first, second) => tierRank[first.tier] - tierRank[second.tier] || first.name.localeCompare(second.name));
}

export function SponsorStrip({
  sponsors,
  title = "Tournament sponsors",
  compact = false,
  printable = false
}: {
  sponsors: Sponsor[];
  title?: string;
  compact?: boolean;
  printable?: boolean;
}) {
  const visibleSponsors = sponsors.filter((sponsor) => sponsor.isActive);

  if (visibleSponsors.length === 0) {
    return null;
  }

  return (
    <section className={printable ? "rounded-lg border border-blue-100 bg-white p-3" : "rounded-xl border border-blue-100 bg-white p-4 shadow-[0_16px_42px_rgba(37,99,235,0.08)] sm:p-5"}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Sponsors</p>
          <h2 className={compact ? "mt-1 text-base font-black text-slate-950" : "mt-1 text-xl font-black text-slate-950"}>{title}</h2>
        </div>
      </div>
      <div className={compact ? "grid gap-2 sm:grid-cols-2 lg:grid-cols-4" : "grid gap-3 sm:grid-cols-2 lg:grid-cols-4"}>
        {visibleSponsors.map((sponsor) => {
          const content = (
            <>
              <span className={compact ? "h-12 w-20 shrink-0 rounded-lg bg-white bg-contain bg-center bg-no-repeat" : "h-14 w-24 shrink-0 rounded-lg bg-white bg-contain bg-center bg-no-repeat"} style={{ backgroundImage: `url(${sponsor.logoUrl})` }} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-black text-slate-950">{sponsor.name}</span>
                <span className="mt-1 block text-xs font-black uppercase tracking-wide text-blue-700">{sponsor.tier}</span>
              </span>
            </>
          );

          const className = "flex min-w-0 items-center gap-3 rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-3 transition hover:border-blue-200 hover:bg-blue-50";

          return sponsor.websiteUrl && !printable ? (
            <a key={sponsor.id} href={sponsor.websiteUrl} target="_blank" rel="noreferrer" className={className}>
              {content}
            </a>
          ) : (
            <div key={sponsor.id} className={className}>
              {content}
            </div>
          );
        })}
      </div>
    </section>
  );
}
