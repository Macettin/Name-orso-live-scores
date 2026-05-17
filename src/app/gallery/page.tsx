"use client";

import { MediaGrid } from "@/components/media-gallery";
import { PageHeader } from "@/components/ui";
import { useTournamentData } from "@/hooks/use-tournament-data";

export default function GalleryPage() {
  const { data, selectedTournamentId } = useTournamentData();
  const selectedTournament = data.tournaments.find((tournament) => tournament.id === selectedTournamentId);
  const publishedItems = data.mediaItems
    .filter((item) => item.isPublished)
    .sort((first, second) => new Date(second.publishedAt).getTime() - new Date(first.publishedAt).getTime());
  const selectedTournamentItems = selectedTournament
    ? publishedItems.filter((item) => item.tournamentId === selectedTournament.id)
    : [];
  const generalItems = publishedItems.filter((item) => !item.tournamentId);

  return (
    <main className="grid gap-6 pb-8">
      <PageHeader
        eyebrow="Gallery"
        title="Tournament media gallery"
        description="Published photo, video, and YouTube highlights from Orso tournaments."
      />
      {selectedTournament ? (
        <section className="rounded-xl border border-blue-100 bg-white p-4 shadow-[0_16px_42px_rgba(37,99,235,0.08)] sm:p-5">
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Selected tournament</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">{selectedTournament.name}</h2>
          </div>
          <MediaGrid items={selectedTournamentItems} emptyText="No media has been published for the selected tournament yet." featured />
        </section>
      ) : null}
      <section className="rounded-xl border border-blue-100 bg-blue-50 p-4 sm:p-5">
        <div className="mb-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">All media</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">Latest gallery items</h2>
        </div>
        <MediaGrid items={publishedItems} emptyText="Published media will appear here." />
      </section>
      {generalItems.length > 0 ? (
        <section className="rounded-xl border border-blue-100 bg-white p-4 shadow-[0_16px_42px_rgba(37,99,235,0.08)] sm:p-5">
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">General</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">General gallery</h2>
          </div>
          <MediaGrid items={generalItems} emptyText="No general media has been published yet." />
        </section>
      ) : null}
    </main>
  );
}
