"use client";

import { useState, Suspense } from "react";
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
  type TierPreview,
} from "@/lib/ladder-hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type {
  ProposalWithDetails,
  MatchWithDetails,
  LadderRankEntry,
  SkillTier,
  MatchMode,
} from "@/types/database";
import { getSkillTier, SKILL_TIER_LABELS } from "@/types/database";

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
    <Suspense fallback={<main className="min-h-screen bg-background flex items-center justify-center"><p className="text-[14px] text-muted-foreground">Loading...</p></main>}>
      <LadderPageInner />
    </Suspense>
  );
}

function LadderPageInner() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = user?.id;

  const userTier = profile ? getSkillTier(profile.skill_level) : "intermediate";

  const { member, loading: memberLoading, refetch: refetchMember } = useLadderMembership(userId);
  const { previews, loading: previewsLoading } = useTierPreviews();

  // State
  const tierFromUrl = searchParams.get("tier") as SkillTier | null;
  const modeFromUrl = searchParams.get("mode") as MatchMode | null;
  const [selectedTier, setSelectedTier] = useState<SkillTier | null>(
    tierFromUrl && ["beginner", "intermediate", "advanced"].includes(tierFromUrl) ? tierFromUrl : null
  );
  const [mode, setMode] = useState<MatchMode>(modeFromUrl === "doubles" ? "doubles" : "singles");
  const [tab, setTab] = useState<Tab>("rankings");
  const [registering, setRegistering] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  // Hooks — mode-aware
  const activeTier = selectedTier || userTier;
  const { rankings, loading: rankingsLoading, refetch: refetchRankings } = useLadderRankings(activeTier);
  const { proposals, loading: proposalsLoading, refetch: refetchProposals } = useProposals(activeTier, mode);
  const { matches, loading: matchesLoading, refetch: refetchMatches } = useMyMatches(userId, activeTier, mode);

  const isOwnTier = selectedTier === userTier;
  const isReadOnly = selectedTier !== null && !isOwnTier;
  const isDoubles = mode === "doubles";

  // Redirect if not authenticated
  if (!authLoading && !user) { router.replace("/login"); return null; }
  if (!authLoading && user && !profile) { router.replace("/setup"); return null; }

  const handleRegister = async () => {
    if (!userId || !profile) return;
    setRegistering(true);
    try {
      await supabase.from("ladder_members").insert({ user_id: userId });
      await supabase.from("ladder_ratings").insert({
        user_id: userId,
        elo_rating: skillToElo(profile.skill_level),
      });
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
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-[14px] text-muted-foreground">Loading...</p>
      </main>
    );
  }

  // Registration gate
  if (!member) {
    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-lg mx-auto px-4 py-8 sm:px-6 space-y-8">
          <div className="space-y-1">
            <div className="flex items-center justify-start">
              <button
                onClick={() => router.push("/")}
                className="flex items-center gap-1 text-[13px] text-muted-foreground font-medium border border-border bg-muted/50 rounded-full px-3 py-1 hover:bg-muted hover:text-foreground transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>Back
              </button>
            </div>
            <div className="text-center">
              <h1 className="text-[27px] font-bold tracking-[0.5px]">Ladder</h1>
              <p className="text-[14px] text-muted-foreground">
                Competitive pickleball rankings
              </p>
            </div>
          </div>

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
      <main className="min-h-screen bg-background">
        <div className="max-w-lg mx-auto px-4 py-8 sm:px-6 space-y-6">
          <div className="space-y-1">
            <div className="flex items-center justify-start">
              <button
                onClick={() => router.push("/")}
                className="flex items-center gap-1 text-[13px] text-muted-foreground font-medium border border-border bg-muted/50 rounded-full px-3 py-1 hover:bg-muted hover:text-foreground transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>Back
              </button>
            </div>
            <div className="text-center">
              <h1 className="text-[27px] font-bold tracking-[0.5px]">Ladder</h1>
              <p className="text-[14px] text-muted-foreground">
                {profile.username} &middot; {TIER_SHORT[userTier]}
              </p>
            </div>
          </div>

          {/* Mode selection */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setMode("singles")}
              className={`flex flex-col items-center gap-1.5 rounded-xl border p-4 shadow-sm transition-colors ${
                mode === "singles"
                  ? "border-green-400 bg-green-50 dark:bg-green-950/20"
                  : "border-border bg-muted/40 hover:bg-muted/60"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              <span className="text-[15px] font-semibold">Singles</span>
              <span className="text-[12px] text-muted-foreground">1 v 1</span>
            </button>
            <button
              onClick={() => setMode("doubles")}
              className={`flex flex-col items-center gap-1.5 rounded-xl border p-4 shadow-sm transition-colors ${
                mode === "doubles"
                  ? "border-green-400 bg-green-50 dark:bg-green-950/20"
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
            <p className="text-center py-12 text-[14px] text-muted-foreground">Loading...</p>
          ) : (
            <div className="grid grid-cols-1 min-[360px]:grid-cols-3 gap-2.5">
              {previews.map((preview) => (
                <TierCard
                  key={preview.tier}
                  preview={preview}
                  isUserTier={preview.tier === userTier}
                  onSelect={() => {
                    setSelectedTier(preview.tier);
                    setTab(isDoubles ? "proposals" : "rankings");
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
    <main className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-8 sm:px-6 space-y-5">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center justify-start">
            <button
              onClick={() => setSelectedTier(null)}
              className="flex items-center gap-1 text-[13px] text-muted-foreground font-medium border border-border bg-muted/50 rounded-full px-3 py-1 hover:bg-muted hover:text-foreground transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>Back
            </button>
          </div>
          <div className="text-center">
            <h1 className="text-[20px] sm:text-[22px] font-bold tracking-[0.5px]">
              {TIER_SHORT[selectedTier]} {isDoubles ? "Doubles" : "Ladder"}
            </h1>
            <p className="text-[14px] text-muted-foreground">
              {isOwnTier
                ? <>{profile.username} &middot; {rankings.find(r => r.user_id === userId)?.elo_rating || "—"} ELO</>
                : <>{TIER_RANGE[selectedTier]} &middot; View only</>
              }
            </p>
          </div>
        </div>

        {/* Mode toggle (compact) */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => { setMode("singles"); setTab("rankings"); }}
            className={`flex-1 py-2 text-[13px] font-medium transition-colors ${
              mode === "singles"
                ? "bg-green-600 text-white"
                : "bg-muted/30 text-muted-foreground hover:text-foreground"
            }`}
          >
            Singles
          </button>
          <button
            onClick={() => { setMode("doubles"); setTab("proposals"); }}
            className={`flex-1 py-2 text-[13px] font-medium transition-colors ${
              mode === "doubles"
                ? "bg-green-600 text-white"
                : "bg-muted/30 text-muted-foreground hover:text-foreground"
            }`}
          >
            Doubles
          </button>
        </div>

        {isReadOnly && (
          <div className="text-center bg-muted/60 rounded-lg py-2 px-3">
            <p className="text-[12px] text-muted-foreground">
              You&apos;re viewing the {TIER_SHORT[selectedTier]} tier. Your tier is {TIER_SHORT[userTier]}.
            </p>
          </div>
        )}

        {/* Content tabs */}
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {(isDoubles
            ? (["proposals", "matches"] as Tab[])
            : (["rankings", "proposals", "matches"] as Tab[])
          ).map((t) => {
            if (t === "matches" && isReadOnly) return null;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 text-[13px] font-medium py-2 rounded-md transition-colors capitalize ${
                  tab === t
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {tab === "rankings" && !isDoubles && (
          <RankingsTab rankings={rankings} loading={rankingsLoading} currentUserId={userId} />
        )}
        {tab === "proposals" && !isDoubles && (
          <ProposalsTab
            proposals={proposals}
            loading={proposalsLoading}
            currentUserId={userId!}
            onAccept={handleAcceptProposal}
            onCancel={handleCancelProposal}
            actionId={actionId}
            onCreateNew={() => router.push(`/ladder/proposals/new?tier=${selectedTier}`)}
            readOnly={isReadOnly}
          />
        )}
        {tab === "proposals" && isDoubles && (
          <DoublesProposalsTab
            proposals={proposals}
            loading={proposalsLoading}
            currentUserId={userId!}
            onCreateNew={() => router.push(`/ladder/proposals/new?tier=${selectedTier}&mode=doubles`)}
            onViewProposal={(id) => router.push(`/ladder/proposals/${id}?tier=${selectedTier}`)}
            readOnly={isReadOnly}
          />
        )}
        {tab === "matches" && !isReadOnly && !isDoubles && (
          <MatchesTab
            matches={matches}
            loading={matchesLoading}
            currentUserId={userId!}
            onViewMatch={(id) => router.push(`/ladder/match/${id}?tier=${selectedTier}`)}
          />
        )}
        {tab === "matches" && !isReadOnly && isDoubles && (
          <DoublesMatchesTab
            matches={matches}
            loading={matchesLoading}
            currentUserId={userId!}
            onViewMatch={(id) => router.push(`/ladder/match/${id}?tier=${selectedTier}`)}
          />
        )}
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
                <span className="inline-block w-2 h-2 rounded-full bg-green-500 shrink-0 animate-pulse" title="Your tier" />
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
            <span className="font-semibold">{preview.openProposals}</span>
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

function RankingRow({
  entry,
  rank,
  isYou,
  isExpanded,
  onToggle,
  showRank,
}: {
  entry: LadderRankEntry;
  rank?: number;
  isYou: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  showRank: boolean;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className={`w-full grid grid-cols-[2rem_1fr_3rem_4rem] gap-x-2 px-3 py-2.5 text-[13px] items-center border-b border-border/50 transition-colors text-left ${
          isYou
            ? "bg-green-50/60 hover:bg-green-50"
            : "hover:bg-muted/50"
        }`}
      >
        <span className="text-muted-foreground font-medium">{showRank && rank ? rank : "—"}</span>
        <span className="font-medium truncate">
          {entry.username}
          {isYou && <span className="text-green-600 ml-1 text-[11px]">you</span>}
        </span>
        <span className="text-center text-muted-foreground tabular-nums">{entry.wins}-{entry.losses}</span>
        <span className="text-right font-semibold tabular-nums">{entry.elo_rating}</span>
      </button>

      {isExpanded && (
        <div className={`px-3 py-3 border-b border-border/50 ${isYou ? "bg-green-50/40" : "bg-muted/30"}`}>
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
        </div>
      )}
    </div>
  );
}

function RankingsTab({
  rankings,
  loading,
  currentUserId,
}: {
  rankings: LadderRankEntry[];
  loading: boolean;
  currentUserId: string | undefined;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (loading) return <LoadingState text="Loading rankings..." />;
  if (rankings.length === 0) return <EmptyState text="No players ranked yet in this tier." />;

  const ranked = rankings.filter((e) => e.wins + e.losses >= MIN_MATCHES_TO_RANK);
  const unranked = rankings.filter((e) => e.wins + e.losses < MIN_MATCHES_TO_RANK);

  return (
    <div className="space-y-6">
      <div className="overflow-hidden">
        <div className="grid grid-cols-[2rem_1fr_3rem_4rem] gap-x-2 px-3 py-2 text-[11px] text-muted-foreground uppercase tracking-wider border-b">
          <span>#</span>
          <span>Player</span>
          <span className="text-center">W-L</span>
          <span className="text-right">ELO</span>
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
  readOnly,
}: {
  proposals: ProposalWithDetails[];
  loading: boolean;
  currentUserId: string;
  onAccept: (p: ProposalWithDetails) => void;
  onCancel: (p: ProposalWithDetails) => void;
  actionId: string | null;
  onCreateNew: () => void;
  readOnly: boolean;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAllOpen, setShowAllOpen] = useState(false);
  const [showAllTaken, setShowAllTaken] = useState(false);

  if (loading) return <LoadingState text="Loading proposals..." />;

  const open = proposals.filter((p) => p.status === "open");
  const taken = proposals.filter((p) => p.status === "accepted");
  const visibleOpen = showAllOpen ? open : open.slice(0, INITIAL_SHOW);
  const visibleTaken = showAllTaken ? taken : taken.slice(0, INITIAL_SHOW);

  return (
    <div className="space-y-4">
      {!readOnly && (
        <Button onClick={onCreateNew} variant="outline" className="w-full border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400">
          Propose a Match
        </Button>
      )}

      {open.length === 0 && taken.length === 0 ? (
        <EmptyState text={readOnly ? "No proposals in this tier." : "No proposals in this tier. Create one!"} />
      ) : (
        <div className="space-y-6">
          {open.length > 0 && (
            <div className="overflow-hidden">
              <div className="grid grid-cols-[1fr_5rem_4.5rem] gap-x-2 px-3 py-2 text-[11px] text-muted-foreground uppercase tracking-wider border-b">
                <span>Player</span>
                <span className="text-center">When</span>
                <span className="text-right">Status</span>
              </div>

              {visibleOpen.map((p) => {
                const isExpanded = expandedId === p.id;
                const isYours = p.creator_id === currentUserId;
                return (
                  <div key={p.id}>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : p.id)}
                      className={`w-full grid grid-cols-[1fr_5rem_4.5rem] gap-x-2 px-3 py-2.5 text-[13px] items-center border-b border-border/50 transition-colors text-left ${
                        isYours ? "bg-green-50/60 hover:bg-green-50" : "hover:bg-muted/50"
                      }`}
                    >
                      <span className="font-medium truncate">
                        {p.creator.username}
                        {isYours && <span className="text-green-600 ml-1 text-[11px]">you</span>}
                      </span>
                      <span className="text-center text-muted-foreground text-[12px] truncate">{formatDate(p.proposed_time)}</span>
                      <span className="text-right">
                        <span className="text-[10px] text-green-700 bg-green-50 border border-green-200 rounded-full px-1.5 py-0.5">Open</span>
                      </span>
                    </button>

                    {isExpanded && (
                      <div className={`px-3 py-3 border-b border-border/50 ${isYours ? "bg-green-50/40" : "bg-muted/30"}`}>
                        <div className="space-y-1.5 text-[13px]">
                          <DetailRow label="Skill" value={p.creator.skill_level} />
                          <DetailRow label="Park" value={p.park.name} />
                          <DetailRow label="When" value={formatDateTime(p.proposed_time)} />
                          {p.message && <DetailRow label="Note" value={p.message} italic />}
                        </div>
                        {!readOnly && (
                          <div className="mt-3">
                            {isYours ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onCancel(p)}
                                disabled={actionId === p.id}
                                className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
                              >
                                {actionId === p.id ? "Cancelling..." : "Cancel Proposal"}
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => onAccept(p)}
                                disabled={actionId === p.id}
                                className="w-full bg-green-600 hover:bg-green-700 text-white"
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
                  <div key={p.id}>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : p.id)}
                      className={`w-full grid grid-cols-[1fr_5rem_4.5rem] gap-x-2 px-3 py-2.5 text-[13px] items-center border-b border-border/50 transition-colors text-left opacity-70 ${
                        isInvolved ? "bg-green-50/40 hover:bg-green-50" : "hover:bg-muted/50"
                      }`}
                    >
                      <span className="font-medium truncate">
                        {p.creator.username}
                        {isOwner && <span className="text-green-600 ml-1 text-[11px]">you</span>}
                      </span>
                      <span className="text-center text-muted-foreground text-[12px] truncate">{formatDate(p.proposed_time)}</span>
                      <span className="text-right">
                        <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5">Taken</span>
                      </span>
                    </button>

                    {isExpanded && (
                      <div className={`px-3 py-3 border-b border-border/50 ${isInvolved ? "bg-green-50/40" : "bg-muted/30"}`}>
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

  if (loading) return <LoadingState text="Loading doubles proposals..." />;

  const active = proposals.filter((p) => ["open", "forming", "pairing"].includes(p.status));
  const accepted = proposals.filter((p) => p.status === "accepted");
  const visibleActive = showAll ? active : active.slice(0, INITIAL_SHOW);

  const statusInfo: Record<string, { text: string; className: string }> = {
    open: { text: "Open", className: "text-green-700 bg-green-50 border-green-200" },
    forming: { text: "Forming", className: "text-blue-700 bg-blue-50 border-blue-200" },
    pairing: { text: "Pairing", className: "text-amber-700 bg-amber-50 border-amber-200" },
    accepted: { text: "Matched", className: "text-green-700 bg-green-50 border-green-200" },
  };

  return (
    <div className="space-y-4">
      {!readOnly && (
        <Button onClick={onCreateNew} variant="outline" className="w-full border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400">
          Create Doubles Proposal
        </Button>
      )}

      {active.length === 0 && accepted.length === 0 ? (
        <EmptyState text={readOnly ? "No doubles proposals in this tier." : "No doubles proposals yet. Be the first!"} />
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <div className="overflow-hidden">
              <div className="grid grid-cols-[1fr_3rem_4.5rem] gap-x-2 px-3 py-2 text-[11px] text-muted-foreground uppercase tracking-wider border-b">
                <span>Organizer</span>
                <span className="text-center">Slots</span>
                <span className="text-right">Status</span>
              </div>

              {visibleActive.map((p) => {
                const isYours = p.creator_id === currentUserId;
                const count = counts[p.id] || 0;
                const info = statusInfo[p.status] || statusInfo.open;

                return (
                  <button
                    key={p.id}
                    onClick={() => onViewProposal(p.id)}
                    className={`w-full grid grid-cols-[1fr_3rem_4.5rem] gap-x-2 px-3 py-2.5 text-[13px] items-center border-b border-border/50 transition-colors text-left ${
                      isYours ? "bg-green-50/60 hover:bg-green-50" : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="truncate">
                      <span className="font-medium">
                        {p.creator.username}
                        {isYours && <span className="text-green-600 ml-1 text-[11px]">you</span>}
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
              {accepted.slice(0, 5).map((p) => (
                <button
                  key={p.id}
                  onClick={() => onViewProposal(p.id)}
                  className="w-full grid grid-cols-[1fr_3rem_4.5rem] gap-x-2 px-3 py-2.5 text-[13px] items-center border-b border-border/50 transition-colors text-left opacity-60 hover:bg-muted/50"
                >
                  <span className="font-medium truncate">{p.creator.username}</span>
                  <span className="text-center font-semibold tabular-nums">4/4</span>
                  <span className="text-right">
                    <span className="text-[10px] text-green-700 bg-green-50 border border-green-200 rounded-full px-1.5 py-0.5">Matched</span>
                  </span>
                </button>
              ))}
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
    confirmed: { text: "Done", className: "text-green-700 bg-green-50 border-green-200" },
    disputed: { text: "Disputed", className: "text-red-700 bg-red-50 border-red-200" },
  };

  return (
    <div className="overflow-hidden">
      <div className="grid grid-cols-[1fr_5rem_4.5rem] gap-x-2 px-3 py-2 text-[11px] text-muted-foreground uppercase tracking-wider border-b">
        <span>Opponent</span>
        <span className="text-center">Date</span>
        <span className="text-right">Status</span>
      </div>

      {visible.map((m) => {
        const opponent = m.player1_id === currentUserId ? m.player2 : m.player1;
        const badge = statusBadge[m.status] || statusBadge.pending;
        const isExpanded = expandedId === m.id;
        const isWin = m.status === "confirmed" && m.winner_id === currentUserId;
        const isLoss = m.status === "confirmed" && m.winner_id && m.winner_id !== currentUserId;

        return (
          <div key={m.id}>
            <button
              onClick={() => setExpandedId(isExpanded ? null : m.id)}
              className={`w-full grid grid-cols-[1fr_5rem_4.5rem] gap-x-2 px-3 py-2.5 text-[13px] items-center border-b border-border/50 transition-colors text-left ${
                isWin ? "bg-green-50/60 hover:bg-green-50" : isLoss ? "bg-red-50/30 hover:bg-red-50/50" : "hover:bg-muted/50"
              }`}
            >
              <span className="font-medium truncate">
                vs {opponent.username}
                {isWin && <span className="text-green-600 ml-1 text-[11px] font-bold">W</span>}
                {isLoss && <span className="text-red-500 ml-1 text-[11px] font-bold">L</span>}
              </span>
              <span className="text-center text-muted-foreground text-[12px] truncate">{formatDate(m.created_at)}</span>
              <span className="text-right">
                <span className={`text-[10px] border rounded-full px-1.5 py-0.5 ${badge.className}`}>{badge.text}</span>
              </span>
            </button>

            {isExpanded && (
              <div className={`px-3 py-3 border-b border-border/50 ${isWin ? "bg-green-50/40" : isLoss ? "bg-red-50/20" : "bg-muted/30"}`}>
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
    confirmed: { text: "Done", className: "text-green-700 bg-green-50 border-green-200" },
    disputed: { text: "Disputed", className: "text-red-700 bg-red-50 border-red-200" },
  };

  return (
    <div className="overflow-hidden">
      <div className="grid grid-cols-[1fr_4.5rem] gap-x-2 px-3 py-2 text-[11px] text-muted-foreground uppercase tracking-wider border-b">
        <span>Teams</span>
        <span className="text-right">Status</span>
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
            className={`w-full grid grid-cols-[1fr_4.5rem] gap-x-2 px-3 py-2.5 text-[13px] items-center border-b border-border/50 transition-colors text-left ${
              isWin ? "bg-green-50/60 hover:bg-green-50" : isLoss ? "bg-red-50/30 hover:bg-red-50/50" : "hover:bg-muted/50"
            }`}
          >
            <div className="truncate">
              <span className="font-medium">{teamANames}</span>
              <span className="text-muted-foreground mx-1.5">vs</span>
              <span className="font-medium">{teamBNames}</span>
              {isWin && <span className="text-green-600 ml-1 text-[11px] font-bold">W</span>}
              {isLoss && <span className="text-red-500 ml-1 text-[11px] font-bold">L</span>}
            </div>
            <span className="text-right">
              <span className={`text-[10px] border rounded-full px-1.5 py-0.5 ${badge.className}`}>{badge.text}</span>
            </span>
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
    <div className="flex items-baseline gap-1">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="flex-1 border-b border-dotted border-muted-foreground/30 min-w-4 relative top-[-2px]" />
      <span className={`font-medium shrink-0 ${italic ? "italic" : ""}`}>{value}</span>
    </div>
  );
}

function LoadingState({ text }: { text: string }) {
  return <p className="text-center py-8 text-[14px] text-muted-foreground">{text}</p>;
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-center py-8 text-[14px] text-muted-foreground">{text}</p>;
}
