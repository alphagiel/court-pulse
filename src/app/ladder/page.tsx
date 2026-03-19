"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { skillToElo } from "@/lib/elo";
import {
  useLadderMembership,
  useLadderRankings,
  useProposals,
  useMyMatches,
  useTierPreviews,
  useSignupCounts,
  useSignupTeams,
  type TierPreview,
} from "@/lib/ladder-hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AppHeader } from "@/components/app-header";
import type {
  ProposalWithDetails,
  Match,
  MatchWithDetails,
  LadderRankEntry,
  SkillTier,
  MatchMode,
} from "@/types/database";
import { getSkillTier, SKILL_TIER_LABELS } from "@/types/database";
import { Loader } from "@/components/loader";
import { SwipeTabs } from "@/components/swipe-tabs";
import { Input } from "@/components/ui/input";
import { theme } from "@/lib/theme";
import { isTriangleZip } from "@/lib/geo";
import { EditProposalModal } from "@/components/edit-proposal-modal";

const L = theme.ladder;

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatDateTime(dateStr: string): string {
  return `${formatDate(dateStr)} at ${formatTime(dateStr)}`;
}

type Tab = "rankings" | "proposals" | "matches";

const TIER_SHORT: Record<SkillTier, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

const TIER_RANGE: Record<SkillTier, string> = {
  beginner: "2.5 – 3.0",
  intermediate: "3.5 – 4.0",
  advanced: "4.5 – 5.0",
};

export default function LadderPage() {
  return (
    <Suspense fallback={<Loader />}>
      <LadderPageInner />
    </Suspense>
  );
}

function LadderPageInner() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = user?.id;

  const userTier = profile ? getSkillTier(profile.skill_level) : "intermediate";

  const { member, loading: memberLoading, refetch: refetchMember } = useLadderMembership(userId);
  const { previews, loading: previewsLoading } = useTierPreviews();

  // State
  const tierFromUrl = searchParams.get("tier") as SkillTier | null;
  const modeFromUrl = searchParams.get("mode") as MatchMode | null;
  const tabFromUrl = searchParams.get("tab") as Tab | null;
  const [selectedTier, setSelectedTier] = useState<SkillTier | null>(
    tierFromUrl && ["beginner", "intermediate", "advanced"].includes(tierFromUrl) ? tierFromUrl : null
  );
  const [mode, setMode] = useState<MatchMode>(modeFromUrl === "doubles" ? "doubles" : "singles");
  const [tab, setTab] = useState<Tab>(
    tabFromUrl && ["rankings", "proposals", "matches"].includes(tabFromUrl) ? tabFromUrl : "rankings"
  );
  const [registering, setRegistering] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  // Zip code prompt state
  const [zipInput, setZipInput] = useState("");
  const [zipSaving, setZipSaving] = useState(false);
  const [zipError, setZipError] = useState<string | null>(null);

  // Sync URL with current state (replace, not push, to avoid polluting history)
  const updateUrl = (newTier: SkillTier | null, newMode: MatchMode, newTab: Tab) => {
    const params = new URLSearchParams();
    if (newTier) params.set("tier", newTier);
    if (newMode !== "singles") params.set("mode", newMode);
    if (newTier && newTab !== "rankings") params.set("tab", newTab);
    const qs = params.toString();
    router.replace(`/ladder${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  const handleSetTier = (tier: SkillTier | null, defaultTab?: Tab) => {
    const newTab = defaultTab || "proposals";
    setSelectedTier(tier);
    setTab(newTab);
    updateUrl(tier, mode, newTab);
  };

  const handleSetMode = (newMode: MatchMode, defaultTab?: Tab) => {
    const newTab = defaultTab || "proposals";
    setMode(newMode);
    setTab(newTab);
    updateUrl(selectedTier, newMode, newTab);
  };

  const handleSetTab = (newTab: Tab) => {
    setTab(newTab);
    updateUrl(selectedTier, mode, newTab);
  };

  // Hooks — mode-aware
  const activeTier = selectedTier || userTier;
  const { rankings, loading: rankingsLoading, refetch: refetchRankings } = useLadderRankings(activeTier, mode);
  const { proposals, loading: proposalsLoading, refetch: refetchProposals } = useProposals(activeTier, mode);
  const { matches, loading: matchesLoading, refetch: refetchMatches } = useMyMatches(userId, activeTier, mode);

  const isOwnTier = selectedTier === userTier;
  const isOutsideTriangle = !!profile?.zip_code && !isTriangleZip(profile.zip_code);
  const isReadOnly = isOutsideTriangle || (selectedTier !== null && !isOwnTier);
  const isDoubles = mode === "doubles";

  // Redirect if not authenticated
  if (!authLoading && !user) { router.replace("/login"); return null; }
  if (!authLoading && user && !profile) { router.replace("/setup"); return null; }

  const handleRegister = async () => {
    if (!userId || !profile) return;
    setRegistering(true);
    try {
      await supabase.from("ladder_members").insert({ user_id: userId });
      const initialElo = skillToElo(profile.skill_level);
      await supabase.from("ladder_ratings").insert([
        { user_id: userId, elo_rating: initialElo, mode: "singles" },
        { user_id: userId, elo_rating: initialElo, mode: "doubles" },
      ]);
      await refetchMember();
      await refetchRankings();
    } catch (err) {
      console.error("Registration error:", err);
    } finally {
      setRegistering(false);
    }
  };

  const handleAcceptProposal = async (proposal: ProposalWithDetails) => {
    if (!userId || isReadOnly) return;
    setActionId(proposal.id);
    try {
      const { data, error } = await supabase
        .from("proposals")
        .update({
          status: "accepted",
          accepted_by: userId,
          accepted_at: new Date().toISOString(),
        })
        .eq("id", proposal.id)
        .eq("status", "open")
        .select();

      if (error || !data || data.length === 0) {
        await refetchProposals();
        return;
      }

      await supabase.from("matches").insert({
        proposal_id: proposal.id,
        player1_id: proposal.creator_id,
        player2_id: userId,
      });

      await refetchProposals();
      await refetchMatches();
    } catch (err) {
      console.error("Accept error:", err);
    } finally {
      setActionId(null);
    }
  };

  const handleCancelProposal = async (proposal: ProposalWithDetails) => {
    if (!userId || isReadOnly) return;
    setActionId(proposal.id);
    try {
      const isOwner = proposal.creator_id === userId;

      if (proposal.status === "accepted") {
        await supabase.from("matches").delete().eq("proposal_id", proposal.id).eq("status", "pending");
      }

      if (isOwner) {
        await supabase.from("proposals").update({ status: "cancelled" }).eq("id", proposal.id);
      } else if (proposal.status === "accepted") {
        await supabase.from("proposals").update({
          status: "open", accepted_by: null, accepted_at: null,
        }).eq("id", proposal.id);
      }

      await refetchProposals();
      await refetchMatches();
    } catch (err) {
      console.error("Cancel error:", err);
    } finally {
      setActionId(null);
    }
  };

  if (authLoading || memberLoading || !profile) {
    return <LadderSkeleton />;
  }

  // Zip code prompt for existing users
  if (!profile.zip_code) {
    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-lg mx-auto px-4 py-8 sm:px-6 space-y-8">
          <AppHeader
            title="Ladder"
            subtitle="Compete & climb the rankings"
            backHref="/"
          />
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h2 className="text-[18px] font-semibold text-center">Add Your Zip Code</h2>
              <p className="text-[14px] text-muted-foreground text-center">
                To use the ladder, please add your zip code. This helps us determine eligibility for the NC Triangle ladder.
              </p>
              <div className="space-y-2">
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 27601"
                  value={zipInput}
                  onChange={(e) => {
                    setZipInput(e.target.value.replace(/\D/g, "").slice(0, 5));
                    setZipError(null);
                  }}
                  maxLength={5}
                  className="h-11 text-[15px] text-center"
                  autoFocus
                />
                {zipError && (
                  <p className="text-[13px] text-red-600 text-center">{zipError}</p>
                )}
              </div>
              <Button
                className="w-full"
                disabled={zipSaving}
                onClick={async () => {
                  const trimmed = zipInput.trim();
                  if (!/^\d{5}$/.test(trimmed)) {
                    setZipError("Please enter a valid 5-digit zip code");
                    return;
                  }
                  setZipSaving(true);
                  setZipError(null);
                  await supabase
                    .from("profiles")
                    .update({ zip_code: trimmed })
                    .eq("id", user!.id);
                  await refreshProfile();
                  setZipSaving(false);
                }}
              >
                {zipSaving ? "Saving..." : "Save Zip Code"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  // Geo gate — outside Triangle gets view-only landing
  if (isOutsideTriangle && !member) {
    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-lg mx-auto px-4 py-8 sm:px-6 space-y-6">
          <AppHeader
            title="Ladder"
            subtitle="Compete & climb the rankings"
            backHref="/"
          />

          <div className={`rounded-xl border ${L.cardActive} p-4 text-center space-y-2`}>
            <p className="text-[14px] font-medium">
              The ladder is currently available for players in the NC Triangle area (Raleigh, Durham, Chapel Hill).
            </p>
            <p className="text-[13px] text-muted-foreground">
              Pickup is available everywhere!
            </p>
            <p className="text-[12px] text-muted-foreground">
              You can update your zip code in{" "}
              <button onClick={() => router.push("/settings")} className="text-sky-600 hover:text-sky-700 font-medium underline">
                Settings
              </button>
            </p>
          </div>

          {/* Still show tier previews as view-only */}
          {previewsLoading ? (
            <div className="grid grid-cols-1 min-[360px]:grid-cols-3 gap-2.5">
              {[1, 2, 3].map((i) => <SkeletonTierCard key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 min-[360px]:grid-cols-3 gap-2.5">
              {previews.map((preview) => (
                <TierCard
                  key={preview.tier}
                  preview={preview}
                  isUserTier={preview.tier === userTier}
                  onSelect={() => {
                    handleSetTier(preview.tier, "rankings");
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    );
  }

  // Registration gate
  if (!member) {
    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-lg mx-auto px-4 py-8 sm:px-6 space-y-8">
          <AppHeader
            title="Ladder"
            subtitle="Compete & climb the rankings"
            backHref="/"
          />

          <Card>
            <CardContent className="pt-6 text-center space-y-4">
              <h2 className="text-[18px] font-semibold">Join the Ladder</h2>
              <p className="text-[14px] text-muted-foreground">
                Challenge other players, report scores, and climb the rankings.
                Free to join.
              </p>
              <div className="text-[13px] text-muted-foreground space-y-1">
                <p>Your tier: <span className="font-medium text-foreground">{SKILL_TIER_LABELS[userTier]}</span></p>
                <p>Starting rating: <span className="font-medium text-foreground">{skillToElo(profile.skill_level)}</span></p>
              </div>
              <Button onClick={handleRegister} disabled={registering} className="w-full">
                {registering ? "Registering..." : "Join the Ladder"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  // --- Landing page: mode + tier cards ---
  if (selectedTier === null) {
    return (
      <main className={`min-h-screen ${L.bg}`}>
        <div className="max-w-lg mx-auto px-4 py-8 sm:px-6 space-y-6">
          <AppHeader
            title="Ladder"
            subtitle={`${TIER_SHORT[userTier]}`}
            backHref="/"
          />

          {/* Outside Triangle banner for existing members */}
          {isOutsideTriangle && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-4 text-center space-y-1">
              <p className="text-[13px] font-medium text-amber-800 dark:text-amber-300">
                The ladder is currently available for NC Triangle players. You&apos;re in view-only mode.
              </p>
              <p className="text-[12px] text-amber-700 dark:text-amber-400">
                Update your zip code in{" "}
                <button onClick={() => router.push("/settings")} className="underline font-medium">
                  Settings
                </button>
              </p>
            </div>
          )}

          {/* Mode selection */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleSetMode("singles")}
              className={`flex flex-col items-center gap-1.5 rounded-xl border p-4 shadow-sm transition-colors ${
                mode === "singles"
                  ? L.cardActive
                  : "border-border bg-muted/40 hover:bg-muted/60"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              <span className="text-[15px] font-semibold">Singles</span>
              <span className="text-[12px] text-muted-foreground">1 v 1</span>
            </button>
            <button
              onClick={() => handleSetMode("doubles")}
              className={`flex flex-col items-center gap-1.5 rounded-xl border p-4 shadow-sm transition-colors ${
                mode === "doubles"
                  ? L.cardActive
                  : "border-border bg-muted/40 hover:bg-muted/60"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span className="text-[15px] font-semibold">Doubles</span>
              <span className="text-[12px] text-muted-foreground">2 v 2</span>
            </button>
          </div>

          {/* Tier cards */}
          {previewsLoading ? (
            <div className="grid grid-cols-1 min-[360px]:grid-cols-3 gap-2.5">
              {[1, 2, 3].map((i) => <SkeletonTierCard key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 min-[360px]:grid-cols-3 gap-2.5">
              {previews.map((preview) => (
                <TierCard
                  key={preview.tier}
                  preview={preview}
                  isUserTier={preview.tier === userTier}
                  onSelect={() => {
                    handleSetTier(preview.tier, isDoubles ? "proposals" : "rankings");
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    );
  }

  // --- Tier detail view ---
  return (
    <main className={`min-h-screen ${L.bg}`}>
      <div className="max-w-lg mx-auto px-4 py-8 sm:px-6 space-y-5">
        <AppHeader
          title={`${TIER_SHORT[selectedTier]} ${isDoubles ? "Doubles" : "Ladder"}`}
          subtitle={isOwnTier
            ? `${rankings.find(r => r.user_id === userId)?.elo_rating || "—"} ELO`
            : `${TIER_RANGE[selectedTier]} · View only`
          }
          onBack={() => handleSetTier(null)}
          action={!isReadOnly ? (
            <button
              onClick={() =>
                router.push(
                  `/ladder/proposals/new?tier=${selectedTier}${isDoubles ? "&mode=doubles" : ""}&tab=proposals`
                )
              }
              className={`w-12 h-12 flex items-center justify-center rounded-full ${L.button} shadow-md active:scale-95 transition-all shrink-0`}
              aria-label={isDoubles ? "Create Doubles Proposal" : "Propose a Match"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          ) : undefined}
        />

        {/* Mode toggle (compact) */}
        <div className="flex gap-1 bg-muted rounded-lg p-1 relative">
          {(["singles", "doubles"] as MatchMode[]).map((m) => (
            <button
              key={m}
              onClick={() => handleSetMode(m)}
              className="flex-1 relative z-10 text-[13px] font-medium py-2 rounded-md transition-colors capitalize"
            >
              {mode === m && (
                <motion.div
                  layoutId="mode-indicator"
                  className={`absolute inset-0 rounded-md ${L.toggle} shadow-sm`}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className={`relative z-10 ${mode === m ? "text-white" : "text-muted-foreground hover:text-foreground"}`}>
                {m === "singles" ? "Singles" : "Doubles"}
              </span>
            </button>
          ))}
        </div>

        {isReadOnly && (
          <div className="text-center bg-muted/60 rounded-lg py-2 px-3">
            <p className="text-[12px] text-muted-foreground">
              You&apos;re viewing the {TIER_SHORT[selectedTier]} tier. Your tier is {TIER_SHORT[userTier]}.
            </p>
          </div>
        )}

        {/* Content tabs + swipeable content */}
        <SwipeTabs
          id="ladder-tabs"
          tabs={
            isReadOnly
              ? [
                  { value: "rankings" as Tab, label: "Rankings" },
                  { value: "proposals" as Tab, label: "Proposals" },
                ]
              : [
                  { value: "rankings" as Tab, label: "Rankings" },
                  { value: "proposals" as Tab, label: "Proposals" },
                  { value: "matches" as Tab, label: "Matches" },
                ]
          }
          active={tab}
          onChange={handleSetTab}
        >
          {(activeTab) => (
            <>
              {activeTab === "rankings" && (
                <RankingsTab rankings={rankings} loading={rankingsLoading} currentUserId={userId} mode={mode} />
              )}
              {activeTab === "proposals" && !isDoubles && (
                <ProposalsTab
                  proposals={proposals}
                  loading={proposalsLoading}
                  currentUserId={userId!}
                  onAccept={handleAcceptProposal}
                  onCancel={handleCancelProposal}
                  actionId={actionId}
                  onCreateNew={() => router.push(`/ladder/proposals/new?tier=${selectedTier}&tab=proposals`)}
                  onEdit={() => refetchProposals()}
                  readOnly={isReadOnly}
                />
              )}
              {activeTab === "proposals" && isDoubles && (
                <DoublesProposalsTab
                  proposals={proposals}
                  loading={proposalsLoading}
                  currentUserId={userId!}
                  onCreateNew={() => router.push(`/ladder/proposals/new?tier=${selectedTier}&mode=doubles&tab=proposals`)}
                  onViewProposal={(id) => router.push(`/ladder/proposals/${id}?tier=${selectedTier}&mode=doubles&tab=proposals`)}
                  readOnly={isReadOnly}
                />
              )}
              {activeTab === "matches" && !isReadOnly && !isDoubles && (
                <MatchesTab
                  matches={matches}
                  loading={matchesLoading}
                  currentUserId={userId!}
                  onViewMatch={(id) => router.push(`/ladder/match/${id}?tier=${selectedTier}&tab=matches`)}
                />
              )}
              {activeTab === "matches" && !isReadOnly && isDoubles && (
                <DoublesMatchesTab
                  matches={matches}
                  loading={matchesLoading}
                  currentUserId={userId!}
                  onViewMatch={(id) => router.push(`/ladder/match/${id}?tier=${selectedTier}&mode=doubles&tab=matches`)}
                />
              )}
            </>
          )}
        </SwipeTabs>
      </div>
    </main>
  );
}

// --- Tier Landing Card ---

function TierCard({
  preview,
  isUserTier,
  onSelect,
}: {
  preview: TierPreview;
  isUserTier: boolean;
  onSelect: () => void;
}) {
  return (
    <Card
      className="cursor-pointer transition-all shadow-sm hover:shadow-md hover:border-foreground/20 hover:bg-muted/50 flex flex-col"
      onClick={onSelect}
    >
      <CardContent className="p-3 flex flex-col gap-[15px]">
        {/* Tier header */}
        <div>
          <h3 className="text-[13px] font-semibold leading-tight">
            {TIER_SHORT[preview.tier]}
          </h3>
          <p className="text-[10px] text-muted-foreground inline-flex items-center gap-1.5">
            {TIER_RANGE[preview.tier]}
            {isUserTier && (
              <>
                <span className="text-border">|</span>
                <span className={`inline-block w-2 h-2 rounded-full ${L.dot} shrink-0 animate-pulse`} title="Your tier" />
              </>
            )}
          </p>
        </div>

        <hr className="border-border" />

        <div className="space-y-1 text-[10px]">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Players</span>
            <span className="font-semibold">{preview.playerCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Proposals</span>
            <span className="font-semibold">{preview.openProposalsSingles + preview.openProposalsDoubles}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Matches</span>
            <span className="font-semibold">{preview.totalMatches}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Tab Components ---

const MIN_MATCHES_TO_RANK = 3;

function getSeasonRange(): { label: string; start: string; end: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  if (month >= 2 && month <= 4) return { label: "Spring", start: `${year}-03-01`, end: `${year}-06-01` };
  if (month >= 5 && month <= 7) return { label: "Summer", start: `${year}-06-01`, end: `${year}-09-01` };
  if (month >= 8 && month <= 10) return { label: "Fall", start: `${year}-09-01`, end: `${year}-12-01` };
  // Winter spans year boundary
  const winterStart = month <= 1 ? `${year - 1}-12-01` : `${year}-12-01`;
  const winterEnd = month <= 1 ? `${year}-03-01` : `${year + 1}-03-01`;
  return { label: "Winter", start: winterStart, end: winterEnd };
}

interface RecentMatch {
  opponentName: string;
  opponentElo: number;
  won: boolean;
  date: string;
}

// Helpers for doubles-aware match logic
function getPlayerIds(m: Match): string[] {
  return [m.player1_id, m.player2_id, m.player3_id, m.player4_id].filter(Boolean) as string[];
}

function isPlayerInMatch(m: Match, userId: string): boolean {
  return getPlayerIds(m).includes(userId);
}

function didPlayerWin(m: Match, userId: string, mode: MatchMode): boolean {
  if (mode === "singles") return m.winner_id === userId;
  const teamA = [m.player1_id, m.player2_id].filter(Boolean);
  const teamB = [m.player3_id, m.player4_id].filter(Boolean);
  if (m.winning_team === "a") return teamA.includes(userId);
  return teamB.includes(userId);
}

function getOpponentIds(m: Match, userId: string, mode: MatchMode): string[] {
  if (mode === "singles") {
    return [m.player1_id === userId ? m.player2_id : m.player1_id];
  }
  const teamA = [m.player1_id, m.player2_id].filter(Boolean) as string[];
  const teamB = [m.player3_id, m.player4_id].filter(Boolean) as string[];
  return teamA.includes(userId) ? teamB : teamA;
}

function usePlayerMatches(userId: string, mode: MatchMode, isExpanded: boolean) {
  const [recent, setRecent] = useState<RecentMatch[]>([]);
  const [bestWin, setBestWin] = useState<RecentMatch | null>(null);
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isExpanded || fetchedRef.current === userId) return;
    fetchedRef.current = userId;
    setLoading(true);

    const season = getSeasonRange();

    (async () => {
      // Fetch confirmed matches — for doubles, player could be in any of the 4 slots
      const orFilter = mode === "singles"
        ? `player1_id.eq.${userId},player2_id.eq.${userId}`
        : `player1_id.eq.${userId},player2_id.eq.${userId},player3_id.eq.${userId},player4_id.eq.${userId}`;

      const { data: matches } = await supabase
        .from("matches")
        .select("*")
        .eq("mode", mode)
        .eq("status", "confirmed")
        .or(orFilter)
        .order("created_at", { ascending: false })
        .limit(5);

      if (!matches || matches.length === 0) {
        setRecent([]);
        setBestWin(null);
        setLoading(false);
        return;
      }

      // Gather all related player IDs (opponents, and partners for context)
      const relatedIds = [...new Set(
        matches.flatMap((m: Match) => getPlayerIds(m).filter((id) => id !== userId))
      )];

      const [profilesRes, ratingsRes] = await Promise.all([
        supabase.from("profiles").select("id, username").in("id", relatedIds),
        supabase.from("ladder_ratings").select("user_id, elo_rating").eq("mode", mode).in("user_id", relatedIds),
      ]);

      const profileMap = new Map((profilesRes.data || []).map((p: { id: string; username: string }) => [p.id, p.username]));
      const ratingMap = new Map((ratingsRes.data || []).map((r: { user_id: string; elo_rating: number }) => [r.user_id, r.elo_rating]));

      const recentList: RecentMatch[] = matches.map((m: Match) => {
        const oppIds = getOpponentIds(m, userId, mode);
        const oppNames = oppIds.map((id) => profileMap.get(id) || "Unknown");
        const avgOppElo = oppIds.length > 0
          ? Math.round(oppIds.reduce((sum, id) => sum + (ratingMap.get(id) || 1200), 0) / oppIds.length)
          : 1200;
        return {
          opponentName: oppNames.join(" & "),
          opponentElo: avgOppElo,
          won: didPlayerWin(m, userId, mode),
          date: m.created_at,
        };
      });

      setRecent(recentList);

      // Best win this season
      const { data: seasonMatches } = await supabase
        .from("matches")
        .select("*")
        .eq("mode", mode)
        .eq("status", "confirmed")
        .or(orFilter)
        .gte("created_at", season.start)
        .lt("created_at", season.end)
        .order("created_at", { ascending: false })
        .limit(20);

      if (seasonMatches && seasonMatches.length > 0) {
        // Only wins
        const winMatches = seasonMatches.filter((m: Match) => didPlayerWin(m, userId, mode));

        const seasonRelatedIds = [...new Set(
          winMatches.flatMap((m: Match) => getOpponentIds(m, userId, mode))
        )];

        // Fetch any profiles/ratings we don't already have
        const missingIds = seasonRelatedIds.filter((id) => !profileMap.has(id));
        if (missingIds.length > 0) {
          const [moreProfiles, moreRatings] = await Promise.all([
            supabase.from("profiles").select("id, username").in("id", missingIds),
            supabase.from("ladder_ratings").select("user_id, elo_rating").eq("mode", mode).in("user_id", missingIds),
          ]);
          for (const p of moreProfiles.data || []) profileMap.set(p.id, p.username);
          for (const r of moreRatings.data || []) ratingMap.set(r.user_id, r.elo_rating);
        }

        let best: RecentMatch | null = null;
        for (const m of winMatches) {
          const oppIds = getOpponentIds(m, userId, mode);
          const oppNames = oppIds.map((id) => profileMap.get(id) || "Unknown");
          const avgOppElo = oppIds.length > 0
            ? Math.round(oppIds.reduce((sum, id) => sum + (ratingMap.get(id) || 1200), 0) / oppIds.length)
            : 1200;
          if (!best || avgOppElo > best.opponentElo) {
            best = {
              opponentName: oppNames.join(" & "),
              opponentElo: avgOppElo,
              won: true,
              date: m.created_at,
            };
          }
        }
        setBestWin(best);
      } else {
        setBestWin(null);
      }

      setLoading(false);
    })();
  }, [isExpanded, userId, mode]);

  return { recent, bestWin, loading, seasonLabel: getSeasonRange().label };
}

function RankingRow({
  entry,
  rank,
  isYou,
  isExpanded,
  onToggle,
  showRank,
  mode,
}: {
  entry: LadderRankEntry;
  rank?: number;
  isYou: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  showRank: boolean;
  mode: MatchMode;
}) {
  const { recent, bestWin, loading: matchesLoading, seasonLabel } = usePlayerMatches(entry.user_id, mode, isExpanded);

  return (
    <div className={`transition-all ${isExpanded ? "rounded-lg border border-border shadow-sm my-1 overflow-hidden" : ""}`}>
      <button
        onClick={onToggle}
        className={`w-full grid grid-cols-[2rem_1fr_3rem_4rem_1rem] gap-x-2 px-3 py-2.5 text-[13px] items-center transition-all text-left ${
          isExpanded
            ? isYou ? L.rowExpanded : "bg-muted/80"
            : isYou
              ? `${L.rowHighlight} border-b border-border/50 hover:shadow-sm hover:-translate-y-[1px]`
              : "hover:bg-muted/50 border-b border-border/50 hover:shadow-sm hover:-translate-y-[1px]"
        }`}
      >
        <span className="text-muted-foreground font-medium">{showRank && rank ? rank : "—"}</span>
        <span className="font-medium truncate">
          {entry.username}
          {isYou && <span className={`${L.accent} ml-1 text-[11px]`}>you</span>}
        </span>
        <span className="text-center text-muted-foreground tabular-nums">{entry.wins}-{entry.losses}</span>
        <span className="text-right font-semibold tabular-nums">{entry.elo_rating}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-muted-foreground/50 transition-transform ${isExpanded ? "rotate-180" : ""}`}><path d="m6 9 6 6 6-6"/></svg>
      </button>

      {isExpanded && (
        <div className={`px-3 py-3 animate-unfold ${isYou ? L.rowDetail : "bg-muted/30"}`}>
          <div className="space-y-1.5 text-[13px]">
            <DetailRow label="Skill" value={entry.skill_level} />
            <DetailRow label="Record" value={`${entry.wins}W – ${entry.losses}L`} />
            <DetailRow label="Last Played" value={entry.last_played ? formatDate(entry.last_played) : "—"} />
            <DetailRow label="Rating" value={String(entry.elo_rating)} />
            {!showRank && (
              <p className="text-[11px] text-muted-foreground pt-1">
                Play {MIN_MATCHES_TO_RANK - (entry.wins + entry.losses)} more match{MIN_MATCHES_TO_RANK - (entry.wins + entry.losses) !== 1 ? "es" : ""} to qualify for rankings
              </p>
            )}
          </div>

          {/* Recent Matches */}
          <div className="mt-3 pt-3 border-t border-border/30">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">Recent Matches</p>
            {matchesLoading ? (
              <Loader variant="inline" />
            ) : recent.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">No confirmed matches yet</p>
            ) : (
              <div className="space-y-1">
                {recent.map((m, i) => (
                  <div key={i} className="flex items-center justify-between text-[12px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`text-[10px] font-bold w-4 shrink-0 ${m.won ? theme.win : theme.loss}`}>
                        {m.won ? "W" : "L"}
                      </span>
                      <span className="truncate">
                        vs {m.opponentName}
                      </span>
                      <span className="text-muted-foreground/60 text-[10px] shrink-0">
                        {m.opponentElo}
                      </span>
                    </div>
                    <span className="text-muted-foreground text-[11px] shrink-0 ml-2">
                      {formatDate(m.date)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Best Win This Season */}
          {!matchesLoading && bestWin && (
            <div className="mt-3 pt-3 border-t border-border/30">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5">Best Win — {seasonLabel}</p>
              <p className="text-[12px]">
                <span className={`${theme.winBold} text-[10px]`}>W</span>
                {" "}vs <span className="font-medium">{bestWin.opponentName}</span>
                <span className="text-muted-foreground/60 text-[10px] ml-1">{bestWin.opponentElo} ELO</span>
                <span className="text-muted-foreground text-[11px] ml-2">{formatDate(bestWin.date)}</span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RankingsTab({
  rankings,
  loading,
  currentUserId,
  mode,
}: {
  rankings: LadderRankEntry[];
  loading: boolean;
  currentUserId: string | undefined;
  mode: MatchMode;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (loading) return <LoadingState text="Loading rankings..." />;
  if (rankings.length === 0) return <EmptyState text="No players ranked yet in this tier." />;

  const ranked = rankings.filter((e) => e.wins + e.losses >= MIN_MATCHES_TO_RANK);
  const unranked = rankings.filter((e) => e.wins + e.losses < MIN_MATCHES_TO_RANK);

  return (
    <div className="space-y-6">
      <div className="overflow-hidden">
        <div className="grid grid-cols-[2rem_1fr_3rem_4rem_1rem] gap-x-2 px-3 py-2 text-[11px] text-muted-foreground uppercase tracking-wider border-b">
          <span>#</span>
          <span>Player</span>
          <span className="text-center">W-L</span>
          <span className="text-right">ELO</span>
          <span></span>
        </div>

        {ranked.length === 0 ? (
          <p className="text-center py-6 text-[13px] text-muted-foreground">
            No players have completed {MIN_MATCHES_TO_RANK} matches yet.
          </p>
        ) : (
          ranked.map((entry, i) => (
            <RankingRow
              key={entry.user_id}
              entry={entry}
              rank={i + 1}
              isYou={entry.user_id === currentUserId}
              isExpanded={expandedId === entry.user_id}
              onToggle={() => setExpandedId(expandedId === entry.user_id ? null : entry.user_id)}
              showRank
              mode={mode}
            />
          ))
        )}
      </div>

      {unranked.length > 0 && (
        <div className="overflow-hidden">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider px-3 pb-2 border-b">
            New Players — {MIN_MATCHES_TO_RANK} matches to qualify
          </p>
          {unranked.map((entry) => (
            <RankingRow
              key={entry.user_id}
              entry={entry}
              isYou={entry.user_id === currentUserId}
              isExpanded={expandedId === entry.user_id}
              onToggle={() => setExpandedId(expandedId === entry.user_id ? null : entry.user_id)}
              showRank={false}
              mode={mode}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const INITIAL_SHOW = 5;

function ProposalsTab({
  proposals,
  loading,
  currentUserId,
  onAccept,
  onCancel,
  actionId,
  onCreateNew,
  onEdit,
  readOnly,
}: {
  proposals: ProposalWithDetails[];
  loading: boolean;
  currentUserId: string;
  onAccept: (p: ProposalWithDetails) => void;
  onCancel: (p: ProposalWithDetails) => void;
  actionId: string | null;
  onCreateNew: () => void;
  onEdit: () => void;
  readOnly: boolean;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAllOpen, setShowAllOpen] = useState(false);
  const [showAllTaken, setShowAllTaken] = useState(false);
  const [editingProposal, setEditingProposal] = useState<ProposalWithDetails | null>(null);

  if (loading) return <LoadingState text="Loading proposals..." />;

  const open = proposals.filter((p) => p.status === "open");
  const taken = proposals.filter((p) => p.status === "accepted");
  const visibleOpen = showAllOpen ? open : open.slice(0, INITIAL_SHOW);
  const visibleTaken = showAllTaken ? taken : taken.slice(0, INITIAL_SHOW);

  return (
    <div className="space-y-4">
      {!readOnly && (
        <Button onClick={onCreateNew} variant="outline" className={`w-full ${L.buttonOutline}`}>
          Propose a Match
        </Button>
      )}

      {open.length === 0 && taken.length === 0 ? (
        <EmptyState text={readOnly ? "No proposals in this tier." : "No proposals in this tier. Create one!"} />
      ) : (
        <div className="space-y-6">
          {open.length > 0 && (
            <div className="overflow-hidden">
              <div className="grid grid-cols-[1fr_5rem_4.5rem_1rem] gap-x-2 px-3 py-2 text-[11px] text-muted-foreground uppercase tracking-wider border-b">
                <span>Player</span>
                <span className="text-center">When</span>
                <span className="text-right">Status</span>
                <span></span>
              </div>

              {visibleOpen.map((p) => {
                const isExpanded = expandedId === p.id;
                const isYours = p.creator_id === currentUserId;
                return (
                  <div key={p.id} className={`transition-all ${isExpanded ? "rounded-lg border border-border shadow-sm my-1 overflow-hidden" : ""}`}>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : p.id)}
                      className={`w-full grid grid-cols-[1fr_5rem_4.5rem_1rem] gap-x-2 px-3 py-2.5 text-[13px] items-center transition-all text-left ${
                        isExpanded
                          ? isYours ? L.rowExpanded : "bg-muted/80"
                          : isYours
                            ? `${L.rowHighlight} border-b border-border/50 hover:shadow-sm hover:-translate-y-[1px]`
                            : "hover:bg-muted/50 border-b border-border/50 hover:shadow-sm hover:-translate-y-[1px]"
                      }`}
                    >
                      <span className="font-medium truncate">
                        {p.creator.username}
                        {isYours && <span className={`${L.accent} ml-1 text-[11px]`}>you</span>}
                      </span>
                      <span className="text-center text-muted-foreground text-[12px] truncate">{formatDate(p.proposed_time)}</span>
                      <span className="text-right">
                        <span className={`text-[10px] ${L.badge} border rounded-full px-1.5 py-0.5`}>Open</span>
                      </span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-muted-foreground/50 transition-transform ${isExpanded ? "rotate-180" : ""}`}><path d="m6 9 6 6 6-6"/></svg>
                    </button>

                    {isExpanded && (
                      <div className={`px-3 py-3 animate-unfold ${isYours ? L.rowDetail : "bg-muted/30"}`}>
                        <div className="space-y-1.5 text-[13px]">
                          <DetailRow label="Skill" value={p.creator.skill_level} />
                          <DetailRow label="Park" value={p.park.name} />
                          <DetailRow label="When" value={formatDateTime(p.proposed_time)} />
                          {p.message && <DetailRow label="Note" value={p.message} italic />}
                        </div>
                        {!readOnly && (
                          <div className="mt-3 space-y-2">
                            {isYours ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingProposal(p)}
                                  className={`w-full ${L.buttonOutline}`}
                                >
                                  Edit Proposal
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => onCancel(p)}
                                  disabled={actionId === p.id}
                                  className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
                                >
                                  {actionId === p.id ? "Cancelling..." : "Cancel Proposal"}
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => onAccept(p)}
                                disabled={actionId === p.id}
                                className={`w-full ${L.button}`}
                              >
                                {actionId === p.id ? "Accepting..." : "Accept Challenge"}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {!showAllOpen && open.length > INITIAL_SHOW && (
                <button
                  onClick={() => setShowAllOpen(true)}
                  className="w-full text-center text-[12px] text-muted-foreground hover:text-foreground py-2 transition-colors"
                >
                  Show {open.length - INITIAL_SHOW} more open proposals
                </button>
              )}
            </div>
          )}

          {taken.length > 0 && (
            <div className="overflow-hidden">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider px-3 pb-2 border-b">
                Accepted
              </p>

              {visibleTaken.map((p) => {
                const isExpanded = expandedId === p.id;
                const isOwner = p.creator_id === currentUserId;
                const isAcceptor = p.accepted_by === currentUserId;
                const isInvolved = isOwner || isAcceptor;
                return (
                  <div key={p.id} className={`transition-all ${isExpanded ? "rounded-lg border border-border shadow-sm my-1 overflow-hidden opacity-100" : ""}`}>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : p.id)}
                      className={`w-full grid grid-cols-[1fr_5rem_4.5rem_1rem] gap-x-2 px-3 py-2.5 text-[13px] items-center transition-all text-left ${
                        isExpanded
                          ? isInvolved ? L.rowExpanded : "bg-muted/80"
                          : `opacity-70 border-b border-border/50 hover:shadow-sm hover:-translate-y-[1px] ${isInvolved ? `${L.rowHighlight}` : "hover:bg-muted/50"}`
                      }`}
                    >
                      <span className="font-medium truncate">
                        {p.creator.username}
                        {isOwner && <span className={`${L.accent} ml-1 text-[11px]`}>you</span>}
                      </span>
                      <span className="text-center text-muted-foreground text-[12px] truncate">{formatDate(p.proposed_time)}</span>
                      <span className="text-right">
                        <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5">Taken</span>
                      </span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-muted-foreground/50 transition-transform ${isExpanded ? "rotate-180" : ""}`}><path d="m6 9 6 6 6-6"/></svg>
                    </button>

                    {isExpanded && (
                      <div className={`px-3 py-3 animate-unfold ${isInvolved ? L.rowDetail : "bg-muted/30"}`}>
                        <div className="space-y-1.5 text-[13px]">
                          <DetailRow label="Skill" value={p.creator.skill_level} />
                          <DetailRow label="Park" value={p.park.name} />
                          <DetailRow label="When" value={formatDateTime(p.proposed_time)} />
                          <DetailRow label="Accepted by" value={p.acceptor?.username || "someone"} />
                        </div>
                        {!readOnly && isInvolved && (
                          <div className="mt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onCancel(p)}
                              disabled={actionId === p.id}
                              className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
                            >
                              {actionId === p.id
                                ? "Cancelling..."
                                : isOwner
                                  ? "Delete Proposal"
                                  : "Back Out"
                              }
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {!showAllTaken && taken.length > INITIAL_SHOW && (
                <button
                  onClick={() => setShowAllTaken(true)}
                  className="w-full text-center text-[12px] text-muted-foreground hover:text-foreground py-2 transition-colors"
                >
                  Show {taken.length - INITIAL_SHOW} more accepted
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {editingProposal && (
        <EditProposalModal
          proposalId={editingProposal.id}
          mode="singles"
          currentParkId={editingProposal.park_id}
          currentTime={editingProposal.proposed_time}
          currentMessage={editingProposal.message}
          onClose={() => setEditingProposal(null)}
          onSaved={onEdit}
        />
      )}
    </div>
  );
}

// --- Doubles Proposals Tab ---

function DoublesProposalsTab({
  proposals,
  loading,
  currentUserId,
  onCreateNew,
  onViewProposal,
  readOnly,
}: {
  proposals: ProposalWithDetails[];
  loading: boolean;
  currentUserId: string;
  onCreateNew: () => void;
  onViewProposal: (id: string) => void;
  readOnly: boolean;
}) {
  const [showAll, setShowAll] = useState(false);

  // Fetch signup counts for all proposals
  const proposalIds = proposals.map((p) => p.id);
  const { counts } = useSignupCounts(proposalIds);

  // Fetch team names for matched proposals
  const acceptedIds = proposals.filter((p) => p.status === "accepted").map((p) => p.id);
  const { teams } = useSignupTeams(acceptedIds);

  if (loading) return <LoadingState text="Loading doubles proposals..." />;

  const active = proposals.filter((p) => ["open", "forming", "pairing"].includes(p.status));
  const accepted = proposals.filter((p) => p.status === "accepted");
  const visibleActive = showAll ? active : active.slice(0, INITIAL_SHOW);

  const statusInfo: Record<string, { text: string; className: string }> = {
    open: { text: "Open", className: L.badge },
    forming: { text: "Forming", className: "text-blue-700 bg-blue-50 border-blue-200" },
    pairing: { text: "Pairing", className: "text-amber-700 bg-amber-50 border-amber-200" },
    accepted: { text: "Matched", className: L.badge },
  };

  return (
    <div className="space-y-4">
      {!readOnly && (
        <Button onClick={onCreateNew} variant="outline" className={`w-full ${L.buttonOutline}`}>
          Create Doubles Proposal
        </Button>
      )}

      {active.length === 0 && accepted.length === 0 ? (
        <EmptyState text={readOnly ? "No doubles proposals in this tier." : "No doubles proposals yet. Be the first!"} />
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <div className="overflow-hidden">
              <div className="grid grid-cols-[1fr_3rem_4.5rem_1rem] gap-x-2 px-3 py-2 text-[11px] text-muted-foreground uppercase tracking-wider border-b">
                <span>Organizer</span>
                <span className="text-center">Slots</span>
                <span className="text-right">Status</span>
                <span></span>
              </div>

              {visibleActive.map((p) => {
                const isYours = p.creator_id === currentUserId;
                const count = counts[p.id] || 0;
                const info = statusInfo[p.status] || statusInfo.open;

                return (
                  <button
                    key={p.id}
                    onClick={() => onViewProposal(p.id)}
                    className={`w-full grid grid-cols-[1fr_3rem_4.5rem_1rem] gap-x-2 px-3 py-2.5 text-[13px] items-center border-b border-border/50 transition-all text-left hover:shadow-sm hover:-translate-y-[1px] ${
                      isYours ? L.rowHighlight : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="truncate">
                      <span className="font-medium">
                        {p.creator.username}
                        {isYours && <span className={`${L.accent} ml-1 text-[11px]`}>you</span>}
                      </span>
                      <span className="text-[11px] text-muted-foreground ml-1.5">
                        {p.park.name}
                      </span>
                    </div>
                    <span className="text-center font-semibold tabular-nums">
                      {count}/4
                    </span>
                    <span className="text-right">
                      <span className={`text-[10px] border rounded-full px-1.5 py-0.5 ${info.className}`}>
                        {info.text}
                      </span>
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/50"><path d="m9 18 6-6-6-6"/></svg>
                  </button>
                );
              })}

              {!showAll && active.length > INITIAL_SHOW && (
                <button
                  onClick={() => setShowAll(true)}
                  className="w-full text-center text-[12px] text-muted-foreground hover:text-foreground py-2 transition-colors"
                >
                  Show {active.length - INITIAL_SHOW} more
                </button>
              )}
            </div>
          )}

          {accepted.length > 0 && (
            <div className="overflow-hidden">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider px-3 pb-2 border-b">
                Matched
              </p>
              {accepted.slice(0, 5).map((p) => {
                const t = teams[p.id];
                const teamANames = t ? t.teamA.join(" & ") : p.creator.username;
                const teamBNames = t ? t.teamB.join(" & ") : "";

                return (
                  <button
                    key={p.id}
                    onClick={() => onViewProposal(p.id)}
                    className="w-full grid grid-cols-[1fr_4.5rem_1rem] gap-x-2 px-3 py-2.5 text-[13px] items-center border-b border-border/50 transition-all text-left opacity-60 hover:bg-muted/50 hover:shadow-sm hover:-translate-y-[1px]"
                  >
                    <div className="truncate">
                      <span className="font-medium">{teamANames}</span>
                      {teamBNames && (
                        <>
                          <span className="text-muted-foreground mx-1.5">vs</span>
                          <span className="font-medium">{teamBNames}</span>
                        </>
                      )}
                    </div>
                    <span className="text-right">
                      <span className={`text-[10px] ${L.badge} border rounded-full px-1.5 py-0.5`}>Matched</span>
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/50"><path d="m9 18 6-6-6-6"/></svg>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- Singles Matches Tab ---

function MatchesTab({
  matches,
  loading,
  currentUserId,
  onViewMatch,
}: {
  matches: MatchWithDetails[];
  loading: boolean;
  currentUserId: string;
  onViewMatch: (id: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  if (loading) return <LoadingState text="Loading matches..." />;
  if (matches.length === 0) return <EmptyState text="No matches yet. Accept or create a proposal!" />;

  const visible = showAll ? matches : matches.slice(0, INITIAL_SHOW);

  const statusBadge: Record<string, { text: string; className: string }> = {
    pending: { text: "Pending", className: "text-amber-700 bg-amber-50 border-amber-200" },
    score_submitted: { text: "Confirm", className: "text-blue-700 bg-blue-50 border-blue-200" },
    confirmed: { text: "Done", className: L.badge },
    disputed: { text: "Disputed", className: "text-red-700 bg-red-50 border-red-200" },
  };

  return (
    <div className="overflow-hidden">
      <div className="grid grid-cols-[1fr_5rem_4.5rem_1rem] gap-x-2 px-3 py-2 text-[11px] text-muted-foreground uppercase tracking-wider border-b">
        <span>Opponent</span>
        <span className="text-center">Date</span>
        <span className="text-right">Status</span>
        <span></span>
      </div>

      {visible.map((m) => {
        const opponent = m.player1_id === currentUserId ? m.player2 : m.player1;
        const badge = statusBadge[m.status] || statusBadge.pending;
        const isExpanded = expandedId === m.id;
        const isWin = m.status === "confirmed" && m.winner_id === currentUserId;
        const isLoss = m.status === "confirmed" && m.winner_id && m.winner_id !== currentUserId;

        return (
          <div key={m.id} className={`transition-all ${isExpanded ? "rounded-lg border border-border shadow-sm my-1 overflow-hidden" : ""}`}>
            <button
              onClick={() => setExpandedId(isExpanded ? null : m.id)}
              className={`w-full grid grid-cols-[1fr_5rem_4.5rem_1rem] gap-x-2 px-3 py-2.5 text-[13px] items-center transition-all text-left ${
                isExpanded
                  ? isWin ? L.rowExpanded : isLoss ? "bg-red-100/60" : "bg-muted/80"
                  : `border-b border-border/50 hover:shadow-sm hover:-translate-y-[1px] ${isWin ? L.rowHighlight : isLoss ? "bg-red-50/30 hover:bg-red-50/50" : "hover:bg-muted/50"}`
              }`}
            >
              <span className="font-medium truncate">
                vs {opponent.username}
                {isWin && <span className={`${theme.winBold} ml-1 text-[11px]`}>W</span>}
                {isLoss && <span className="text-red-500 ml-1 text-[11px] font-bold">L</span>}
              </span>
              <span className="text-center text-muted-foreground text-[12px] truncate">{formatDate(m.created_at)}</span>
              <span className="text-right">
                <span className={`text-[10px] border rounded-full px-1.5 py-0.5 ${badge.className}`}>{badge.text}</span>
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-muted-foreground/50 transition-transform ${isExpanded ? "rotate-180" : ""}`}><path d="m6 9 6 6 6-6"/></svg>
            </button>

            {isExpanded && (
              <div className={`px-3 py-3 animate-unfold ${isWin ? L.rowDetail : isLoss ? "bg-red-50/20" : "bg-muted/30"}`}>
                <div className="space-y-1.5 text-[13px]">
                  <DetailRow label="Park" value={m.park.name} />
                  <DetailRow label="Date" value={formatDateTime(m.created_at)} />
                  {m.status === "confirmed" && m.player1_scores && m.player2_scores && (
                    <DetailRow
                      label="Score"
                      value={m.player1_scores.map((s, i) => `${s}-${m.player2_scores![i]}`).join(", ")}
                    />
                  )}
                </div>
                <div className="mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onViewMatch(m.id)}
                    className="w-full"
                  >
                    View Match Details
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {!showAll && matches.length > INITIAL_SHOW && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full text-center text-[12px] text-muted-foreground hover:text-foreground py-2 transition-colors"
        >
          Show {matches.length - INITIAL_SHOW} more matches
        </button>
      )}
    </div>
  );
}

// --- Doubles Matches Tab ---

function DoublesMatchesTab({
  matches,
  loading,
  currentUserId,
  onViewMatch,
}: {
  matches: MatchWithDetails[];
  loading: boolean;
  currentUserId: string;
  onViewMatch: (id: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);

  if (loading) return <LoadingState text="Loading doubles matches..." />;
  if (matches.length === 0) return <EmptyState text="No doubles matches yet." />;

  const visible = showAll ? matches : matches.slice(0, INITIAL_SHOW);

  const statusBadge: Record<string, { text: string; className: string }> = {
    pending: { text: "Pending", className: "text-amber-700 bg-amber-50 border-amber-200" },
    score_submitted: { text: "Confirm", className: "text-blue-700 bg-blue-50 border-blue-200" },
    confirmed: { text: "Done", className: L.badge },
    disputed: { text: "Disputed", className: "text-red-700 bg-red-50 border-red-200" },
  };

  return (
    <div className="overflow-hidden">
      <div className="grid grid-cols-[1fr_4.5rem_1rem] gap-x-2 px-3 py-2 text-[11px] text-muted-foreground uppercase tracking-wider border-b">
        <span>Teams</span>
        <span className="text-right">Status</span>
        <span></span>
      </div>

      {visible.map((m) => {
        const badge = statusBadge[m.status] || statusBadge.pending;
        const teamAIds = [m.player1_id, m.player2_id];
        const isTeamA = teamAIds.includes(currentUserId);
        const isWin = m.status === "confirmed" && (
          (m.winning_team === "a" && isTeamA) || (m.winning_team === "b" && !isTeamA)
        );
        const isLoss = m.status === "confirmed" && m.winning_team && !isWin;

        const teamANames = [m.player1.username, m.player2.username].join(" & ");
        const teamBNames = [m.player3?.username || "?", m.player4?.username || "?"].join(" & ");

        return (
          <button
            key={m.id}
            onClick={() => onViewMatch(m.id)}
            className={`w-full grid grid-cols-[1fr_4.5rem_1rem] gap-x-2 px-3 py-2.5 text-[13px] items-center border-b border-border/50 transition-all text-left hover:shadow-sm hover:-translate-y-[1px] ${
              isWin ? L.rowHighlight : isLoss ? "bg-red-50/30 hover:bg-red-50/50" : "hover:bg-muted/50"
            }`}
          >
            <div className="truncate">
              <span className="font-medium">{teamANames}</span>
              <span className="text-muted-foreground mx-1.5">vs</span>
              <span className="font-medium">{teamBNames}</span>
              {isWin && <span className={`${theme.winBold} ml-1 text-[11px]`}>W</span>}
              {isLoss && <span className="text-red-500 ml-1 text-[11px] font-bold">L</span>}
            </div>
            <span className="text-right">
              <span className={`text-[10px] border rounded-full px-1.5 py-0.5 ${badge.className}`}>{badge.text}</span>
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/50"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        );
      })}

      {!showAll && matches.length > INITIAL_SHOW && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full text-center text-[12px] text-muted-foreground hover:text-foreground py-2 transition-colors"
        >
          Show {matches.length - INITIAL_SHOW} more
        </button>
      )}
    </div>
  );
}

// --- Shared Components ---

function DetailRow({ label, value, italic }: { label: string; value: string; italic?: boolean }) {
  return (
    <div className="flex items-baseline gap-1 min-w-0">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="flex-1 border-b border-dotted border-muted-foreground/30 min-w-4 relative top-[-2px]" />
      <span className={`font-medium max-w-[60%] truncate ${italic ? "italic" : ""}`}>{value}</span>
    </div>
  );
}

function LoadingState({ text }: { text: string }) {
  const isRankings = text.includes("rankings");
  const isProposals = text.includes("proposals") || text.includes("doubles proposals");
  const isMatches = text.includes("matches") || text.includes("doubles matches");

  if (isRankings) {
    return (
      <div className="space-y-0">
        <div className="grid grid-cols-[2rem_1fr_3rem_4rem] gap-x-2 px-3 py-2 border-b">
          <Shimmer className="h-3 w-4" /><Shimmer className="h-3 w-16" /><Shimmer className="h-3 w-8" /><Shimmer className="h-3 w-10 ml-auto" />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="grid grid-cols-[2rem_1fr_3rem_4rem] gap-x-2 px-3 py-3 border-b border-border/50">
            <Shimmer className="h-4 w-4" />
            <Shimmer className="h-4 w-24" />
            <Shimmer className="h-4 w-8" />
            <Shimmer className="h-4 w-12 ml-auto" />
          </div>
        ))}
      </div>
    );
  }

  if (isProposals) {
    return (
      <div className="space-y-0">
        {[1, 2, 3].map((i) => (
          <div key={i} className="grid grid-cols-[1fr_5rem_4.5rem] gap-x-2 px-3 py-3 border-b border-border/50">
            <Shimmer className="h-4 w-28" />
            <Shimmer className="h-4 w-16" />
            <Shimmer className="h-5 w-12 rounded-full ml-auto" />
          </div>
        ))}
      </div>
    );
  }

  if (isMatches) {
    return (
      <div className="space-y-0">
        {[1, 2, 3].map((i) => (
          <div key={i} className="grid grid-cols-[1fr_4rem_4.5rem] gap-x-2 px-3 py-3 border-b border-border/50">
            <Shimmer className="h-4 w-32" />
            <Shimmer className="h-4 w-10" />
            <Shimmer className="h-5 w-14 rounded-full ml-auto" />
          </div>
        ))}
      </div>
    );
  }

  return <p className="text-center py-8 text-[14px] text-muted-foreground">{text}</p>;
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-center py-8 text-[14px] text-muted-foreground">{text}</p>;
}

// --- Skeletons ---

function Shimmer({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className || ""}`} />;
}

function SkeletonTierCard() {
  return (
    <Card className="flex flex-col">
      <CardContent className="p-3 flex flex-col gap-[15px]">
        <div>
          <Shimmer className="h-4 w-20 mb-1" />
          <Shimmer className="h-3 w-14" />
        </div>
        <hr className="border-border" />
        <div className="space-y-1.5">
          <div className="flex justify-between"><Shimmer className="h-3 w-12" /><Shimmer className="h-3 w-5" /></div>
          <div className="flex justify-between"><Shimmer className="h-3 w-14" /><Shimmer className="h-3 w-5" /></div>
          <div className="flex justify-between"><Shimmer className="h-3 w-12" /><Shimmer className="h-3 w-5" /></div>
        </div>
      </CardContent>
    </Card>
  );
}

function LadderSkeleton() {
  return (
    <main className={`min-h-screen ${L.bg}`}>
      <div className="max-w-lg mx-auto px-4 py-8 sm:px-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Shimmer className="h-7 w-16 rounded-full" />
            <div className="flex items-center gap-1.5">
              <Shimmer className="h-4 w-12" />
              <Shimmer className="h-8 w-8 rounded-full" />
            </div>
          </div>
          <div className="text-center space-y-1.5">
            <Shimmer className="h-6 w-20 mx-auto" />
            <Shimmer className="h-4 w-24 mx-auto" />
          </div>
        </div>

        {/* Mode toggle */}
        <div className="grid grid-cols-2 gap-3">
          <Shimmer className="h-20 rounded-xl" />
          <Shimmer className="h-20 rounded-xl" />
        </div>

        {/* Tier cards */}
        <div className="grid grid-cols-1 min-[360px]:grid-cols-3 gap-2.5">
          {[1, 2, 3].map((i) => <SkeletonTierCard key={i} />)}
        </div>
      </div>
    </main>
  );
}
