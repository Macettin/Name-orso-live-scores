"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { useTournamentData } from "@/hooks/use-tournament-data";
import { createId } from "@/lib/data-store";
import { playerStatKeys, type Player, type Team } from "@/lib/types";
import { PageHeader, TeamLogo } from "@/components/ui";

type TeamForm = Pick<Team, "name" | "logoUrl" | "city" | "coach" | "colors">;
type PlayerForm = Pick<Player, "id" | "name" | "number" | "position" | "photoUrl">;

const emptyTeamForm: TeamForm = {
  name: "",
  logoUrl: "",
  city: "",
  coach: "",
  colors: ""
};

const emptyPlayerForm: PlayerForm = {
  id: "",
  name: "",
  number: 0,
  position: "",
  photoUrl: ""
};

const emptyStats = Object.fromEntries(playerStatKeys.map((key) => [key, 0])) as Player["stats"];

function labelClass() {
  return "text-sm font-semibold text-slate-600";
}

function inputClass() {
  return "mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";
}

function initials(value: string) {
  return (
    value
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "P"
  );
}

function PlayerAvatar({ player }: { player: Player }) {
  if (player.photoUrl) {
    return <span aria-hidden="true" className="h-10 w-10 shrink-0 rounded-lg bg-cover bg-center" style={{ backgroundImage: `url(${player.photoUrl})` }} />;
  }

  return <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-sm font-black text-blue-700 ring-1 ring-blue-100">{initials(player.name)}</span>;
}

export default function ClubAdminPage() {
  const router = useRouter();
  const {
    data,
    profile,
    authLoading,
    supabaseEnabled,
    lastError,
    selectedTournamentId,
    canManageClub,
    clubAdminTeamIds,
    logout,
    saveTeam,
    uploadTeamLogo,
    savePlayer,
    uploadPlayerPhoto,
    removePlayer
  } = useTournamentData();
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [teamFormTeamId, setTeamFormTeamId] = useState("");
  const [teamForm, setTeamForm] = useState<TeamForm>(emptyTeamForm);
  const [teamLogoFile, setTeamLogoFile] = useState<File | null>(null);
  const [playerForm, setPlayerForm] = useState<PlayerForm>(emptyPlayerForm);
  const [playerPhotoFile, setPlayerPhotoFile] = useState<File | null>(null);
  const [message, setMessage] = useState("Manage your assigned team details and roster.");

  const assignedTeams = useMemo(
    () => data.teams.filter((team) => clubAdminTeamIds.includes(team.id) && (!team.tournamentId || team.tournamentId === selectedTournamentId)),
    [clubAdminTeamIds, data.teams, selectedTournamentId]
  );
  const selectedTeam = assignedTeams.find((team) => team.id === selectedTeamId) ?? assignedTeams[0];
  const activeTeamForm =
    selectedTeam && teamFormTeamId === selectedTeam.id
      ? teamForm
      : {
          name: selectedTeam?.name ?? "",
          logoUrl: selectedTeam?.logoUrl ?? "",
          city: selectedTeam?.city ?? "",
          coach: selectedTeam?.coach ?? "",
          colors: selectedTeam?.colors ?? ""
        };
  const roster = selectedTeam ? data.players.filter((player) => player.teamId === selectedTeam.id) : [];

  useEffect(() => {
    if (!supabaseEnabled || authLoading) {
      return;
    }

    if (!canManageClub) {
      router.replace("/login?next=/club-admin");
    }
  }, [authLoading, canManageClub, router, supabaseEnabled]);

  async function submitTeam(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedTeam || !activeTeamForm.name.trim()) {
      return;
    }

    let logoUrl = activeTeamForm.logoUrl || undefined;
    if (teamLogoFile) {
      try {
        logoUrl = await uploadTeamLogo(selectedTeam.id, teamLogoFile);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not upload team logo.");
        return;
      }
    }

    await saveTeam({
      ...selectedTeam,
      name: activeTeamForm.name.trim(),
      logoUrl,
      city: activeTeamForm.city,
      coach: activeTeamForm.coach,
      colors: activeTeamForm.colors
    });
    setTeamLogoFile(null);
    setMessage(`Saved team details for ${activeTeamForm.name.trim()}.`);
  }

  function updateTeamForm(nextForm: TeamForm) {
    if (selectedTeam) {
      setTeamFormTeamId(selectedTeam.id);
    }
    setTeamForm(nextForm);
  }

  async function submitPlayer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedTeam || !playerForm.name.trim()) {
      return;
    }

    const existingPlayer = playerForm.id ? data.players.find((player) => player.id === playerForm.id) : undefined;
    const playerId = existingPlayer?.id ?? createId("player", playerForm.name);
    let photoUrl = playerForm.photoUrl || undefined;
    const nextPlayer: Player = {
      id: playerId,
      tournamentId: selectedTeam.tournamentId ?? selectedTournamentId,
      teamId: selectedTeam.id,
      name: playerForm.name.trim(),
      number: playerForm.number,
      position: playerForm.position,
      photoUrl,
      stats: existingPlayer?.baseStats ?? existingPlayer?.stats ?? emptyStats,
      baseStats: existingPlayer?.baseStats
    };

    if (playerPhotoFile && !existingPlayer) {
      await savePlayer(nextPlayer);
    }

    if (playerPhotoFile) {
      try {
        photoUrl = await uploadPlayerPhoto(playerId, playerPhotoFile);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not upload player photo.");
        return;
      }
    }

    await savePlayer({ ...nextPlayer, photoUrl });
    setPlayerForm(emptyPlayerForm);
    setPlayerPhotoFile(null);
    setMessage(`Saved player: ${playerForm.name.trim()}.`);
  }

  function editPlayer(player: Player) {
    setPlayerForm({
      id: player.id,
      name: player.name,
      number: player.number,
      position: player.position,
      photoUrl: player.photoUrl ?? ""
    });
    setPlayerPhotoFile(null);
  }

  if (supabaseEnabled && authLoading) {
    return <PageHeader title="Checking club access" description="Loading your Supabase session." />;
  }

  if (supabaseEnabled && !canManageClub) {
    return <PageHeader title="Club admin access required" description="Redirecting to login." />;
  }

  return (
    <>
      <PageHeader title="Club Admin" description="Manage your assigned team profile, branding, roster, and player photos." />

      <div className="grid gap-6">
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">{lastError ?? message}</div>

        {profile ? (
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Signed in</h2>
                <p className="mt-1 text-sm text-slate-400">
                  {profile.email} - {profile.role}
                </p>
              </div>
              <button onClick={() => void logout()} className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">
                <LogOut size={16} aria-hidden="true" />
                Sign out
              </button>
            </div>
          </section>
        ) : null}

        {assignedTeams.length > 1 ? (
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <label className="block max-w-xl">
              <span className={labelClass()}>Assigned team</span>
              <select
                value={selectedTeam?.id ?? ""}
                onChange={(event) => {
                  setSelectedTeamId(event.target.value);
                  setTeamFormTeamId("");
                  setTeamLogoFile(null);
                }}
                className={inputClass()}
              >
                {assignedTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
          </section>
        ) : null}

        {selectedTeam ? (
          <>
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <TeamLogo team={selectedTeam} size="h-14 w-14" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Team details</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {selectedTeam.sport} - {selectedTeam.group}
                  </p>
                </div>
              </div>
              <form onSubmit={submitTeam} className="grid gap-4 md:grid-cols-4">
                <label>
                  <span className={labelClass()}>Team name</span>
                  <input value={activeTeamForm.name} onChange={(event) => updateTeamForm({ ...activeTeamForm, name: event.target.value })} className={inputClass()} />
                </label>
                <label>
                  <span className={labelClass()}>City</span>
                  <input value={activeTeamForm.city} onChange={(event) => updateTeamForm({ ...activeTeamForm, city: event.target.value })} className={inputClass()} />
                </label>
                <label>
                  <span className={labelClass()}>Coach</span>
                  <input value={activeTeamForm.coach} onChange={(event) => updateTeamForm({ ...activeTeamForm, coach: event.target.value })} className={inputClass()} />
                </label>
                <label>
                  <span className={labelClass()}>Colors</span>
                  <input value={activeTeamForm.colors} onChange={(event) => updateTeamForm({ ...activeTeamForm, colors: event.target.value })} className={inputClass()} />
                </label>
                <label className="md:col-span-2">
                  <span className={labelClass()}>Team logo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => setTeamLogoFile(event.target.files?.[0] ?? null)}
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-blue-700"
                  />
                </label>
                <div className="flex items-end md:col-span-2">
                  <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                    <Save size={16} aria-hidden="true" />
                    Save team
                  </button>
                </div>
              </form>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Players</h2>
                  <p className="mt-1 text-sm text-slate-400">Add players, edit details, and upload player photos for this team.</p>
                </div>
                {playerForm.id ? (
                  <button
                    onClick={() => {
                      setPlayerForm(emptyPlayerForm);
                      setPlayerPhotoFile(null);
                    }}
                    className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"
                  >
                    <X size={16} aria-hidden="true" />
                    Cancel edit
                  </button>
                ) : null}
              </div>
              <form onSubmit={submitPlayer} className="grid gap-4 md:grid-cols-4">
                <label>
                  <span className={labelClass()}>Name</span>
                  <input value={playerForm.name} onChange={(event) => setPlayerForm({ ...playerForm, name: event.target.value })} className={inputClass()} />
                </label>
                <label>
                  <span className={labelClass()}>Number</span>
                  <input type="number" value={playerForm.number} onChange={(event) => setPlayerForm({ ...playerForm, number: Number(event.target.value) })} className={inputClass()} />
                </label>
                <label>
                  <span className={labelClass()}>Position</span>
                  <input value={playerForm.position} onChange={(event) => setPlayerForm({ ...playerForm, position: event.target.value })} className={inputClass()} />
                </label>
                <label>
                  <span className={labelClass()}>Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => setPlayerPhotoFile(event.target.files?.[0] ?? null)}
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-blue-700"
                  />
                </label>
                <div className="flex items-end md:col-span-4">
                  <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                    {playerForm.id ? <Save size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
                    {playerForm.id ? "Save player" : "Add player"}
                  </button>
                </div>
              </form>
              <div className="mt-5 divide-y divide-slate-100 rounded-lg border border-slate-200">
                {roster.map((player) => (
                  <div key={player.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <PlayerAvatar player={player} />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900">
                          #{player.number} {player.name}
                        </p>
                        <p className="text-sm text-slate-400">{player.position || "Player"}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => editPlayer(player)} className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold">
                        <Pencil size={14} aria-hidden="true" />
                        Edit
                      </button>
                      <button onClick={() => removePlayer(player.id)} className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-700">
                        <Trash2 size={14} aria-hidden="true" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {roster.length === 0 ? <p className="p-4 text-sm text-slate-400">No players are listed for this team yet.</p> : null}
              </div>
            </section>
          </>
        ) : (
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">No assigned team</h2>
            <p className="mt-1 text-sm text-slate-400">Ask an admin to assign your user account to a team.</p>
          </section>
        )}
      </div>
    </>
  );
}
