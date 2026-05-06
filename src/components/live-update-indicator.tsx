"use client";

export function LiveUpdateIndicator({ lastUpdatedAt }: { lastUpdatedAt?: string | null }) {
  const label = lastUpdatedAt
    ? new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }).format(new Date(lastUpdatedAt))
    : "Waiting";

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">
      <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.85)]" aria-hidden="true" />
      Live updated {lastUpdatedAt ? label : ""}
    </span>
  );
}
