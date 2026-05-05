"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { MatchQrCode } from "@/components/qr-code";
import { Card, PageHeader, StatusPill } from "@/components/ui";
import { getTeam } from "@/lib/data-store";
import { useTournamentData } from "@/hooks/use-tournament-data";
import type { MatchEvent, MatchEventType } from "@/lib/types";

const eventIcons: Record<MatchEventType, string> = {
  goal: "\u26bd",
  yellow: "\ud83d\udfe8",
  red: "\ud83d\udfe5",
  substitution: "\ud83d\udd01"
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

export default function MatchPage() {
  const params = useParams<{ matchId: string }>();
  const { data } = useTournamentData();
  const match = data.matches.find((item) => item.id === params.matchId);

  if (!match) {
    return <PageHeader title="Match not found" description="This match does not exist in the tournament data." />;
  }

  const home = getTeam(data, match.homeTeamId);
  const away = getTeam(data, match.awayTeamId);
  const tournament = data.tournaments.find((item) => item.id === match.tournamentId);
  const isFootball = tournament?.sportType === "Football";
  const events = data.events.filter((event) => event.matchId === match.id).sort((first, second) => minuteSortValue(first) - minuteSortValue(second));
  const qrValue = `/matches/${match.id}`;

  return (
    <>
      <PageHeader
        title={`${home?.name} vs ${away?.name}`}
        description={`${match.sport} - ${match.group} - ${match.court} - ${match.date} ${match.time}`}
        action={<StatusPill status={match.status} />}
      />
      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        <Card>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <Link href={`/teams/${home?.id}`} className="text-xl font-bold text-slate-900 hover:text-blue-700">
              {home?.name}
            </Link>
            <div className="rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 px-6 py-4 text-3xl font-black text-white shadow-md shadow-blue-900/25">
              {match.homeScore} - {match.awayScore}
            </div>
            <Link href={`/teams/${away?.id}`} className="text-right text-xl font-bold text-slate-900 hover:text-blue-700">
              {away?.name}
            </Link>
          </div>
          <p className="mt-5 rounded-lg bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
            {match.matchMinute ? `${match.matchMinute} - ${match.periodLabel}` : match.periodLabel}
          </p>
          {isFootball ? (
            <>
              <h2 className="mt-6 text-lg font-bold text-slate-900">Live timeline</h2>
              <div className="mt-3 grid gap-3">
                {events.length > 0 ? (
                  events.map((event) => {
                    const team = event.teamId ? getTeam(data, event.teamId) : null;
                    const player = event.playerId ? data.players.find((item) => item.id === event.playerId) : null;

                    return (
                      <div key={event.id} className="flex gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
                        <span className="shrink-0 rounded-md bg-blue-50 px-2.5 py-1 text-sm font-black text-blue-700">{event.minute}</span>
                        <div>
                          <p className="text-sm font-bold capitalize text-slate-900">
                            <span className="mr-2" aria-hidden="true">
                              {eventIcons[event.type]}
                            </span>
                            {event.type}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            {[team?.name, player?.name, event.description].filter(Boolean).join(" - ")}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-400">No timeline events yet.</p>
                )}
              </div>
            </>
          ) : null}
          <h2 className="mt-6 text-lg font-bold text-slate-900">Match report</h2>
          <p className="mt-2 leading-7 text-slate-600">
            {match.report ?? "Report will be published after the match. Scorekeepers can update the match from the admin panel."}
          </p>
        </Card>
        <aside>
          <h2 className="mb-3 text-lg font-bold text-slate-900">QR-ready page</h2>
          <MatchQrCode value={qrValue} />
          <p className="mt-3 text-sm text-slate-600">Use this match URL on printed signs, seat cards, or hall displays.</p>
        </aside>
      </div>
    </>
  );
}
