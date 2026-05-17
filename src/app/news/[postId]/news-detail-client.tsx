"use client";

import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { formatNewsDate, NewsCard } from "@/components/news-card";
import { PageHeader } from "@/components/ui";
import { slugify } from "@/lib/data-store";
import { useTournamentData } from "@/hooks/use-tournament-data";

export default function NewsDetailClient({ postId }: { postId: string }) {
  const { data } = useTournamentData();
  const post = data.newsPosts.find((item) => item.id === postId && item.isPublished);
  const related = data.newsPosts
    .filter((item) => item.isPublished && item.id !== postId)
    .sort((first, second) => new Date(second.publishedAt).getTime() - new Date(first.publishedAt).getTime())
    .slice(0, 3);

  if (!post) {
    return (
      <section className="rounded-xl border border-blue-100 bg-white p-6 text-center shadow-sm">
        <h1 className="text-2xl font-black text-slate-950">News post not found</h1>
        <p className="mt-2 text-sm font-semibold text-slate-500">The post may be unpublished or no longer available.</p>
        <Link href="/" className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-3 text-sm font-black text-white">
          Back to homepage
        </Link>
      </section>
    );
  }

  const tournament = post.tournamentId ? data.tournaments.find((item) => item.id === post.tournamentId) : undefined;

  return (
    <main className="grid gap-6 pb-8">
      <PageHeader
        eyebrow={post.category}
        title={post.title}
        description={post.summary}
        action={
          tournament ? (
            <Link href={`/tournament/${slugify(tournament.name) || tournament.id}`} className="inline-flex rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-black text-blue-700">
              {tournament.name}
            </Link>
          ) : null
        }
      />
      <article className="overflow-hidden rounded-xl border border-blue-100 bg-white shadow-[0_22px_58px_rgba(37,99,235,0.12)]">
        <div className="relative aspect-[16/8] min-h-56 bg-blue-50">
          <div aria-hidden="true" className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${post.imageUrl})` }} />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/58 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-black uppercase tracking-wide text-white">{post.category}</span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1 text-xs font-black uppercase tracking-wide text-blue-700">
              <CalendarDays size={14} aria-hidden="true" />
              {formatNewsDate(post.publishedAt)}
            </span>
          </div>
        </div>
        <div className="max-w-none px-4 py-6 sm:px-7">
          {post.content.split(/\n{2,}/).map((paragraph) => (
            <p key={paragraph} className="mb-4 whitespace-pre-line text-base font-medium leading-8 text-slate-700">
              {paragraph}
            </p>
          ))}
        </div>
      </article>
      {related.length > 0 ? (
        <section className="rounded-xl border border-blue-100 bg-blue-50 p-4 sm:p-5">
          <h2 className="text-xl font-black text-slate-950">More updates</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {related.map((item) => (
              <NewsCard key={item.id} post={item} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
