"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  deleteMatch,
  deleteMatchEvent,
  deletePlayer,
  deleteTeam,
  deleteTournament,
  addPlayerMatchStat,
  type TournamentData,
  updateMatchScore,
  upsertMatchEvent,
  upsertMatch,
  upsertPlayer,
  upsertTeam,
  upsertTournament
} from "@/lib/data-store";
import {
  assignSupabaseClubAdmin,
  deleteSupabaseMatch,
  deleteSupabaseMatchEvent,
  deleteSupabasePlayer,
  deleteSupabaseTeam,
  deleteSupabaseTeamAdminAssignment,
  deleteSupabaseTournament,
  fetchSupabaseMyTeamAdmins,
  fetchSupabaseTeamAdminAssignments,
  fetchSupabaseTournamentData,
  getCurrentProfile,
  getSupabaseClient,
  isSupabaseConfigured,
  saveSupabaseMatch,
  saveSupabaseMatchEvent,
  saveSupabasePlayer,
  saveSupabasePlayerMatchStat,
  saveSupabaseScore,
  saveSupabaseTeam,
  saveSupabaseTournament,
  signInWithEmail,
  signOut,
  uploadSupabasePlayerPhoto,
  uploadSupabaseTeamLogo
} from "@/lib/supabase";
import type { Match, MatchEvent, MatchStatus, Player, PlayerStatKey, Team, TeamAdminAssignment, Tournament, UserProfile } from "@/lib/types";

const emptyTournamentData: TournamentData = {
  tournaments: [],
  teams: [],
  players: [],
  matches: [],
  events: []
};
const defaultTournamentId = "main-tournament";
const selectedTournamentStorageKey = "orso-selected-tournament";
const selectedTournamentChangeEvent = "orso-selected-tournament-change";

function getInitialTournamentId() {
  if (typeof window === "undefined") {
    return defaultTournamentId;
  }

  return window.localStorage.getItem(selectedTournamentStorageKey) || defaultTournamentId;
}

export function useTournamentData() {
  const [data, setData] = useState<TournamentData>(emptyTournamentData);
  const [selectedTournamentId, setSelectedTournamentIdState] = useState(getInitialTournamentId);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [teamAdminAssignments, setTeamAdminAssignments] = useState<string[]>([]);
  const [clubAdminAssignments, setClubAdminAssignments] = useState<TeamAdminAssignment[]>([]);
  const [authLoading, setAuthLoading] = useState(() => isSupabaseConfigured());
  const [supabaseEnabled] = useState(isSupabaseConfigured());
  const [lastError, setLastError] = useState<string | null>(supabaseEnabled ? null : "Supabase is not configured.");
  const refreshInFlight = useRef<{ tournamentId: string; promise: Promise<void> } | null>(null);

  const syncProfile = useCallback(async () => {
    if (!supabaseEnabled) {
      setProfile(null);
      setAuthLoading(false);
      return;
    }

    try {
      const nextProfile = await getCurrentProfile();
      setProfile(nextProfile);

      if (nextProfile?.role === "club_admin") {
        const assignments = await fetchSupabaseMyTeamAdmins();
        setTeamAdminAssignments(assignments.map((assignment) => assignment.teamId));
        setClubAdminAssignments([]);
      } else if (nextProfile?.role === "admin") {
        setTeamAdminAssignments([]);
        setClubAdminAssignments(await fetchSupabaseTeamAdminAssignments());
      } else {
        setTeamAdminAssignments([]);
        setClubAdminAssignments([]);
      }
    } catch {
      setProfile(null);
      setTeamAdminAssignments([]);
      setClubAdminAssignments([]);
    } finally {
      setAuthLoading(false);
    }
  }, [supabaseEnabled]);

  const refresh = useCallback(async () => {
    if (!supabaseEnabled) {
      setData(emptyTournamentData);
      return;
    }

    if (!refreshInFlight.current || refreshInFlight.current.tournamentId !== selectedTournamentId) {
      const promise = fetchSupabaseTournamentData(selectedTournamentId)
        .then((nextData) => {
          setData(nextData);
          setLastError(null);
        })
        .catch((error) => {
          setLastError(error instanceof Error ? error.message : "Could not load Supabase data.");
        })
        .finally(() => {
          if (refreshInFlight.current?.tournamentId === selectedTournamentId) {
            refreshInFlight.current = null;
          }
        });

      refreshInFlight.current = { tournamentId: selectedTournamentId, promise };
    }

    await refreshInFlight.current.promise;
  }, [selectedTournamentId, supabaseEnabled]);

  const setSelectedTournamentId = useCallback((tournamentId: string) => {
    const nextTournamentId = tournamentId || defaultTournamentId;
    setSelectedTournamentIdState(nextTournamentId);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(selectedTournamentStorageKey, nextTournamentId);
      window.dispatchEvent(new CustomEvent(selectedTournamentChangeEvent, { detail: nextTournamentId }));
    }
  }, []);

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
      .on("postgres_changes", { event: "*", schema: "public", table: "tournaments" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "match_events" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "team_admins" }, () => void syncProfile())
      .subscribe();

    return () => {
      authSubscription.data.subscription.unsubscribe();
      if (!realtimeChannelRemoved) {
        realtimeChannelRemoved = true;
        void supabase.removeChannel(realtimeChannel);
      }
    };
  }, [refresh, supabaseEnabled, syncProfile]);

  useEffect(() => {
    function handleSelectedTournamentChange(event: Event) {
      const tournamentId =
        event instanceof CustomEvent && typeof event.detail === "string"
          ? event.detail
          : window.localStorage.getItem(selectedTournamentStorageKey) || defaultTournamentId;

      setSelectedTournamentIdState(tournamentId);
    }

    window.addEventListener(selectedTournamentChangeEvent, handleSelectedTournamentChange);
    window.addEventListener("storage", handleSelectedTournamentChange);

    return () => {
      window.removeEventListener(selectedTournamentChangeEvent, handleSelectedTournamentChange);
      window.removeEventListener("storage", handleSelectedTournamentChange);
    };
  }, []);

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

  async function refreshClubAdminAssignments() {
    if (!supabaseEnabled || profile?.role !== "admin") {
      setClubAdminAssignments([]);
      return;
    }

    setClubAdminAssignments(await fetchSupabaseTeamAdminAssignments());
  }

  return {
    data,
    profile,
    authLoading,
    supabaseEnabled,
    lastError,
    selectedTournamentId,
    setSelectedTournamentId,
    canManageAll: profile?.role === "admin",
    canScore: profile?.role === "admin" || profile?.role === "scorer",
    canManageClub: profile?.role === "club_admin",
    clubAdminTeamIds: teamAdminAssignments,
    clubAdminAssignments,
    login: signInWithEmail,
    logout: signOut,
    refresh,
    assignClubAdmin: async (email: string, teamId: string) => {
      await assignSupabaseClubAdmin(email, teamId);
      await refreshClubAdminAssignments();
    },
    removeClubAdminAssignment: async (userId: string, teamId: string) => {
      await deleteSupabaseTeamAdminAssignment(userId, teamId);
      await refreshClubAdminAssignments();
    },
    uploadPlayerPhoto: uploadSupabasePlayerPhoto,
    uploadTeamLogo: uploadSupabaseTeamLogo,
    saveTournament: (tournament: Tournament) => persist(() => saveSupabaseTournament(tournament), upsertTournament(data, tournament)),
    removeTournament: (tournamentId: string) => {
      if (selectedTournamentId === tournamentId) {
        setSelectedTournamentId(defaultTournamentId);
      }
      return persist(() => deleteSupabaseTournament(tournamentId), deleteTournament(data, tournamentId));
    },
    saveTeam: (team: Team) =>
      persist(
        () => saveSupabaseTeam({ ...team, tournamentId: team.tournamentId ?? selectedTournamentId }, selectedTournamentId),
        upsertTeam(data, { ...team, tournamentId: team.tournamentId ?? selectedTournamentId })
      ),
    removeTeam: (teamId: string) => persist(() => deleteSupabaseTeam(teamId), deleteTeam(data, teamId)),
    savePlayer: (player: Player) =>
      persist(
        () => saveSupabasePlayer({ ...player, tournamentId: player.tournamentId ?? selectedTournamentId }, selectedTournamentId),
        upsertPlayer(data, { ...player, tournamentId: player.tournamentId ?? selectedTournamentId })
      ),
    removePlayer: (playerId: string) => persist(() => deleteSupabasePlayer(playerId), deletePlayer(data, playerId)),
    saveMatch: (match: Match) =>
      persist(
        () => saveSupabaseMatch(data, { ...match, tournamentId: match.tournamentId ?? selectedTournamentId }, selectedTournamentId),
        upsertMatch(data, { ...match, tournamentId: match.tournamentId ?? selectedTournamentId })
      ),
    removeMatch: (matchId: string) => persist(() => deleteSupabaseMatch(matchId), deleteMatch(data, matchId)),
    saveScore: (
      matchId: string,
      score: {
        homeScore: number;
        awayScore: number;
        periodLabel: string;
        status: MatchStatus;
        matchMinute?: string;
        clockLabel?: string;
        clockRunning?: boolean;
        clockStartedAt?: string;
        clockBaseSeconds?: number;
        clockCountdownSeconds?: number;
      }
    ) =>
      persist(() => saveSupabaseScore(matchId, score), updateMatchScore(data, matchId, score)),
    savePlayerMatchStat: (matchId: string, playerId: string, statKey: PlayerStatKey, amount = 1) =>
      persist(() => saveSupabasePlayerMatchStat(matchId, playerId, statKey, amount), addPlayerMatchStat(data, matchId, playerId, statKey, amount)),
    saveEvent: (event: MatchEvent) =>
      persist(
        () => saveSupabaseMatchEvent({ ...event, tournamentId: event.tournamentId ?? selectedTournamentId }, selectedTournamentId),
        upsertMatchEvent(data, { ...event, tournamentId: event.tournamentId ?? selectedTournamentId })
      ),
    removeEvent: (eventId: string) => persist(() => deleteSupabaseMatchEvent(eventId), deleteMatchEvent(data, eventId))
  };
}
