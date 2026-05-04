"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminScoreForm } from "@/components/admin-score-form";
import { PageHeader } from "@/components/ui";
import { useTournamentData } from "@/hooks/use-tournament-data";

export default function AdminPage() {
  const router = useRouter();
  const { authLoading, profile, supabaseEnabled } = useTournamentData();
  const canAccessAdmin = profile?.role === "admin" || profile?.role === "scorer";

  useEffect(() => {
    if (!supabaseEnabled || authLoading) {
      return;
    }

    if (!canAccessAdmin) {
      router.replace("/login?next=/admin");
    }
  }, [authLoading, canAccessAdmin, router, supabaseEnabled]);

  if (supabaseEnabled && authLoading) {
    return <PageHeader title="Checking access" description="Loading your Supabase session." />;
  }

  if (supabaseEnabled && !canAccessAdmin) {
    return <PageHeader title="Admin access required" description="Redirecting to login." />;
  }

  return (
    <>
      <PageHeader title="Admin CMS" description="Manage shared teams, players, matches, and scores for the live tournament pages." />
      <AdminScoreForm />
    </>
  );
}
