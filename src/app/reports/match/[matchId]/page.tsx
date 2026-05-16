"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { getTeam } from "@/lib/data-store";
import { useTournamentData } from "@/hooks/use-tournament-data";
import { formatMatchClock } from "@/lib/match-clock";
import { playerStatLabels, playerStatsBySport, type MatchEvent, type MatchEventType, type Official, type Player, type PlayerStatKey, type Team, type Tournament } from "@/lib/types";

const eventIcons: Record<MatchEventType, string> = {
  goal: "\u26bd",
  assist: "A",
  yellow: "YC",
  red: "RC",
  substitution: "SUB",
  own_goal: "OG",
  penalty_goal: "PEN",
  missed_penalty: "MISS"
};

const eventLabels: Record<MatchEventType, string> = {
  goal: "Goal",
  assist: "Assist",
  yellow: "Yellow card",
  red: "Red card",
  substitution: "Substitution",
  own_goal: "Own goal",
  penalty_goal: "Penalty goal",
  missed_penalty: "Missed penalty"
};

function minuteSortValue(event: MatchEvent) {
  const normalized = event.minute.toLowerCase().trim();

  if (normalized === "ht") return 45;
  if (normalized === "ft") return 120;

  const [base, stoppage] = normalized.replace("'", "").split("+");
  const baseMinute = Number(base);
  const stoppageMinute = Number(stoppage ?? 0);

  return Number.isFinite(baseMinute) ? baseMinute + stoppageMinute / 100 : 999;
}

function playerInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "P";
}

function initials(value: string) {
  const parts = value.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase()).join("") || "T";
}

function ReportLogo({
  src,
  alt,
  fallback,
  size = 56,
  className = ""
}: {
  src?: string;
  alt: string;
  fallback: string;
  size?: number;
  className?: string;
}) {
  if (src) {
    return (
      <span className={`flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white p-1 ${className}`} style={{ width: size, height: size }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} width={size} height={size} className="print-safe-image h-full w-full object-contain" />
      </span>
    );
  }

  return (
    <span className={`flex shrink-0 items-center justify-center rounded-lg bg-blue-50 font-black text-blue-700 ring-1 ring-blue-100 ${className}`} style={{ width: size, height: size }}>
      {fallback}
    </span>
  );
}

function TournamentLogo({ tournament }: { tournament?: Tournament }) {
  return (
    <ReportLogo
      src={tournament?.logoUrl || "/orso-logo.png"}
      alt={tournament?.logoUrl ? `${tournament.name} logo` : "Orso Sports Events logo"}
      fallback={(tournament?.name || "OR").slice(0, 2).toUpperCase()}
      size={56}
    />
  );
}

function TeamReportLogo({ team, size = 56 }: { team?: Team; size?: number }) {
  return <ReportLogo src={team?.logoUrl} alt={team ? `${team.name} logo` : "Team logo"} fallback={team ? initials(team.name) : "T"} size={size} />;
}

function PlayerAvatar({ player, size = "h-10 w-10" }: { player?: Player | null; size?: string }) {
  if (player?.photoUrl) {
    return (
      <span className={`${size} flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-slate-200`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={player.photoUrl} alt={`${player.name} photo`} width={40} height={40} className="print-safe-image h-full w-full object-cover" />
      </span>
    );
  }

  return (
    <span className={`${size} flex shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-black text-blue-700 ring-1 ring-blue-100`}>
      {player ? playerInitials(player.name) : "?"}
    </span>
  );
}

function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="print-hidden rounded-lg bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-blue-700">
      Print report
    </button>
  );
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="report-section rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="border-b border-slate-100 pb-2 text-lg font-black text-slate-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function OfficialsList({ officials }: { officials: Official[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {officials.map((official) => (
        <div key={official.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
          <p className="text-xs font-black uppercase tracking-wide text-blue-600">{official.role}</p>
          <p className="mt-1 font-black text-slate-950">{official.name}</p>
          <p className="text-sm font-semibold text-slate-500">{[official.city, official.country].filter(Boolean).join(", ") || "Location not set"}</p>
        </div>
      ))}
      {officials.length === 0 ? <p className="text-sm font-semibold text-slate-500">Officials to be confirmed by tournament administration.</p> : null}
    </div>
  );
}

function TeamHeader({ team, label }: { team?: Team; label: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <TeamReportLogo team={team} size={56} />
      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-wide text-blue-600">{label}</p>
        <p className="break-words text-xl font-black text-slate-950">{team?.name ?? label}</p>
      </div>
    </div>
  );
}

function PlayerList({ team, players }: { team?: Team; players: Player[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <div className="flex items-center gap-3 bg-blue-50 px-3 py-3">
        <TeamReportLogo team={team} size={40} />
        <h3 className="break-words font-black text-blue-950">{team?.name ?? "Team"}</h3>
      </div>
      <table className="report-table min-w-full divide-y divide-slate-100 text-sm">
        <thead>
          <tr>
            <th>Player</th>
            <th>Number</th>
            <th>Position</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player) => (
            <tr key={player.id}>
              <td>
                <div className="flex items-center gap-2">
                  <PlayerAvatar player={player} size="h-8 w-8" />
                  <span className="font-bold text-slate-950">{player.name}</span>
                </div>
              </td>
              <td>#{player.number}</td>
              <td>{player.position || "Player"}</td>
            </tr>
          ))}
          {players.length === 0 ? (
            <tr>
              <td colSpan={3} className="text-slate-400">Roster not available.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function statKeysForTeam(team?: Team): readonly PlayerStatKey[] {
  return team ? playerStatsBySport[team.sport] : ["points"];
}

function PlayerStatsTable({ team, players }: { team?: Team; players: Player[] }) {
  const statKeys = statKeysForTeam(team);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <div className="flex items-center gap-3 bg-slate-50 px-3 py-3">
        <TeamReportLogo team={team} size={36} />
        <h3 className="break-words font-black text-slate-950">{team?.name ?? "Team"}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="report-table min-w-full divide-y divide-slate-100 text-sm">
          <thead>
            <tr>
              <th>Player</th>
              {statKeys.map((stat) => (
                <th key={stat}>{playerStatLabels[stat]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr key={player.id}>
                <td>
                  <div className="flex min-w-48 items-center gap-2">
                    <PlayerAvatar player={player} size="h-8 w-8" />
                    <span className="font-bold text-slate-950">#{player.number} {player.name}</span>
                  </div>
                </td>
                {statKeys.map((stat) => (
                  <td key={stat}>{player.stats[stat]}</td>
                ))}
              </tr>
            ))}
            {players.length === 0 ? (
              <tr>
                <td colSpan={statKeys.length + 1} className="text-slate-400">Stats not available.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function MatchReportPage() {
  const params = useParams<{ matchId: string }>();
  const { data } = useTournamentData();
  const match = data.matches.find((item) => item.id === params.matchId);

  if (!match) {
    return (
      <div className="mx-auto max-w-4xl rounded-lg border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-black text-slate-950">Match report not found</h1>
        <Link href="/matches" className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-black text-white">
          Back
        </Link>
      </div>
    );
  }

  const home = getTeam(data, match.homeTeamId);
  const away = getTeam(data, match.awayTeamId);
  const tournament = data.tournaments.find((item) => item.id === match.tournamentId);
  const homePlayers = data.players.filter((player) => player.teamId === match.homeTeamId);
  const awayPlayers = data.players.filter((player) => player.teamId === match.awayTeamId);
  const events = data.events.filter((event) => event.matchId === match.id).sort((first, second) => minuteSortValue(first) - minuteSortValue(second));
  const officials = data.matchOfficials
    .filter((assignment) => assignment.matchId === match.id)
    .map((assignment) => data.officials.find((official) => official.id === assignment.officialId))
    .filter((official): official is Official => Boolean(official));
  const clockLabel = formatMatchClock(match);

  return (
    <main className="report-page mx-auto max-w-5xl bg-white p-4 text-slate-950 sm:p-6">
      <div className="print-hidden mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Link href={`/matches/${match.id}`} className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 hover:bg-blue-100">
            Back to match
          </Link>
          <Link href={`/reports/match-sheet/${match.id}`} className="rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-black text-blue-700 hover:bg-blue-50">
            Pre-match sheet
          </Link>
        </div>
        <PrintButton />
      </div>

      <article className="grid gap-5">
        <header className="rounded-lg border border-blue-100 bg-blue-50 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <TournamentLogo tournament={tournament} />
              <div className="min-w-0">
                <p className="text-sm font-black uppercase tracking-wide text-blue-700">Match report</p>
                <h1 className="break-words text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{tournament?.name ?? "Tournament"}</h1>
              </div>
            </div>
            <div className="grid gap-1 text-sm font-semibold text-slate-600 sm:text-right">
              <span>{match.date} {match.time}</span>
              <span>{match.court} / {match.hallSlug}</span>
              <span>{match.status} / {clockLabel}</span>
            </div>
          </div>
        </header>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
            <TeamHeader team={home} label="Home" />
            <div className="rounded-lg bg-blue-600 px-6 py-4 text-center text-5xl font-black leading-none text-white">
              {match.homeScore} - {match.awayScore}
            </div>
            <div className="sm:flex sm:justify-end sm:text-right">
              <TeamHeader team={away} label="Away" />
            </div>
          </div>
        </section>

        <ReportSection title="Goal and event timeline">
          <table className="report-table min-w-full divide-y divide-slate-100 text-sm">
            <thead>
              <tr>
                <th>Minute</th>
                <th>Event</th>
                <th>Team</th>
                <th>Player / Details</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => {
                const team = event.teamId ? getTeam(data, event.teamId) : null;
                const player = event.playerId ? data.players.find((item) => item.id === event.playerId) : null;
                return (
                  <tr key={event.id}>
                    <td className="font-black text-blue-700">{event.minute}</td>
                    <td>{eventIcons[event.type]} {eventLabels[event.type]}</td>
                    <td>{team?.name ?? "-"}</td>
                    <td>{[player?.name, event.description].filter(Boolean).join(" - ") || "Match event"}</td>
                  </tr>
                );
              })}
              {events.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-slate-400">No match events recorded.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </ReportSection>

        <ReportSection title="Full player lists">
          <div className="grid gap-4 lg:grid-cols-2">
            <PlayerList team={home} players={homePlayers} />
            <PlayerList team={away} players={awayPlayers} />
          </div>
        </ReportSection>

        <ReportSection title={`${match.sport} player stats`}>
          <div className="grid gap-4">
            <PlayerStatsTable team={home} players={homePlayers} />
            <PlayerStatsTable team={away} players={awayPlayers} />
          </div>
        </ReportSection>

        <ReportSection title="Match officials">
          <OfficialsList officials={officials} />
        </ReportSection>

        <ReportSection title="Report text">
          <p className="whitespace-pre-wrap leading-7 text-slate-700">
            {match.report ?? "Report will be published after the match."}
          </p>
        </ReportSection>
      </article>
    </main>
  );
}
