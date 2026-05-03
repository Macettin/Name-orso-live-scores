export type Sport = "Volleyball" | "Basketball";
export type MatchStatus = "Scheduled" | "Live" | "Final";

export type Team = {
  id: string;
  name: string;
  sport: Sport;
  group: string;
  city: string;
  coach: string;
  colors: string;
};

export type Player = {
  id: string;
  teamId: string;
  name: string;
  number: number;
  position: string;
  stats: {
    points: number;
    assists?: number;
    rebounds?: number;
    blocks?: number;
    aces?: number;
    digs?: number;
  };
};

export type Match = {
  id: string;
  sport: Sport;
  group: string;
  court: string;
  hallSlug: string;
  date: string;
  time: string;
  status: MatchStatus;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  periodLabel: string;
  report?: string;
};

export type Standing = {
  teamId: string;
  played: number;
  won: number;
  lost: number;
  pointsFor: number;
  pointsAgainst: number;
  tournamentPoints: number;
};
