"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminScoreForm } from "@/components/admin-score-form";
import { PageHeader } from "@/components/ui";
import { useTournamentData } from "@/hooks/use-tournament-data";

export default function AdminPage() {
  const router = useRouter();
  const { authLoading, canManageClub, canScore, supabaseEnabled } = useTournamentData();

  useEffect(() => {
    if (!supabaseEnabled || authLoading) {
      return;
    }

    if (canManageClub) {
      router.replace("/club-admin");
      return;
    }

    if (!canScore) {
      router.replace("/login?next=/admin");
    }
  }, [authLoading, canManageClub, canScore, router, supabaseEnabled]);

  if (supabaseEnabled && authLoading) {
    return <PageHeader title="Checking access" description="Loading your Supabase session." />;
  }

  if (supabaseEnabled && !canScore) {
    return <PageHeader title="Admin access required" description="Redirecting to login." />;
  }

  return (
    <>
      <PageHeader title="Admin CMS" description="Manage shared teams, players, matches, and scores for the live tournament pages." />
      <AdminScoreForm />
    </>
  );
}
