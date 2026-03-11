"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { calculateElo } from "@/lib/elo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type {
  Match,
  Profile,
  Park,
  Proposal,
  LadderRating,
} from "@/types/database";

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return (
    d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }) +
    " at " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  );
}

interface MatchDetail extends Match {
  player1: Profile;
  player2: Profile;
  park: Park;
}

export default function MatchPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-background flex items-center justify-center"><p className="text-[14px] text-muted-foreground">Loading...</p></main>}>
      <MatchPageInner />
    </Suspense>
  );
}

function MatchPageInner() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const tierParam = searchParams.get("tier");
  const goBack = () => tierParam ? router.push(`/ladder?tier=${tierParam}`) : router.push("/ladder");
  const matchId = params.id as string;
  const userId = user?.id;

  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Score input: best of 3 games (pickleball to 11)
  const [scores, setScores] = useState<{ p1: string[]; p2: string[] }>({
    p1: ["", "", ""],
    p2: ["", "", ""],
  });

  const fetchMatch = useCallback(async () => {
    const { data: m } = await supabase
      .from("matches")
      .select("*")
      .eq("id", matchId)
      .single();

    if (!m) {
      setLoading(false);
      return;
    }

    const { data: proposal } = (await supabase
      .from("proposals")
      .select("*, parks(*)")
      .eq("id", m.proposal_id)
      .single()) as { data: (Proposal & { parks: Park }) | null };

    const [p1Res, p2Res] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", m.player1_id).single(),
      supabase.from("profiles").select("*").eq("id", m.player2_id).single(),
    ]);

    setMatch({
      ...m,
      player1: p1Res.data!,
      player2: p2Res.data!,
      park: proposal?.parks || {
        id: "",
        name: "Unknown",
        address: null,
        lat: 0,
        lng: 0,
        court_count: 0,
        created_at: "",
      },
    });

    if (m.player1_scores && m.player2_scores) {
      setScores({
        p1: m.player1_scores.map(String),
        p2: m.player2_scores.map(String),
      });
    }

    setLoading(false);
  }, [matchId]);

  useEffect(() => {
    fetchMatch();
  }, [fetchMatch]);

  if (!authLoading && !user) {
    router.replace("/login");
    return null;
  }

  if (loading || authLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-[14px] text-muted-foreground">Loading...</p>
      </main>
    );
  }

  if (!match) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-[14px] text-muted-foreground">Match not found.</p>
      </main>
    );
  }

  const isPlayer = userId === match.player1_id || userId === match.player2_id;
  const isSubmitter = match.submitted_by === userId;
  const canSubmitScore = isPlayer && (match.status === "pending" || match.status === "disputed");
  const canConfirm =
    isPlayer && match.status === "score_submitted" && !isSubmitter;
  const canCancel = isPlayer && match.status === "pending";
  // player1 is always the proposal creator
  const isOwner = userId === match.player1_id;

  const updateScore = (player: "p1" | "p2", game: number, value: string) => {
    const num = value.replace(/\D/g, "");
    setScores((prev) => {
      const updated = { ...prev };
      updated[player] = [...prev[player]];
      updated[player][game] = num;
      return updated;
    });
  };

  const determineWinner = (
    p1Scores: number[],
    p2Scores: number[],
  ): string | null => {
    let p1Wins = 0;
    let p2Wins = 0;
    for (let i = 0; i < p1Scores.length; i++) {
      if (p1Scores[i] > p2Scores[i]) p1Wins++;
      else if (p2Scores[i] > p1Scores[i]) p2Wins++;
    }
    if (p1Wins > p2Wins) return match.player1_id;
    if (p2Wins > p1Wins) return match.player2_id;
    return null;
  };

  const handleSubmitScore = async () => {
    if (!userId) return;
    setSubmitting(true);
    try {
      const p1Scores = scores.p1.filter((s) => s !== "").map(Number);
      const p2Scores = scores.p2.filter((s) => s !== "").map(Number);

      if (p1Scores.length < 2 || p2Scores.length < 2) {
        alert("Please enter at least 2 game scores.");
        setSubmitting(false);
        return;
      }

      const winnerId = determineWinner(p1Scores, p2Scores);

      await supabase
        .from("matches")
        .update({
          player1_scores: p1Scores,
          player2_scores: p2Scores,
          submitted_by: userId,
          winner_id: winnerId,
          status: "score_submitted",
          played_at: new Date().toISOString(),
        })
        .eq("id", match.id);

      await fetchMatch();
    } catch (err) {
      console.error("Submit score error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async () => {
    if (!userId || !match.winner_id) return;
    setSubmitting(true);
    try {
      // Confirm the match
      await supabase
        .from("matches")
        .update({ confirmed_by: userId, status: "confirmed" })
        .eq("id", match.id);

      // Update ELO ratings
      const loserId =
        match.winner_id === match.player1_id
          ? match.player2_id
          : match.player1_id;

      const [winnerRating, loserRating] = await Promise.all([
        supabase
          .from("ladder_ratings")
          .select("*")
          .eq("user_id", match.winner_id)
          .single(),
        supabase
          .from("ladder_ratings")
          .select("*")
          .eq("user_id", loserId)
          .single(),
      ]);

      if (winnerRating.data && loserRating.data) {
        const { newWinnerRating, newLoserRating } = calculateElo(
          winnerRating.data.elo_rating,
          loserRating.data.elo_rating,
        );

        const now = new Date().toISOString();
        await Promise.all([
          supabase
            .from("ladder_ratings")
            .update({
              elo_rating: newWinnerRating,
              wins: (winnerRating.data as LadderRating).wins + 1,
              last_played: now,
              updated_at: now,
            })
            .eq("user_id", match.winner_id),
          supabase
            .from("ladder_ratings")
            .update({
              elo_rating: newLoserRating,
              losses: (loserRating.data as LadderRating).losses + 1,
              last_played: now,
              updated_at: now,
            })
            .eq("user_id", loserId),
        ]);
      }

      await fetchMatch();
    } catch (err) {
      console.error("Confirm error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelMatch = async () => {
    if (!userId || !match) return;
    setSubmitting(true);
    try {
      // Delete the match
      await supabase.from("matches").delete().eq("id", match.id);

      if (isOwner) {
        // Owner cancels → kill the proposal entirely
        await supabase
          .from("proposals")
          .update({ status: "cancelled" })
          .eq("id", match.proposal_id);
      } else {
        // Non-owner backs out → reopen the proposal for others
        await supabase
          .from("proposals")
          .update({
            status: "open",
            accepted_by: null,
            accepted_at: null,
          })
          .eq("id", match.proposal_id);
      }

      goBack();
    } catch (err) {
      console.error("Cancel match error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDispute = async () => {
    if (!userId) return;
    setSubmitting(true);
    try {
      await supabase
        .from("matches")
        .update({ status: "disputed" })
        .eq("id", match.id);
      await fetchMatch();
    } catch (err) {
      console.error("Dispute error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const statusLabel: Record<string, string> = {
    pending: "Awaiting score",
    score_submitted: "Awaiting confirmation",
    confirmed: "Confirmed",
    disputed: "Disputed",
  };

  const statusColor: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    score_submitted: "bg-blue-100 text-blue-800",
    confirmed: "bg-green-100 text-green-800",
    disputed: "bg-red-100 text-red-800",
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-5 py-8 sm:px-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-1 relative">
          <button
            onClick={goBack}
            className="absolute left-0 top-0 flex items-center gap-1 text-[13px] text-muted-foreground font-medium border border-border bg-muted/50 rounded-full px-3 py-1 hover:bg-muted hover:text-foreground transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>Back
          </button>
          <h1 className="text-[22px] font-bold tracking-[0.5px]">Match</h1>
          <span
            className={`inline-block text-[12px] px-2.5 py-0.5 rounded-full font-medium ${statusColor[match.status]}`}
          >
            {statusLabel[match.status]}
          </span>
        </div>

        {/* Players */}
        <Card>
          <CardContent className="pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[15px] font-medium">
                  {match.player1.username}
                </p>
                <p className="text-[12px] text-muted-foreground">
                  {match.player1.skill_level}
                </p>
              </div>
              <span className="text-[14px] font-bold text-muted-foreground">
                vs
              </span>
              <div className="text-right">
                <p className="text-[15px] font-medium">
                  {match.player2.username}
                </p>
                <p className="text-[12px] text-muted-foreground">
                  {match.player2.skill_level}
                </p>
              </div>
            </div>
            <div className="text-center text-[12px] text-muted-foreground">
              {match.park.name} &middot; {formatDateTime(match.created_at)}
            </div>
          </CardContent>
        </Card>

        {/* Score display / input */}
        <Card>
          <CardContent className="pt-5 space-y-4">
            <h3 className="text-[14px] font-semibold text-center">
              {match.status === "disputed"
                ? "Resubmit Scores"
                : canSubmitScore
                  ? "Enter Scores"
                  : "Scores"
              }
            </h3>

            <div className="space-y-2">
              {/* Header */}
              <div className="grid grid-cols-[1fr_repeat(3,48px)] gap-2 text-center">
                <div />
                <span className="text-[11px] text-muted-foreground">G1</span>
                <span className="text-[11px] text-muted-foreground">G2</span>
                <span className="text-[11px] text-muted-foreground">G3</span>
              </div>

              {/* Player 1 */}
              <div className="grid grid-cols-[1fr_repeat(3,48px)] gap-4 items-center">
                <span className="text-[13px] font-medium truncate">
                  {match.player1.username}
                </span>
                {[0, 1, 2].map((i) => (
                  <input
                    key={`p1-${i}`}
                    type="text"
                    inputMode="numeric"
                    value={scores.p1[i]}
                    onChange={(e) => updateScore("p1", i, e.target.value)}
                    disabled={!canSubmitScore}
                    maxLength={2}
                    className="w-12 h-9 text-center rounded-md border border-input bg-background text-[14px] font-medium focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                  />
                ))}
              </div>

              {/* Player 2 */}
              <div className="grid grid-cols-[1fr_repeat(3,48px)] gap-4 items-center">
                <span className="text-[13px] font-medium truncate">
                  {match.player2.username}
                </span>
                {[0, 1, 2].map((i) => (
                  <input
                    key={`p2-${i}`}
                    type="text"
                    inputMode="numeric"
                    value={scores.p2[i]}
                    onChange={(e) => updateScore("p2", i, e.target.value)}
                    disabled={!canSubmitScore}
                    maxLength={2}
                    className="w-12 h-9 text-center rounded-md border border-input bg-background text-[14px] font-medium focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                  />
                ))}
              </div>
            </div>

            {/* Winner display */}
            {match.winner_id && match.status !== "pending" && (
              <p className="text-center text-[13px] font-medium text-green-600">
                Winner:{" "}
                {match.winner_id === match.player1_id
                  ? match.player1.username
                  : match.player2.username}
              </p>
            )}

            {/* Actions */}
            {canSubmitScore && (
              <Button
                onClick={handleSubmitScore}
                disabled={submitting}
                className="w-full"
              >
                {submitting ? "Submitting..." : "Submit Score"}
              </Button>
            )}

            {canConfirm && (
              <div className="space-y-2">
                <p className="text-[12px] text-muted-foreground text-center">
                  {match.submitted_by === match.player1_id
                    ? match.player1.username
                    : match.player2.username}{" "}
                  submitted this score. Please confirm or dispute.
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={handleConfirm}
                    disabled={submitting}
                    className="flex-1"
                  >
                    {submitting ? "..." : "Confirm"}
                  </Button>
                  <Button
                    onClick={handleDispute}
                    disabled={submitting}
                    variant="destructive"
                    className="flex-1"
                  >
                    {submitting ? "..." : "Dispute"}
                  </Button>
                </div>
              </div>
            )}

            {match.status === "confirmed" && (
              <p className="text-[12px] text-muted-foreground text-center">
                Match confirmed. Ratings have been updated.
              </p>
            )}

            {match.status === "disputed" && (
              <div className="space-y-2">
                <p className="text-[12px] text-red-500 text-center">
                  Score was disputed. Either player can correct and resubmit.
                </p>
                <Button onClick={handleSubmitScore} disabled={submitting} className="w-full">
                  {submitting ? "Submitting..." : "Resubmit Score"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cancel / Back out */}
        {canCancel && (
          <Button
            variant="outline"
            onClick={handleCancelMatch}
            disabled={submitting}
            className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
          >
            {submitting
              ? "Cancelling..."
              : isOwner
                ? "Delete Proposal & Match"
                : "Back Out"}
          </Button>
        )}
      </div>
    </main>
  );
}
