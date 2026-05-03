"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { MatchQrCode } from "@/components/qr-code";
import { Card, PageHeader, StatusPill } from "@/components/ui";
import { getTeam } from "@/lib/data-store";
import { useTournamentData } from "@/hooks/use-tournament-data";

export default function MatchPage() {
  const params = useParams<{ matchId: string }>();
  const { data } = useTournamentData();
  const match = data.matches.find((item) => item.id === params.matchId);

  if (!match) {
    return <PageHeader title="Match not found" description="This match does not exist in the tournament data." />;
  }

  const home = getTeam(data, match.homeTeamId);
  const away = getTeam(data, match.awayTeamId);
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
            <Link href={`/teams/${home?.id}`} className="text-xl font-bold text-slate-950 hover:text-emerald-700">
              {home?.name}
            </Link>
            <div className="rounded-lg bg-slate-950 px-6 py-4 text-3xl font-black text-white">
              {match.homeScore} - {match.awayScore}
            </div>
            <Link href={`/teams/${away?.id}`} className="text-right text-xl font-bold text-slate-950 hover:text-emerald-700">
              {away?.name}
            </Link>
          </div>
          <p className="mt-5 rounded-lg bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">{match.periodLabel}</p>
          <h2 className="mt-6 text-lg font-bold text-slate-950">Match report</h2>
          <p className="mt-2 leading-7 text-slate-600">
            {match.report ?? "Report will be published after the match. Scorekeepers can update the match from the admin panel."}
          </p>
        </Card>
        <aside>
          <h2 className="mb-3 text-lg font-bold text-slate-950">QR-ready page</h2>
          <MatchQrCode value={qrValue} />
          <p className="mt-3 text-sm text-slate-600">Use this match URL on printed signs, seat cards, or hall displays.</p>
        </aside>
      </div>
    </>
  );
}
