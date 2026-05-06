export function getYouTubeEmbedUrl(value?: string) {
  const rawValue = value?.trim();

  if (!rawValue) {
    return undefined;
  }

  try {
    const url = new URL(rawValue);
    const host = url.hostname.replace(/^www\./, "");
    let videoId = "";

    if (host === "youtu.be") {
      videoId = url.pathname.split("/").filter(Boolean)[0] ?? "";
    } else if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      const pathParts = url.pathname.split("/").filter(Boolean);

      if (url.pathname === "/watch") {
        videoId = url.searchParams.get("v") ?? "";
      } else if (["embed", "live", "shorts"].includes(pathParts[0])) {
        videoId = pathParts[1] ?? "";
      }
    }

    if (!videoId) {
      return rawValue;
    }

    return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}`;
  } catch {
    return rawValue;
  }
}
