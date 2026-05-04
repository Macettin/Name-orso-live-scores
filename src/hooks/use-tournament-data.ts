"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  deleteMatch,
  deletePlayer,
  deleteTeam,
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

const emptyTournamentData: TournamentData = {
  teams: [],
  players: [],
  matches: []
};

export function useTournamentData() {
  const [data, setData] = useState<TournamentData>(emptyTournamentData);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(() => isSupabaseConfigured());
  const [supabaseEnabled] = useState(isSupabaseConfigured());
  const [lastError, setLastError] = useState<string | null>(supabaseEnabled ? null : "Supabase is not configured.");
  const refreshInFlight = useRef<Promise<void> | null>(null);

  const syncProfile = useCallback(async () => {
    if (!supabaseEnabled) {
      setProfile(null);
      setAuthLoading(false);
      return;
    }

    try {
      setProfile(await getCurrentProfile());
    } catch {
      setProfile(null);
    } finally {
      setAuthLoading(false);
    }
  }, [supabaseEnabled]);

  const refresh = useCallback(async () => {
    if (!supabaseEnabled) {
      setData(emptyTournamentData);
      return;
    }

    if (!refreshInFlight.current) {
      refreshInFlight.current = fetchSupabaseTournamentData()
        .then((nextData) => {
          setData(nextData);
          setLastError(null);
        })
        .catch((error) => {
          setLastError(error instanceof Error ? error.message : "Could not load Supabase data.");
        })
        .finally(() => {
          refreshInFlight.current = null;
        });
    }

    await refreshInFlight.current;
  }, [supabaseEnabled]);

  useEffect(() => {
    queueMicrotask(() => {
      void refresh();
      void syncProfile();
    });

    if (!supabaseEnabled) {
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return;
    }

    for (const channel of supabase.getChannels()) {
      if (channel.topic === "realtime:orso-live-score-data") {
        void supabase.removeChannel(channel);
      }
    }

    let realtimeChannelRemoved = false;
    const authSubscription = supabase.auth.onAuthStateChange(() => {
      void syncProfile();
    });
    const realtimeChannel = supabase
      .channel("orso-live-score-data")
      .on("postgres_changes", { event: "*", schema: "public", table: "teams" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "players" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "match_stats" }, () => void refresh())
      .subscribe();

    return () => {
      authSubscription.data.subscription.unsubscribe();
      if (!realtimeChannelRemoved) {
        realtimeChannelRemoved = true;
        void supabase.removeChannel(realtimeChannel);
      }
    };
  }, [refresh, supabaseEnabled, syncProfile]);

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
