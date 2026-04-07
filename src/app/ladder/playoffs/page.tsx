"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { usePlayoffBracket, usePlayoffMatches, usePlayoffSeeds, usePlayoffTeams } from "@/lib/playoff-hooks";
import { getSeasonRange } from "@/lib/ladder-hooks";
import { checkForfeitDeadlines, advancePlayoffBracket, undoPlayoffAdvancement, ensurePlayoffMatchRows } from "@/lib/playoff-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/app-header";
import { Loader } from "@/components/loader";
import type { SkillTier, MatchMode, PlayoffMatchWithDetails, PlayoffRound, PlayoffTeamWithProfiles } from "@/types/database";
import { SKILL_TIER_LABELS, ROUND_LABELS } from "@/types/database";

const ADMIN_IDS = (process.env.NEXT_PUBLIC_ADMIN_IDS || "").split(",").map((s) => s.trim()).filter(Boolean);

export default function PlayoffsPage() {
  return (
    <Suspense fallback={<Loader />}>
      <PlayoffsPageInner />
    </Suspense>
  );
}

const TIERS: SkillTier[] = ["beginner", "intermediate", "advanced"];
const TIER_SHORT: Record<SkillTier, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

function PlayoffsPageInner() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTier = (searchParams.get("tier") || "beginner") as SkillTier;
  const initialMode = (searchParams.get("mode") || "singles") as MatchMode;
  const [tier, setTier] = useState<SkillTier>(initialTier);
  const [mode, setMode] = useState<MatchMode>(initialMode);

  const { bracket, loading: bracketLoading } = usePlayoffBracket(tier, mode);
  const { seeds, loading: seedsLoading } = usePlayoffSeeds(bracket?.id);
  const { teams, loading: teamsLoading } = usePlayoffTeams(bracket?.id);
  const { matches, loading: matchesLoading, refetch } = usePlayoffMatches(bracket?.id);

  const isAdmin = user && ADMIN_IDS.includes(user.id);
  const userId = user?.id;
  const season = getSeasonRange();
  const seasonLabel = `${new Date(season.start).getFullYear()} ${season.label} Season`;
  const isDoubles = mode === "doubles";

  // Build team lookup: lead_id → team
  const teamByLead = new Map(teams.map(t => [t.lead_id, t]));

  // Sync URL when tier/mode changes
  const handleSetTier = (t: SkillTier) => {
    setTier(t);
    router.replace(`/ladder/playoffs?tier=${t}&mode=${mode}`, { scroll: false });
  };

  const handleSetMode = (m: MatchMode) => {
    setMode(m);
    router.replace(`/ladder/playoffs?tier=${tier}&mode=${m}`, { scroll: false });
  };

  // Run maintenance checks on load
  useEffect(() => {
    if (bracket?.id && bracket.status === "active") {
      ensurePlayoffMatchRows(bracket.id).then(() => {
        checkForfeitDeadlines(bracket.id);
        refetch();
      });
    }
  }, [bracket?.id, bracket?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  if (authLoading || bracketLoading || matchesLoading || seedsLoading || teamsLoading) return <Loader />;

  if (!bracket || bracket.status === "cancelled") {
    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-lg mx-auto px-4 py-8 sm:px-6 space-y-5">
          <AppHeader title="Playoffs" subtitle={seasonLabel} onBack={() => router.push("/ladder")} />
          <ModeToggle mode={mode} onChange={handleSetMode} />
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {TIERS.map((t) => (
              <button
                key={t}
                onClick={() => handleSetTier(t)}
                className={`flex-1 text-[13px] font-medium py-2 rounded-md transition-colors ${
                  tier === t
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {TIER_SHORT[t]}
              </button>
            ))}
          </div>
          <div className="text-center py-12 text-[14px] text-muted-foreground">
            No active {isDoubles ? "doubles " : ""}playoffs for {SKILL_TIER_LABELS[tier]}.
          </div>
        </div>
      </main>
    );
  }

  const qf = matches.filter((m) => m.round === 1).sort((a, b) => a.position - b.position);
  const sf = matches.filter((m) => m.round === 2).sort((a, b) => a.position - b.position);
  const final = matches.filter((m) => m.round === 3);

  // Build seed lookup (individual seeds)
  const seedMap = new Map(seeds.map((s) => [s.user_id, s.seed]));
  // Build team seed lookup: lead_id → team seed
  const teamSeedMap = new Map(teams.map((t) => [t.lead_id, t.seed]));

  const handleAdminAdvance = async (pm: PlayoffMatchWithDetails, winnerId: string) => {
    await advancePlayoffBracket(bracket.id, pm.id, winnerId);
    await refetch();
  };

  const handleAdminUndo = async (pm: PlayoffMatchWithDetails) => {
    await undoPlayoffAdvancement(bracket.id, pm.id);
    await refetch();
  };

  const handleExtendDeadline = async (pm: PlayoffMatchWithDetails) => {
    const { supabase } = await import("@/lib/supabase");
    const newDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await supabase
      .from("playoff_matches")
      .update({ forfeit_deadline: newDeadline })
      .eq("id", pm.id);
    await refetch();
  };

  // Get champion display name
  const championName = (() => {
    if (!bracket.champion_id || final.length === 0) return null;
    const winnerProfile = final[0]?.winner;
    if (!winnerProfile) return null;
    if (isDoubles) {
      const team = teamByLead.get(bracket.champion_id);
      return team ? `${winnerProfile.username} & ${team.partner.username}` : winnerProfile.username;
    }
    return winnerProfile.username;
  })();

  const themeColor = isDoubles ? "amber" : "sky";

  return (
    <main className={`min-h-screen ${isDoubles ? "bg-amber-50/40 dark:bg-amber-950/10" : "bg-sky-50/40 dark:bg-sky-950/10"}`}>
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 space-y-5">
        <AppHeader
          title={`${SKILL_TIER_LABELS[tier]} ${isDoubles ? "Doubles " : ""}Playoffs`}
          subtitle={seasonLabel}
          badge={
            bracket.status === "completed" ? (
              <span className="inline-block text-[12px] px-2.5 py-0.5 rounded-full font-medium bg-green-100 text-green-800">
                Completed
              </span>
            ) : (
              <span className={`inline-block text-[12px] px-2.5 py-0.5 rounded-full font-medium ${
                isDoubles ? "bg-amber-100 text-amber-800" : "bg-sky-100 text-sky-800"
              }`}>
                Active
              </span>
            )
          }
          onBack={() => router.push("/ladder")}
        />

        {/* Mode toggle */}
        <ModeToggle mode={mode} onChange={handleSetMode} />

        {/* Tier toggle */}
        <div className="flex gap-1 bg-muted rounded-lg p-1 max-w-md mx-auto">
          {TIERS.map((t) => (
            <button
              key={t}
              onClick={() => handleSetTier(t)}
              className={`flex-1 text-[13px] font-medium py-2 rounded-md transition-colors ${
                tier === t
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {TIER_SHORT[t]}
            </button>
          ))}
        </div>

        {/* Bracket grid — scrollable on mobile */}
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="grid grid-cols-3 gap-3 md:gap-6 items-start min-w-[600px]">
          {/* QF Column */}
          <div className="space-y-3">
            <h3 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider text-center">
              Quarterfinals
            </h3>
            {qf.map((pm) => (
              <BracketMatchCard
                key={pm.id}
                pm={pm}
                seedMap={isDoubles ? teamSeedMap : seedMap}
                teamByLead={teamByLead}
                tier={tier}
                mode={mode}
                userId={userId}
                isAdmin={!!isAdmin}
                bracketCompleted={bracket.status === "completed"}
                onAdminAdvance={handleAdminAdvance}
                onAdminUndo={handleAdminUndo}
                onExtendDeadline={handleExtendDeadline}
              />
            ))}
          </div>

          {/* SF Column */}
          <div className="flex flex-col justify-around h-full space-y-6 pt-8">
            <h3 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider text-center">
              Semifinals
            </h3>
            {sf.map((pm) => (
              <BracketMatchCard
                key={pm.id}
                pm={pm}
                seedMap={isDoubles ? teamSeedMap : seedMap}
                teamByLead={teamByLead}
                tier={tier}
                mode={mode}
                userId={userId}
                isAdmin={!!isAdmin}
                bracketCompleted={bracket.status === "completed"}
                onAdminAdvance={handleAdminAdvance}
                onAdminUndo={handleAdminUndo}
                onExtendDeadline={handleExtendDeadline}
              />
            ))}
          </div>

          {/* Final Column */}
          <div className="flex flex-col justify-center h-full pt-8">
            <h3 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider text-center mb-3">
              Final
            </h3>
            {final.map((pm) => (
              <BracketMatchCard
                key={pm.id}
                pm={pm}
                seedMap={isDoubles ? teamSeedMap : seedMap}
                teamByLead={teamByLead}
                tier={tier}
                mode={mode}
                userId={userId}
                isAdmin={!!isAdmin}
                bracketCompleted={bracket.status === "completed"}
                onAdminAdvance={handleAdminAdvance}
                onAdminUndo={handleAdminUndo}
                onExtendDeadline={handleExtendDeadline}
              />
            ))}
            {bracket.status === "completed" && championName && (
              <div className="mt-4 text-center">
                <div className="inline-block bg-gradient-to-r from-yellow-400 to-amber-500 text-white px-4 py-2 rounded-xl shadow-lg">
                  <p className="text-[11px] uppercase tracking-wider font-semibold opacity-80">Champion{isDoubles ? "s" : ""}</p>
                  <p className="text-[16px] font-bold">{championName}</p>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>

        {/* Seeds / Teams table */}
        {isDoubles && teams.length > 0 ? (
          <Card>
            <CardContent className="pt-4">
              <h3 className="text-[13px] font-semibold mb-3">Team Seedings</h3>
              <div className="divide-y divide-border">
                {teams.map((t) => (
                  <div key={t.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-bold text-muted-foreground w-5 text-right">
                        #{t.seed}
                      </span>
                      <span className="text-[13px] font-medium">
                        {t.lead.username} & {t.partner.username}
                      </span>
                    </div>
                    <span className="text-[12px] text-muted-foreground">{t.team_elo} ELO</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : seeds.length > 0 && !isDoubles ? (
          <Card>
            <CardContent className="pt-4">
              <h3 className="text-[13px] font-semibold mb-3">Seedings</h3>
              <div className="divide-y divide-border">
                {seeds.map((s) => (
                  <div key={s.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-bold text-muted-foreground w-5 text-right">
                        #{s.seed}
                      </span>
                      <span className="text-[13px] font-medium">{s.profile.username}</span>
                    </div>
                    <span className="text-[12px] text-muted-foreground">{s.elo_at_seed} ELO</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </main>
  );
}

function ModeToggle({ mode, onChange }: { mode: MatchMode; onChange: (m: MatchMode) => void }) {
  return (
    <div className="flex gap-1 bg-muted rounded-lg p-1 max-w-[200px] mx-auto">
      <button
        onClick={() => onChange("singles")}
        className={`flex-1 text-[13px] font-medium py-1.5 rounded-md transition-colors ${
          mode === "singles"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Singles
      </button>
      <button
        onClick={() => onChange("doubles")}
        className={`flex-1 text-[13px] font-medium py-1.5 rounded-md transition-colors ${
          mode === "doubles"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Doubles
      </button>
    </div>
  );
}

function BracketMatchCard({
  pm,
  seedMap,
  teamByLead,
  tier,
  mode,
  userId,
  isAdmin,
  bracketCompleted,
  onAdminAdvance,
  onAdminUndo,
  onExtendDeadline,
}: {
  pm: PlayoffMatchWithDetails;
  seedMap: Map<string, number>;
  teamByLead: Map<string, PlayoffTeamWithProfiles>;
  tier: SkillTier;
  mode: MatchMode;
  userId: string | undefined;
  isAdmin: boolean;
  bracketCompleted: boolean;
  onAdminAdvance: (pm: PlayoffMatchWithDetails, winnerId: string) => void;
  onAdminUndo: (pm: PlayoffMatchWithDetails) => void;
  onExtendDeadline: (pm: PlayoffMatchWithDetails) => void;
}) {
  const [confirmAdvanceId, setConfirmAdvanceId] = useState<string | null>(null);
  const [confirmUndo, setConfirmUndo] = useState(false);
  const [busy, setBusy] = useState(false);

  const isDoubles = mode === "doubles";
  const isComplete = !!pm.winner_id;
  const hasBothPlayers = !!pm.player1_id && !!pm.player2_id;
  const hasMatch = !!pm.match_id;
  const matchScores = pm.matchData;

  const p1Seed = pm.player1_id ? seedMap.get(pm.player1_id) : null;
  const p2Seed = pm.player2_id ? seedMap.get(pm.player2_id) : null;

  // For doubles, check if userId is any team member
  const isParticipant = userId && (() => {
    if (pm.player1_id === userId || pm.player2_id === userId) return true;
    if (isDoubles) {
      const team1 = pm.player1_id ? teamByLead.get(pm.player1_id) : null;
      const team2 = pm.player2_id ? teamByLead.get(pm.player2_id) : null;
      if (team1?.partner_id === userId || team2?.partner_id === userId) return true;
    }
    return false;
  })();

  const matchLink = `/ladder/match/${pm.match_id}?tier=${tier}&mode=${mode}&from=playoffs`;

  // Get display names
  const getDisplayName = (playerId: string | null, profile: { username: string } | null) => {
    if (!playerId || !profile) return null;
    if (isDoubles) {
      const team = teamByLead.get(playerId);
      return team ? `${profile.username} & ${team.partner.username}` : profile.username;
    }
    return profile.username;
  };

  const p1Name = getDisplayName(pm.player1_id, pm.player1);
  const p2Name = getDisplayName(pm.player2_id, pm.player2);

  // Short name for admin buttons
  const getShortName = (playerId: string | null, profile: { username: string } | null) => {
    if (!playerId || !profile) return "?";
    if (isDoubles) {
      const team = teamByLead.get(playerId);
      return team ? `Team ${profile.username.slice(0, 5)}` : profile.username.slice(0, 8);
    }
    return profile.username.slice(0, 8);
  };

  const linkLabel = (() => {
    if (isComplete) return matchScores?.player1_scores ? "View scores →" : "View match →";
    if (!matchScores) return "View match →";
    if (matchScores.status === "confirmed") return "View scores →";
    if (matchScores.status === "pending" && (isParticipant || isAdmin)) return "Enter scores →";
    if (matchScores.status === "pending") return "Awaiting scores";
    if (matchScores.status === "score_submitted" && (isParticipant || isAdmin)) return "Confirm scores →";
    if (matchScores.status === "score_submitted") return "Awaiting confirmation";
    if (matchScores.status === "disputed") return "Disputed — view →";
    return "View match →";
  })();

  const handleAdvance = async (winnerId: string) => {
    if (confirmAdvanceId !== winnerId) {
      setConfirmAdvanceId(winnerId);
      setConfirmUndo(false);
      return;
    }
    setBusy(true);
    await onAdminAdvance(pm, winnerId);
    setConfirmAdvanceId(null);
    setBusy(false);
  };

  const handleUndo = async () => {
    if (!confirmUndo) {
      setConfirmUndo(true);
      setConfirmAdvanceId(null);
      return;
    }
    setBusy(true);
    await onAdminUndo(pm);
    setConfirmUndo(false);
    setBusy(false);
  };

  const themeColor = isDoubles ? "amber" : "sky";

  return (
    <Card className={`${isComplete ? "opacity-80" : ""} overflow-hidden`}>
      <CardContent className="p-3 space-y-1">
        {/* Side 1 */}
        <PlayerRow
          name={p1Name}
          seed={p1Seed ?? null}
          isWinner={pm.winner_id === pm.player1_id && !!pm.winner_id}
          isLoser={pm.winner_id !== null && pm.winner_id !== pm.player1_id && !!pm.player1_id}
          scores={matchScores?.player1_scores || null}
          opponentScores={matchScores?.player2_scores || null}
          themeColor={themeColor}
        />

        <div className="border-t border-border" />

        {/* Side 2 */}
        <PlayerRow
          name={p2Name}
          seed={p2Seed ?? null}
          isWinner={pm.winner_id === pm.player2_id && !!pm.winner_id}
          isLoser={pm.winner_id !== null && pm.winner_id !== pm.player2_id && !!pm.player2_id}
          scores={matchScores?.player2_scores || null}
          opponentScores={matchScores?.player1_scores || null}
          themeColor={themeColor}
        />

        {/* Status indicators */}
        {pm.forfeit && (
          <p className="text-[10px] text-red-500 font-medium text-center">Forfeit</p>
        )}
        {isComplete && !pm.forfeit && hasMatch && !matchScores?.player1_scores && (
          <p className="text-[10px] text-muted-foreground italic text-center">No scores recorded</p>
        )}

        {/* Link to match */}
        {hasMatch && (
          <a
            href={matchLink}
            className={`block text-[11px] ${isDoubles ? "text-amber-600" : "text-sky-600"} hover:underline text-center pt-1`}
          >
            {linkLabel}
          </a>
        )}

        {/* Admin: advance buttons */}
        {isAdmin && !bracketCompleted && hasBothPlayers && !isComplete && (
          <div className="pt-2 space-y-1 border-t border-dashed border-border">
            <div className="flex gap-1">
              <Button
                onClick={() => handleAdvance(pm.player1_id!)}
                disabled={busy}
                variant="outline"
                size="sm"
                className={`flex-1 text-[10px] h-6 ${
                  confirmAdvanceId === pm.player1_id
                    ? "text-green-700 border-green-400 bg-green-50 hover:bg-green-100"
                    : ""
                }`}
              >
                {confirmAdvanceId === pm.player1_id ? "Confirm?" : `Advance ${getShortName(pm.player1_id, pm.player1)}`}
              </Button>
              <Button
                onClick={() => handleAdvance(pm.player2_id!)}
                disabled={busy}
                variant="outline"
                size="sm"
                className={`flex-1 text-[10px] h-6 ${
                  confirmAdvanceId === pm.player2_id
                    ? "text-green-700 border-green-400 bg-green-50 hover:bg-green-100"
                    : ""
                }`}
              >
                {confirmAdvanceId === pm.player2_id ? "Confirm?" : `Advance ${getShortName(pm.player2_id, pm.player2)}`}
              </Button>
            </div>
            <Button
              onClick={() => onExtendDeadline(pm)}
              variant="ghost"
              size="sm"
              className="w-full text-[10px] h-6 text-muted-foreground"
            >
              Extend 24h
            </Button>
          </div>
        )}

        {/* Admin: undo (allow on completed brackets for the final match) */}
        {isAdmin && isComplete && (!bracketCompleted || pm.round === 3) && (
          <div className="pt-2 border-t border-dashed border-border">
            <Button
              onClick={handleUndo}
              disabled={busy}
              variant="ghost"
              size="sm"
              className={`w-full text-[10px] h-6 ${
                confirmUndo
                  ? "text-red-600 hover:text-red-700 hover:bg-red-50"
                  : "text-muted-foreground"
              }`}
            >
              {busy ? "..." : confirmUndo ? "Confirm undo?" : "Undo advance"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PlayerRow({
  name,
  seed,
  isWinner,
  isLoser,
  scores,
  opponentScores,
  themeColor,
}: {
  name: string | null;
  seed: number | null;
  isWinner: boolean;
  isLoser: boolean;
  scores: number[] | null;
  opponentScores: number[] | null;
  themeColor: "sky" | "amber";
}) {
  if (!name) {
    return (
      <div className="flex items-center justify-between py-1.5">
        <span className="text-[12px] text-muted-foreground italic">TBD</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-between py-1.5 ${isLoser ? "opacity-40" : ""}`}>
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        {seed != null && (
          <span className="text-[10px] font-bold text-muted-foreground w-4 text-right shrink-0">
            {seed}
          </span>
        )}
        <span className={`text-[12px] truncate ${
          isWinner
            ? `font-bold ${themeColor === "amber" ? "text-amber-600 dark:text-amber-400" : "text-sky-600 dark:text-sky-400"}`
            : "font-medium"
        }`}>
          {name}
        </span>
      </div>
      {scores && scores.length > 0 && (
        <div className="flex gap-0.5 shrink-0">
          {scores.map((s, i) => {
            const won = opponentScores && opponentScores[i] != null ? s > opponentScores[i] : false;
            return (
              <span
                key={i}
                className={`text-[11px] w-5 text-center rounded-sm px-0.5 ${
                  won
                    ? `font-bold text-foreground ${themeColor === "amber" ? "bg-amber-100 dark:bg-amber-900/40" : "bg-sky-100 dark:bg-sky-900/40"}`
                    : "font-medium text-muted-foreground"
                }`}
              >
                {s}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
