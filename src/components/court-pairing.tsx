"use client";

import { useState, useRef, useMemo, useCallback } from "react";
import { autoBalanceTeams } from "@/lib/elo";
import type { Profile } from "@/types/database";

interface PlayerInfo {
  userId: string;
  profile: Profile;
  elo: number;
  confirmed: boolean;
}

interface CourtPairingProps {
  players: PlayerInfo[];
  creatorId: string;
  currentUserId: string;
  onConfirm: (userId: string) => void;
  onPairingChange: (teamA: [string, string], teamB: [string, string]) => void;
  disabled?: boolean;
}

export function CourtPairing({
  players,
  creatorId,
  currentUserId,
  onConfirm,
  onPairingChange,
  disabled,
}: CourtPairingProps) {
  const isCreator = currentUserId === creatorId;

  // Auto-balance once on first render, then user controls from there
  const initialTeams = useRef(
    autoBalanceTeams(players.map((p) => ({ userId: p.userId, elo: p.elo })))
  );

  const [teamA, setTeamA] = useState<[string, string]>(initialTeams.current.teamA);
  const [teamB, setTeamB] = useState<[string, string]>(initialTeams.current.teamB);
  const [selected, setSelected] = useState<string | null>(null);
  const [hasSetInitialTeams, setHasSetInitialTeams] = useState(false);

  const playerMap = useMemo(() => {
    const map = new Map<string, PlayerInfo>();
    for (const p of players) map.set(p.userId, p);
    return map;
  }, [players]);

  const getPlayer = (id: string) => playerMap.get(id)!;

  const teamAAvg = Math.round(
    (getPlayer(teamA[0]).elo + getPlayer(teamA[1]).elo) / 2
  );
  const teamBAvg = Math.round(
    (getPlayer(teamB[0]).elo + getPlayer(teamB[1]).elo) / 2
  );
  const eloDiff = Math.abs(teamAAvg - teamBAvg);

  const allConfirmed = players.every((p) => p.confirmed);
  const currentConfirmed = players.find((p) => p.userId === currentUserId)?.confirmed;

  // Save initial team assignments once (creator only)
  const handleSetInitialTeams = useCallback(() => {
    if (hasSetInitialTeams) return;
    setHasSetInitialTeams(true);
    onPairingChange(teamA, teamB);
  }, [hasSetInitialTeams, onPairingChange, teamA, teamB]);

  const handlePlayerTap = (playerId: string) => {
    if (!isCreator || disabled) return;

    if (!selected) {
      setSelected(playerId);
      return;
    }

    if (selected === playerId) {
      setSelected(null);
      return;
    }

    // Swap the two players
    const allSlots = { a: [...teamA] as [string, string], b: [...teamB] as [string, string] };

    let fromTeam: "a" | "b" | null = null;
    let fromIdx = -1;
    let toTeam: "a" | "b" | null = null;
    let toIdx = -1;

    for (const team of ["a", "b"] as const) {
      const arr = allSlots[team];
      const si = arr.indexOf(selected);
      if (si !== -1) { fromTeam = team; fromIdx = si; }
      const ti = arr.indexOf(playerId);
      if (ti !== -1) { toTeam = team; toIdx = ti; }
    }

    if (fromTeam && toTeam && fromIdx !== -1 && toIdx !== -1) {
      allSlots[fromTeam][fromIdx] = playerId;
      allSlots[toTeam][toIdx] = selected;
      setTeamA(allSlots.a);
      setTeamB(allSlots.b);
      // Only notify parent on actual swap
      onPairingChange(allSlots.a, allSlots.b);
    }

    setSelected(null);
  };

  return (
    <div className="space-y-4">
      {/* Court */}
      <div className="relative rounded-xl border-2 border-green-600/30 bg-green-950/5 overflow-hidden">
        {/* Court surface */}
        <div className="px-4 py-5">
          {/* Team labels */}
          <div className="flex justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-green-700">
              Team A
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-green-700">
              Team B
            </span>
          </div>

          {/* Court with net */}
          <div className="flex items-stretch gap-0">
            {/* Team A side */}
            <div className="flex-1 flex flex-col gap-3 pr-3">
              {teamA.map((id) => (
                <PlayerChip
                  key={id}
                  player={getPlayer(id)}
                  isSelected={selected === id}
                  isCreator={isCreator}
                  disabled={disabled}
                  onTap={() => handlePlayerTap(id)}
                />
              ))}
            </div>

            {/* Net */}
            <div className="w-[3px] bg-green-600/40 rounded-full self-stretch relative">
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-green-600/60" />
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-green-600/60" />
            </div>

            {/* Team B side */}
            <div className="flex-1 flex flex-col gap-3 pl-3">
              {teamB.map((id) => (
                <PlayerChip
                  key={id}
                  player={getPlayer(id)}
                  isSelected={selected === id}
                  isCreator={isCreator}
                  disabled={disabled}
                  onTap={() => handlePlayerTap(id)}
                />
              ))}
            </div>
          </div>

          {/* Team averages */}
          <div className="flex justify-between mt-3">
            <span className="text-[12px] font-medium text-muted-foreground">
              Avg: {teamAAvg}
            </span>
            <span
              className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                eloDiff <= 20
                  ? "bg-green-100 text-green-700"
                  : eloDiff <= 50
                    ? "bg-amber-100 text-amber-700"
                    : "bg-red-100 text-red-700"
              }`}
            >
              {eloDiff === 0 ? "Perfectly balanced" : `${eloDiff} ELO gap`}
            </span>
            <span className="text-[12px] font-medium text-muted-foreground">
              Avg: {teamBAvg}
            </span>
          </div>
        </div>
      </div>

      {/* Instructions */}
      {isCreator && !disabled && (
        <p className="text-[12px] text-muted-foreground text-center">
          {selected
            ? "Now tap another player to swap"
            : "Tap a player to rearrange teams"}
        </p>
      )}
      {!isCreator && !disabled && (
        <p className="text-[12px] text-muted-foreground text-center">
          Waiting for {players.find((p) => p.userId === creatorId)?.profile.username || "creator"} to finalize teams
        </p>
      )}

      {/* Confirmation status */}
      <div className="flex flex-wrap justify-center gap-2">
        {players.map((p) => (
          <span
            key={p.userId}
            className={`inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-full font-medium ${
              p.confirmed
                ? "bg-green-100 text-green-700"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {p.confirmed ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            ) : (
              <span className="w-3 h-3 rounded-full border-2 border-current opacity-40" />
            )}
            {p.profile.username}
          </span>
        ))}
      </div>

      {/* Confirm button — first saves initial teams if not yet saved */}
      {!currentConfirmed && !disabled && (
        <button
          onClick={() => {
            handleSetInitialTeams();
            onConfirm(currentUserId);
          }}
          className="w-full py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-[14px] font-medium transition-colors"
        >
          Confirm Pairings
        </button>
      )}

      {currentConfirmed && !allConfirmed && (
        <p className="text-[13px] text-green-600 font-medium text-center">
          You confirmed. Waiting for others...
        </p>
      )}

      {allConfirmed && (
        <p className="text-[13px] text-green-600 font-medium text-center">
          All confirmed! Creating match...
        </p>
      )}
    </div>
  );
}

function PlayerChip({
  player,
  isSelected,
  isCreator,
  disabled,
  onTap,
}: {
  player: PlayerInfo;
  isSelected: boolean;
  isCreator: boolean;
  disabled?: boolean;
  onTap: () => void;
}) {
  const canInteract = isCreator && !disabled;

  return (
    <button
      onClick={onTap}
      disabled={!canInteract}
      className={`
        relative flex items-center gap-2.5 px-3 py-2.5 rounded-lg border-2 transition-all text-left w-full
        ${canInteract ? "cursor-pointer active:scale-[0.97]" : "cursor-default"}
        ${isSelected
          ? "border-green-500 bg-green-50 shadow-sm shadow-green-200/50"
          : "border-border bg-card hover:border-muted-foreground/30"
        }
      `}
    >
      {/* Avatar placeholder */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 ${
        isSelected ? "bg-green-600 text-white" : "bg-muted text-muted-foreground"
      }`}>
        {player.profile.username.charAt(0).toUpperCase()}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold truncate leading-tight">
          {player.profile.username}
        </p>
        <p className="text-[11px] text-muted-foreground leading-tight">
          {player.profile.skill_level} &middot; {player.elo}
        </p>
      </div>

      {/* Confirmed indicator */}
      {player.confirmed && (
        <div className="shrink-0 w-5 h-5 rounded-full bg-green-600 flex items-center justify-center">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
      )}
    </button>
  );
}
