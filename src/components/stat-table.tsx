import { getTeam, type TournamentData } from "@/lib/data-store";
import type { Player, Team } from "@/lib/types";

export function PlayerStatTable({ players, teams }: { players: Player[]; teams: Team[] }) {
  const lookupData = { teams, players: [], matches: [] } satisfies TournamentData;

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Player</th>
            <th className="px-4 py-3">Team</th>
            <th className="px-4 py-3">Position</th>
            <th className="px-4 py-3 text-right">Points</th>
            <th className="px-4 py-3 text-right">AST</th>
            <th className="px-4 py-3 text-right">REB</th>
            <th className="px-4 py-3 text-right">BLK</th>
            <th className="px-4 py-3 text-right">Aces</th>
            <th className="px-4 py-3 text-right">Digs</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {players.map((player) => {
            const team = getTeam(lookupData, player.teamId);
            return (
              <tr key={player.id}>
                <td className="px-4 py-3 font-semibold text-slate-950">
                  #{player.number} {player.name}
                </td>
                <td className="px-4 py-3 text-slate-600">{team?.name}</td>
                <td className="px-4 py-3 text-slate-600">{player.position}</td>
                <td className="px-4 py-3 text-right font-semibold">{player.stats.points}</td>
                <td className="px-4 py-3 text-right">{player.stats.assists ?? "-"}</td>
                <td className="px-4 py-3 text-right">{player.stats.rebounds ?? "-"}</td>
                <td className="px-4 py-3 text-right">{player.stats.blocks ?? "-"}</td>
                <td className="px-4 py-3 text-right">{player.stats.aces ?? "-"}</td>
                <td className="px-4 py-3 text-right">{player.stats.digs ?? "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
