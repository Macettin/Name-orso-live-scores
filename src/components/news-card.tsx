import Link from "next/link";
import { CalendarDays } from "lucide-react";
import type { NewsPost } from "@/lib/types";

export function formatNewsDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

export function NewsCard({ post }: { post: NewsPost }) {
  return (
    <Link
      href={`/news/${post.id}`}
      className="group grid overflow-hidden rounded-xl border border-blue-100 bg-white shadow-[0_14px_36px_rgba(37,99,235,0.08)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_20px_48px_rgba(37,99,235,0.14)]"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-blue-50">
        <div
          aria-hidden="true"
          className="h-full w-full bg-cover bg-center transition duration-500 group-hover:scale-[1.03]"
          style={{ backgroundImage: `url(${post.imageUrl})` }}
        />
        <div className="absolute left-3 top-3 rounded-full bg-blue-600 px-3 py-1 text-xs font-black uppercase tracking-wide text-white shadow-sm">
          {post.category}
        </div>
      </div>
      <div className="grid gap-2 p-4">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-blue-700">
          <CalendarDays size={14} aria-hidden="true" />
          {formatNewsDate(post.publishedAt)}
        </div>
        <h3 className="break-words text-lg font-black leading-snug text-slate-950">{post.title}</h3>
        <p className="text-sm font-semibold leading-6 text-slate-600">{post.summary}</p>
      </div>
    </Link>
  );
}
