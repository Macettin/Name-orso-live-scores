import { getYouTubeEmbedUrl } from "@/lib/youtube";

export function YouTubeEmbed({ url, title = "Match livestream", className = "" }: { url?: string; title?: string; className?: string }) {
  const embedUrl = getYouTubeEmbedUrl(url);

  if (!embedUrl) {
    return null;
  }

  return (
    <div className={`overflow-hidden rounded-lg border border-slate-200 bg-slate-950 shadow-sm ${className}`}>
      <iframe
        src={embedUrl}
        title={title}
        className="aspect-video w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
}
