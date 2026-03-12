"use client";

import { useState, useRef, useMemo, useCallback, useLayoutEffect, forwardRef } from "react";
import { autoBalanceTeams } from "@/lib/elo";
import type { Profile } from "@/types/database";

interface PlayerInfo {
  userId: string;
  profile: Profile;
  elo: number;
  team: "a" | "b" | null;
}

interface CourtPairingProps {
  players: PlayerInfo[];
  creatorId: string;
  currentUserId: string;
  onStartMatch: (teamA: [string, string], teamB: [string, string]) => void;
  onPairingChange?: (teamA: [string, string], teamB: [string, string]) => void | Promise<void>;
  disabled?: boolean;
}

export function CourtPairing({
  players,
  creatorId,
  currentUserId,
  onStartMatch,
  onPairingChange,
  disabled,
}: CourtPairingProps) {
  const isCreator = currentUserId === creatorId;

  // Use saved DB team assignments if all players have them, otherwise auto-balance
  const initialTeams = useRef(() => {
    const savedA = players.filter((p) => p.team === "a");
    const savedB = players.filter((p) => p.team === "b");
    if (savedA.length === 2 && savedB.length === 2) {
      return {
        teamA: [savedA[0].userId, savedA[1].userId] as [string, string],
        teamB: [savedB[0].userId, savedB[1].userId] as [string, string],
        fromDb: true,
      };
    }
    const auto = autoBalanceTeams(players.map((p) => ({ userId: p.userId, elo: p.elo })));
    return { ...auto, fromDb: false };
  });
  const computed = initialTeams.current();

  const [teamA, setTeamA] = useState<[string, string]>(computed.teamA);
  const [teamB, setTeamB] = useState<[string, string]>(computed.teamB);
  const [selected, setSelected] = useState<string | null>(null);
  const [autoBalanced, setAutoBalanced] = useState(!computed.fromDb);

  // FLIP animation refs
  const chipRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const prevRectsRef = useRef<Map<string, DOMRect>>(new Map());
  const pendingSwapRef = useRef<[string, string] | null>(null);

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

  // FLIP: after React re-renders with new positions, animate from old → new
  useLayoutEffect(() => {
    const swap = pendingSwapRef.current;
    if (!swap) return;
    pendingSwapRef.current = null;

    const [idA, idB] = swap;
    const elA = chipRefs.current.get(idA);
    const elB = chipRefs.current.get(idB);
    const oldA = prevRectsRef.current.get(idA);
    const oldB = prevRectsRef.current.get(idB);

    if (!elA || !elB || !oldA || !oldB) return;

    const newA = elA.getBoundingClientRect();
    const newB = elB.getBoundingClientRect();

    const dxA = oldA.left - newA.left;
    const dyA = oldA.top - newA.top;
    const dxB = oldB.left - newB.left;
    const dyB = oldB.top - newB.top;

    elA.style.transform = `translate(${dxA}px, ${dyA}px)`;
    elB.style.transform = `translate(${dxB}px, ${dyB}px)`;
    elA.style.transition = "none";
    elB.style.transition = "none";
    elA.style.zIndex = "10";
    elB.style.zIndex = "10";

    void elA.offsetHeight;

    elA.style.transition = "transform 0.25s ease-out";
    elB.style.transition = "transform 0.25s ease-out";
    elA.style.transform = "";
    elB.style.transform = "";

    const cleanup = () => {
      elA.style.transition = "";
      elA.style.zIndex = "";
      elB.style.transition = "";
      elB.style.zIndex = "";
    };
    elA.addEventListener("transitionend", cleanup, { once: true });
    setTimeout(cleanup, 300);
  }, [teamA, teamB]);

  // Snapshot positions for FLIP
  const snapshotPositions = useCallback(() => {
    const allIds = [...teamA, ...teamB];
    const rects = new Map<string, DOMRect>();
    for (const id of allIds) {
      const el = chipRefs.current.get(id);
      if (el) rects.set(id, el.getBoundingClientRect());
    }
    prevRectsRef.current = rects;
  }, [teamA, teamB]);

  const handlePlayerTap = (playerId: string) => {
    // Everyone can swap locally to preview, but only creator saves
    if (disabled) return;

    if (!selected) {
      setSelected(playerId);
      return;
    }

    if (selected === playerId) {
      setSelected(null);
      return;
    }

    // FLIP step 1: snapshot
    snapshotPositions();
    pendingSwapRef.current = [selected, playerId];

    // Swap
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
      setAutoBalanced(false);
      // Only save to DB if creator
      if (isCreator && onPairingChange) {
        onPairingChange(allSlots.a, allSlots.b);
      }
    }

    setSelected(null);
  };

  const handleAutoBalance = () => {
    if (!autoBalanced) {
      const auto = autoBalanceTeams(players.map((p) => ({ userId: p.userId, elo: p.elo })));
      snapshotPositions();
      const movedA = auto.teamA.find((id, i) => id !== teamA[i]);
      const movedB = auto.teamB.find((id, i) => id !== teamB[i]);
      if (movedA && movedB) pendingSwapRef.current = [movedA, movedB];

      setTeamA(auto.teamA);
      setTeamB(auto.teamB);
      setSelected(null);
      if (isCreator && onPairingChange) {
        onPairingChange(auto.teamA, auto.teamB);
      }
    }
    setAutoBalanced(!autoBalanced);
  };

  const setChipRef = useCallback((id: string, el: HTMLButtonElement | null) => {
    if (el) chipRefs.current.set(id, el);
    else chipRefs.current.delete(id);
  }, []);

  return (
    <div className="space-y-3">
      {/* Controls — above the court */}
      {isCreator && !disabled && (
        <div className="flex items-center justify-between">
          <p className="text-[12px] text-muted-foreground">
            {selected
              ? "Now tap another player to swap"
              : "Tap a player to rearrange teams"}
          </p>
          <button
            onClick={handleAutoBalance}
            className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1 rounded-full transition-colors shrink-0 ${
              autoBalanced
                ? "bg-green-100 text-green-700"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <span className={`inline-block w-2.5 h-2.5 rounded-full border-2 transition-colors ${
              autoBalanced
                ? "bg-green-600 border-green-600"
                : "border-muted-foreground/50"
            }`} />
            Auto-balance
          </button>
        </div>
      )}

      {/* Participant info — above the court */}
      {!isCreator && !disabled && (
        <div className="text-center space-y-1">
          <p className="text-[12px] text-muted-foreground">
            Preview pairings below. Only the organizer can save changes.
          </p>
          <p className="text-[11px] text-muted-foreground/70">
            On match day, discuss and the organizer can rearrange before scores are submitted.
          </p>
        </div>
      )}

      {/* Court */}
      <div className="relative rounded-xl border-2 border-green-600/30 bg-green-950/5 overflow-hidden">
        <div className="px-3 py-3">
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
          <div className="relative flex gap-0">
            {/* Team A side */}
            <div className="flex-1 min-w-0 flex flex-col gap-2 pr-2">
              {teamA.map((id) => (
                <PlayerChip
                  key={id}
                  ref={(el) => setChipRef(id, el)}
                  player={getPlayer(id)}
                  isSelected={selected === id}
                  canInteract={!disabled}
                  onTap={() => handlePlayerTap(id)}
                />
              ))}
            </div>

            {/* Net */}
            <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 flex flex-col items-center">
              <div className="w-2 h-2 rounded-full bg-green-600/60 shrink-0" />
              <div className="w-[3px] flex-1 bg-green-600/40 rounded-full" />
              <div className="w-2 h-2 rounded-full bg-green-600/60 shrink-0" />
            </div>

            {/* Team B side */}
            <div className="flex-1 min-w-0 flex flex-col gap-2 pl-2">
              {teamB.map((id) => (
                <PlayerChip
                  key={id}
                  ref={(el) => setChipRef(id, el)}
                  player={getPlayer(id)}
                  isSelected={selected === id}
                  canInteract={!disabled}
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

      {/* Start Match — creator only */}
      {isCreator && !disabled && (
        <button
          onClick={() => onStartMatch(teamA, teamB)}
          className="w-full py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-[14px] font-medium transition-colors"
        >
          Start Match
        </button>
      )}
    </div>
  );
}

const PlayerChip = forwardRef<
  HTMLButtonElement,
  {
    player: PlayerInfo;
    isSelected: boolean;
    canInteract: boolean;
    onTap: () => void;
  }
>(function PlayerChip({ player, isSelected, canInteract, onTap }, ref) {
  return (
    <button
      ref={ref}
      onClick={onTap}
      disabled={!canInteract}
      className={`
        relative flex items-center gap-1.5 px-1.5 py-1.5 rounded-lg border-2 text-left w-full overflow-hidden
        ${canInteract ? "cursor-pointer active:scale-[0.97]" : "cursor-default"}
        ${isSelected
          ? "border-green-500 bg-green-50 shadow-sm shadow-green-200/50"
          : "border-border bg-card hover:border-muted-foreground/30"
        }
      `}
    >
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
        isSelected ? "bg-green-600 text-white" : "bg-muted text-muted-foreground"
      }`}>
        {player.profile.username.charAt(0).toUpperCase()}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold truncate leading-tight">
          {player.profile.username}
        </p>
        <p className="text-[10px] text-muted-foreground leading-tight">
          {player.elo}
        </p>
      </div>
    </button>
  );
});
