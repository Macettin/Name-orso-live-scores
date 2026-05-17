import { getTeam, type TournamentData } from "@/lib/data-store";
import { playerStatLabels, playerStatsBySport, type Player, type PlayerStatKey, type Team } from "@/lib/types";

function playerInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "P";
}

function PlayerAvatar({ player }: { player: Player }) {
  if (player.photoUrl) {
    return (
      <span
        aria-hidden="true"
        className="h-10 w-10 shrink-0 rounded-full bg-cover bg-center"
        style={{ backgroundImage: `url(${player.photoUrl})` }}
      />
    );
  }

  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">
      {playerInitials(player.name)}
    </span>
  );
}

export function PlayerStatTable({ players, teams }: { players: Player[]; teams: Team[] }) {
  const lookupData = { tournaments: [], teams, players: [], matches: [], events: [], matchLineups: [], playerMatchStats: [], matchTeamStats: [], officials: [], matchOfficials: [], tournamentApplications: [], newsPosts: [] } satisfies TournamentData;
  const visibleStats = Array.from(
    new Set(
      players.flatMap((player) => {
        const team = getTeam(lookupData, player.teamId);
        return team ? playerStatsBySport[team.sport] : [];
      })
    )
  ) as PlayerStatKey[];

  return (
    <div className="orso-card overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Player</th>
            <th className="px-4 py-3">Team</th>
            <th className="px-4 py-3">Position</th>
            {visibleStats.map((stat) => (
              <th key={stat} className="px-4 py-3 text-right">
                {playerStatLabels[stat]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {players.map((player) => {
            const team = getTeam(lookupData, player.teamId);
            return (
              <tr key={player.id} className="transition hover:bg-blue-50/40">
                <td className="px-4 py-3 font-semibold text-slate-900">
                  <div className="flex min-w-56 items-center gap-3">
                    <PlayerAvatar player={player} />
                    <span className="break-words">
                      #{player.number} {player.name}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 font-semibold text-slate-600">{team?.name}</td>
                <td className="px-4 py-3 text-slate-600">{player.position}</td>
                {visibleStats.map((stat) => (
                  <td key={stat} className="px-4 py-3 text-right font-bold text-slate-800">
                    {team && (playerStatsBySport[team.sport] as readonly PlayerStatKey[]).includes(stat) ? player.stats[stat] : "-"}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
