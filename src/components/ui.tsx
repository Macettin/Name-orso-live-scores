import { clsx } from "clsx";

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
    <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        {eyebrow ? <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-700">{eyebrow}</p> : null}
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
        {description ? <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">{description}</p> : null}
      </div>
      {action}
    </div>
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
    <section className={clsx("rounded-lg border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.07)]", className)}>
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
