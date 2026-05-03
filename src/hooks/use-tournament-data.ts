"use client";

import { useCallback, useEffect, useState } from "react";
import {
  deleteMatch,
  deletePlayer,
  deleteTeam,
  getTournamentData,
  saveTournamentData,
  TOURNAMENT_DATA_EVENT,
  TOURNAMENT_DATA_STORAGE_KEY,
  type TournamentData,
  updateMatchScore,
  upsertMatch,
  upsertPlayer,
  upsertTeam
} from "@/lib/data-store";
import type { Match, MatchStatus, Player, Team } from "@/lib/types";

const TOURNAMENT_DATA_API = "/api/tournament";

async function fetchTournamentData(signal?: AbortSignal): Promise<TournamentData> {
  const response = await fetch(TOURNAMENT_DATA_API, { cache: "no-store", signal });

  if (!response.ok) {
    throw new Error("Could not load tournament data.");
  }

  return response.json() as Promise<TournamentData>;
}

export function useTournamentData() {
  const [data, setData] = useState<TournamentData>(() => getTournamentData());

  useEffect(() => {
    const controller = new AbortController();

    function syncData() {
      setData(getTournamentData());
    }

    async function syncServerData() {
      try {
        const nextData = await fetchTournamentData(controller.signal);
        saveTournamentData(nextData);
        setData(nextData);
      } catch {
        syncData();
      }
    }

    function syncStorageData(event: StorageEvent) {
      if (event.key === TOURNAMENT_DATA_STORAGE_KEY) {
        syncData();
      }
    }

    void syncServerData();
    const refreshTimer = window.setInterval(() => {
      void syncServerData();
    }, 5000);

    window.addEventListener(TOURNAMENT_DATA_EVENT, syncData);
    window.addEventListener("storage", syncStorageData);

    return () => {
      controller.abort();
      window.clearInterval(refreshTimer);
      window.removeEventListener(TOURNAMENT_DATA_EVENT, syncData);
      window.removeEventListener("storage", syncStorageData);
    };
  }, []);

  const commit = useCallback((nextData: TournamentData) => {
    saveTournamentData(nextData);
    setData(nextData);

    void fetch(TOURNAMENT_DATA_API, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextData)
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Could not save tournament data.");
        }

        const savedData = (await response.json()) as TournamentData;
        saveTournamentData(savedData);
        setData(savedData);
      })
      .catch(() => {
        setData(nextData);
      });
  }, []);

  return {
    data,
    setData: commit,
    saveTeam: (team: Team) => commit(upsertTeam(data, team)),
    removeTeam: (teamId: string) => commit(deleteTeam(data, teamId)),
    savePlayer: (player: Player) => commit(upsertPlayer(data, player)),
    removePlayer: (playerId: string) => commit(deletePlayer(data, playerId)),
    saveMatch: (match: Match) => commit(upsertMatch(data, match)),
    removeMatch: (matchId: string) => commit(deleteMatch(data, matchId)),
    saveScore: (matchId: string, score: { homeScore: number; awayScore: number; periodLabel: string; status: MatchStatus }) =>
      commit(updateMatchScore(data, matchId, score))
  };
}
