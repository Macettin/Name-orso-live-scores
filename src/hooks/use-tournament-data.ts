"use client";

import { createContext, createElement, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  deleteMatch,
  deleteMatchEvent,
  deleteMediaItem,
  deletePlayer,
  deleteTeam,
  deleteTournamentApplication,
  deleteTournament,
  deleteOfficial,
  deleteNewsPost,
  addPlayerMatchStat,
  upsertMatchTeamStats,
  upsertMatchLineups,
  upsertMatchOfficials,
  type TournamentData,
  updateMatchScore,
  upsertMatchEvent,
  upsertMatch,
  upsertOfficial,
  upsertMediaItem,
  upsertPlayer,
  upsertTeam,
  upsertTournamentApplication,
  upsertTournament,
  upsertNewsPost
} from "@/lib/data-store";
import {
  assignSupabaseClubAdmin,
  deleteSupabaseMatch,
  deleteSupabaseMatchEvent,
  deleteSupabaseMediaItem,
  deleteSupabasePlayer,
  deleteSupabaseOfficial,
  deleteSupabaseTeam,
  deleteSupabaseTeamAdminAssignment,
  deleteSupabaseTournamentApplication,
  deleteSupabaseTournament,
  deleteSupabaseNewsPost,
  fetchSupabaseMyTeamAdmins,
  fetchSupabaseTeamAdminAssignments,
  fetchSupabaseTournamentData,
  getCurrentProfile,
  getSupabaseClient,
  isSupabaseConfigured,
  saveSupabaseMatch,
  saveSupabaseMatchEvent,
  saveSupabaseMatchLineups,
  saveSupabaseMatchOfficials,
  saveSupabaseMatchTeamStats,
  saveSupabaseMediaItem,
  saveSupabaseOfficial,
  saveSupabasePlayer,
  saveSupabasePlayerMatchStat,
  saveSupabaseScore,
  saveSupabaseTeam,
  saveSupabaseTournament,
  saveSupabaseNewsPost,
  signInWithEmail,
  signOut,
  submitSupabaseTournamentApplication,
  updateSupabaseTournamentApplication,
  updateSupabaseTournamentApplicationStatus,
  uploadSupabasePlayerPhoto,
  uploadSupabaseTeamLogo
} from "@/lib/supabase";
import type { Match, MatchEvent, MatchLineupEntry, MatchOfficialAssignment, MatchStatus, MatchTeamStats, MediaItem, NewsPost, Official, Player, PlayerStatKey, Team, TeamAdminAssignment, Tournament, TournamentApplication, TournamentApplicationStatus, UserProfile } from "@/lib/types";

const emptyTournamentData: TournamentData = {
  tournaments: [],
  teams: [],
  players: [],
  matches: [],
  events: [],
  matchLineups: [],
  playerMatchStats: [],
  matchTeamStats: [],
  officials: [],
  matchOfficials: [],
  tournamentApplications: [],
  newsPosts: [],
  mediaItems: []
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

function useTournamentDataState() {
  const [data, setData] = useState<TournamentData>(emptyTournamentData);
  const [selectedTournamentId, setSelectedTournamentIdState] = useState(getInitialTournamentId);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [teamAdminAssignments, setTeamAdminAssignments] = useState<string[]>([]);
  const [clubAdminAssignments, setClubAdminAssignments] = useState<TeamAdminAssignment[]>([]);
  const [authLoading, setAuthLoading] = useState(() => isSupabaseConfigured());
  const [supabaseEnabled] = useState(isSupabaseConfigured());
  const [lastError, setLastError] = useState<string | null>(supabaseEnabled ? null : "Supabase is not configured.");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const hookId = useId();
  const refreshInFlight = useRef<{ tournamentId: string; promise: Promise<void> } | null>(null);
  const refreshQueued = useRef(false);
  const realtimeChannelName = `orso-live-score-data-${hookId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

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
      setLastUpdatedAt(new Date().toISOString());
      return;
    }

    if (refreshInFlight.current?.tournamentId === selectedTournamentId) {
      refreshQueued.current = true;
      await refreshInFlight.current.promise;
      return;
    }

    do {
      refreshQueued.current = false;
      const promise = fetchSupabaseTournamentData(selectedTournamentId)
        .then((nextData) => {
          setData(nextData);
          setLastUpdatedAt(new Date().toISOString());
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

      await promise;
    } while (refreshQueued.current);
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

    let realtimeChannelRemoved = false;
    const authSubscription = supabase.auth.onAuthStateChange(() => {
      void syncProfile();
    });
    const realtimeChannel = supabase
      .channel(realtimeChannelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "teams" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "players" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "match_stats" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "match_team_stats" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "match_lineups" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "officials" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "match_officials" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "tournament_applications" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "news_posts" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "media_items" }, () => void refresh())
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
  }, [realtimeChannelName, refresh, supabaseEnabled, syncProfile]);

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
    setLastUpdatedAt(new Date().toISOString());

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
    lastUpdatedAt,
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
    saveOfficial: (official: Official) =>
      persist(
        () => saveSupabaseOfficial({ ...official, tournamentId: official.tournamentId ?? selectedTournamentId }, selectedTournamentId),
        upsertOfficial(data, { ...official, tournamentId: official.tournamentId ?? selectedTournamentId })
      ),
    removeOfficial: (officialId: string) => persist(() => deleteSupabaseOfficial(officialId), deleteOfficial(data, officialId)),
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
    saveMatchTeamStats: (stats: MatchTeamStats) =>
      persist(
        () => saveSupabaseMatchTeamStats({ ...stats, tournamentId: stats.tournamentId ?? selectedTournamentId }, selectedTournamentId),
        upsertMatchTeamStats(data, { ...stats, tournamentId: stats.tournamentId ?? selectedTournamentId })
      ),
    saveMatchLineups: (entries: MatchLineupEntry[]) => {
      const nextEntries = entries.map((entry) => ({ ...entry, tournamentId: entry.tournamentId ?? selectedTournamentId }));
      return persist(() => saveSupabaseMatchLineups(nextEntries, selectedTournamentId), upsertMatchLineups(data, nextEntries));
    },
    saveMatchOfficials: (matchId: string, assignments: MatchOfficialAssignment[]) => {
      const nextAssignments = assignments.map((assignment) => ({ ...assignment, tournamentId: assignment.tournamentId ?? selectedTournamentId }));
      return persist(() => saveSupabaseMatchOfficials(matchId, nextAssignments, selectedTournamentId), upsertMatchOfficials(data, matchId, nextAssignments));
    },
    saveEvent: (event: MatchEvent) =>
      persist(
        () => saveSupabaseMatchEvent({ ...event, tournamentId: event.tournamentId ?? selectedTournamentId }, selectedTournamentId),
        upsertMatchEvent(data, { ...event, tournamentId: event.tournamentId ?? selectedTournamentId })
      ),
    removeEvent: (eventId: string) => persist(() => deleteSupabaseMatchEvent(eventId), deleteMatchEvent(data, eventId)),
    submitTournamentApplication: async (application: TournamentApplication) => {
      if (!supabaseEnabled) {
        throw new Error("Supabase is not configured.");
      }
      await submitSupabaseTournamentApplication(application, application.tournamentId || selectedTournamentId);
      await refresh();
    },
    saveTournamentApplicationStatus: (applicationId: string, status: TournamentApplicationStatus) => {
      const application = data.tournamentApplications.find((item) => item.id === applicationId);
      if (!application) return Promise.resolve();
      return persist(
        () => updateSupabaseTournamentApplicationStatus(applicationId, status),
        upsertTournamentApplication(data, { ...application, status })
      );
    },
    saveTournamentApplicationFollowUp: (
      applicationId: string,
      updates: {
        status?: TournamentApplicationStatus;
        teamId?: string;
        adminNote?: string;
        lastContactedAt?: string;
      }
    ) => {
      const application = data.tournamentApplications.find((item) => item.id === applicationId);
      if (!application) return Promise.resolve();
      return persist(
        () => updateSupabaseTournamentApplication(applicationId, updates),
        upsertTournamentApplication(data, { ...application, ...updates })
      );
    },
    removeTournamentApplication: (applicationId: string) =>
      persist(() => deleteSupabaseTournamentApplication(applicationId), deleteTournamentApplication(data, applicationId)),
    saveNewsPost: (post: NewsPost) =>
      persist(() => saveSupabaseNewsPost(post), upsertNewsPost(data, post)),
    removeNewsPost: (postId: string) =>
      persist(() => deleteSupabaseNewsPost(postId), deleteNewsPost(data, postId)),
    saveMediaItem: (item: MediaItem) =>
      persist(() => saveSupabaseMediaItem(item), upsertMediaItem(data, item)),
    removeMediaItem: (itemId: string) =>
      persist(() => deleteSupabaseMediaItem(itemId), deleteMediaItem(data, itemId))
  };
}

type TournamentDataContextValue = ReturnType<typeof useTournamentDataState>;

const TournamentDataContext = createContext<TournamentDataContextValue | null>(null);

export function TournamentDataProvider({ children }: { children: ReactNode }) {
  const value = useTournamentDataState();

  return createElement(TournamentDataContext.Provider, { value }, children);
}

export function useTournamentData() {
  const context = useContext(TournamentDataContext);

  if (!context) {
    throw new Error("useTournamentData must be used within TournamentDataProvider.");
  }

  return context;
}
