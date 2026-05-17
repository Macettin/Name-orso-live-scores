import type { TeamStaff } from "@/lib/types";

function initials(value: string) {
  return value.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "S";
}

export function TeamStaffList({
  staff,
  title = "Team staff",
  compact = false
}: {
  staff: TeamStaff[];
  title?: string;
  compact?: boolean;
}) {
  if (staff.length === 0) {
    return null;
  }

  return (
    <section className={compact ? "rounded-lg border border-blue-100 bg-white p-3" : "rounded-lg border border-blue-100 bg-white p-4 shadow-[0_14px_36px_rgba(37,99,235,0.08)]"}>
      <h2 className={compact ? "text-base font-black text-slate-950" : "text-xl font-black text-slate-950"}>{title}</h2>
      <div className={compact ? "mt-3 grid gap-2 sm:grid-cols-2" : "mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"}>
        {staff.map((member) => (
          <article key={member.id} className="flex min-w-0 items-center gap-3 rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-3">
            {member.photoUrl ? (
              <span aria-hidden="true" className="h-11 w-11 shrink-0 rounded-lg bg-cover bg-center ring-1 ring-blue-100" style={{ backgroundImage: `url(${member.photoUrl})` }} />
            ) : (
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-sm font-black text-white">
                {initials(member.name)}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-950">{member.name}</p>
              <p className="text-xs font-black uppercase tracking-wide text-blue-700">{member.role}</p>
              {member.email || member.phone ? (
                <p className="mt-1 truncate text-xs font-semibold text-slate-500">{member.email || member.phone}</p>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
