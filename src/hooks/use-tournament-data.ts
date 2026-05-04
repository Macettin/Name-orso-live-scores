"use client";

import { useCallback, useEffect, useState } from "react";
import {
  deleteMatch,
  deletePlayer,
  deleteTeam,
  defaultTournamentData,
  type TournamentData,
  updateMatchScore,
  upsertMatch,
  upsertPlayer,
  upsertTeam
} from "@/lib/data-store";
import {
  deleteSupabaseMatch,
  deleteSupabasePlayer,
  deleteSupabaseTeam,
  fetchSupabaseTournamentData,
  getCurrentProfile,
  getSupabaseClient,
  isSupabaseConfigured,
  saveSupabaseMatch,
  saveSupabasePlayer,
  saveSupabaseScore,
  saveSupabaseTeam,
  signInWithEmail,
  signOut
} from "@/lib/supabase";
import type { Match, MatchStatus, Player, Team, UserProfile } from "@/lib/types";

export function useTournamentData() {
  const [data, setData] = useState<TournamentData>(defaultTournamentData);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(() => isSupabaseConfigured());
  const [supabaseEnabled] = useState(isSupabaseConfigured());
  const [lastError, setLastError] = useState<string | null>(supabaseEnabled ? null : "Supabase is not configured. Showing seed data.");

  const refresh = useCallback(async () => {
    if (!supabaseEnabled) {
      setData(defaultTournamentData);
      return;
    }

    try {
      const nextData = await fetchSupabaseTournamentData();
      setData(nextData);
      setLastError(null);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : "Could not load Supabase data.");
    }
  }, [supabaseEnabled]);

  useEffect(() => {
    queueMicrotask(() => {
      void refresh();
    });

    if (!supabaseEnabled) {
      return;
    }

    async function syncProfile() {
      try {
        setProfile(await getCurrentProfile());
      } catch {
        setProfile(null);
      } finally {
        setAuthLoading(false);
      }
    }

    void syncProfile();

    const refreshTimer = window.setInterval(() => {
      void refresh();
    }, 5000);

    const supabase = getSupabaseClient();
    const authSubscription = supabase?.auth.onAuthStateChange(() => {
      void syncProfile();
      void refresh();
    });
    const realtimeChannel = supabase
      ?.channel("orso-live-score-data")
      .on("postgres_changes", { event: "*", schema: "public", table: "teams" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "players" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "match_stats" }, () => void refresh())
      .subscribe();

    return () => {
      window.clearInterval(refreshTimer);
      authSubscription?.data.subscription.unsubscribe();
      if (realtimeChannel) {
        void supabase?.removeChannel(realtimeChannel);
      }
    };
  }, [refresh, supabaseEnabled]);

  async function persist(operation: () => Promise<void>, optimisticData: TournamentData) {
    setData(optimisticData);

    if (!supabaseEnabled) {
      setLastError("Supabase is not configured. Changes were not saved.");
      return;
    }

    try {
      await operation();
      await refresh();
    } catch (error) {
      setLastError(error instanceof Error ? error.message : "Could not save Supabase data.");
      await refresh();
    }
  }

  return {
    data,
    profile,
    authLoading,
    supabaseEnabled,
    lastError,
    canManageAll: profile?.role === "admin",
    canScore: profile?.role === "admin" || profile?.role === "scorer",
    login: signInWithEmail,
    logout: signOut,
    refresh,
    saveTeam: (team: Team) => persist(() => saveSupabaseTeam(team), upsertTeam(data, team)),
    removeTeam: (teamId: string) => persist(() => deleteSupabaseTeam(teamId), deleteTeam(data, teamId)),
    savePlayer: (player: Player) => persist(() => saveSupabasePlayer(player), upsertPlayer(data, player)),
    removePlayer: (playerId: string) => persist(() => deleteSupabasePlayer(playerId), deletePlayer(data, playerId)),
    saveMatch: (match: Match) => persist(() => saveSupabaseMatch(data, match), upsertMatch(data, match)),
    removeMatch: (matchId: string) => persist(() => deleteSupabaseMatch(matchId), deleteMatch(data, matchId)),
    saveScore: (matchId: string, score: { homeScore: number; awayScore: number; periodLabel: string; status: MatchStatus }) =>
      persist(() => saveSupabaseScore(matchId, score), updateMatchScore(data, matchId, score))
  };
}
