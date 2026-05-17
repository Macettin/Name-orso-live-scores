import type { Metadata } from "next";
import NewsDetailClient from "./news-detail-client";

export const metadata: Metadata = {
  title: "News | Orso Live Scores",
  description: "Tournament news, announcements, results, and media updates."
};

export default async function NewsDetailPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  return <NewsDetailClient postId={postId} />;
}
