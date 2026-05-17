import { CalendarDays, PlayCircle } from "lucide-react";
import type { MediaItem } from "@/lib/types";
import { getYouTubeEmbedUrl } from "@/lib/youtube";

export function formatMediaDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

function mediaPreviewUrl(item: MediaItem) {
  if (item.imageUrl) return item.imageUrl;
  if (item.type === "youtube" && item.videoUrl) {
    const embedUrl = getYouTubeEmbedUrl(item.videoUrl);
    const videoId = embedUrl?.split("/embed/")[1]?.split("?")[0];
    return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : "";
  }
  return "";
}

export function MediaCard({ item, featured = false }: { item: MediaItem; featured?: boolean }) {
  const previewUrl = mediaPreviewUrl(item);
  const embedUrl = item.type === "youtube" && item.videoUrl ? getYouTubeEmbedUrl(item.videoUrl) : null;

  return (
    <article className="overflow-hidden rounded-xl border border-blue-100 bg-white shadow-[0_14px_36px_rgba(37,99,235,0.08)]">
      <div className="relative aspect-[16/10] overflow-hidden bg-blue-50">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            title={item.title}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : item.type === "video" && item.videoUrl ? (
          <video controls poster={item.imageUrl} className="h-full w-full bg-slate-950 object-cover">
            <source src={item.videoUrl} />
          </video>
        ) : (
          <div aria-hidden="true" className="h-full w-full bg-cover bg-center" style={{ backgroundImage: previewUrl ? `url(${previewUrl})` : undefined }} />
        )}
        {item.type !== "photo" && !embedUrl ? (
          <span className="absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
            <PlayCircle size={22} aria-hidden="true" />
          </span>
        ) : null}
        <span className="absolute right-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-black uppercase tracking-wide text-blue-700 shadow-sm">
          {item.type}
        </span>
      </div>
      <div className={featured ? "p-5" : "p-4"}>
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-blue-700">
          <CalendarDays size={14} aria-hidden="true" />
          {formatMediaDate(item.publishedAt)}
        </div>
        <h3 className="mt-2 break-words text-lg font-black leading-snug text-slate-950">{item.title}</h3>
        {item.caption ? <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{item.caption}</p> : null}
      </div>
    </article>
  );
}

export function MediaGrid({ items, emptyText, featured = false }: { items: MediaItem[]; emptyText: string; featured?: boolean }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <MediaCard key={item.id} item={item} featured={featured} />
      ))}
      {items.length === 0 ? (
        <p className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-5 text-sm font-semibold text-blue-700 md:col-span-2 xl:col-span-3">
          {emptyText}
        </p>
      ) : null}
    </div>
  );
}
