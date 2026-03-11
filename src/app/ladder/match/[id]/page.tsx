"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { calculateElo, calculateDoublesElo } from "@/lib/elo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AppHeader } from "@/components/app-header";
import type {
  Match,
  Profile,
  Park,
  Proposal,
  LadderRating,
  Team,
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
  player3: Profile | null;
  player4: Profile | null;
  park: Park;
}

const defaultPark: Park = { id: "", name: "Unknown", address: null, lat: 0, lng: 0, court_count: 0, created_at: "" };

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

  // Score input: best of 3 games — p1=Team A scores, p2=Team B scores (or player1/player2 for singles)
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

    if (!m) { setLoading(false); return; }

    const { data: proposal } = (await supabase
      .from("proposals")
      .select("*, parks(*)")
      .eq("id", m.proposal_id)
      .single()) as { data: (Proposal & { parks: Park }) | null };

    // Fetch all player profiles
    const playerIds = [m.player1_id, m.player2_id, m.player3_id, m.player4_id].filter(Boolean) as string[];
    const { data: profiles } = await supabase.from("profiles").select("*").in("id", playerIds);
    const profileMap = new Map((profiles || []).map((p: Profile) => [p.id, p]));

    setMatch({
      ...m,
      player1: profileMap.get(m.player1_id)!,
      player2: profileMap.get(m.player2_id)!,
      player3: m.player3_id ? profileMap.get(m.player3_id) || null : null,
      player4: m.player4_id ? profileMap.get(m.player4_id) || null : null,
      park: proposal?.parks || defaultPark,
    });

    if (m.player1_scores && m.player2_scores) {
      setScores({
        p1: m.player1_scores.map(String),
        p2: m.player2_scores.map(String),
      });
    }

    setLoading(false);
  }, [matchId]);

  useEffect(() => { fetchMatch(); }, [fetchMatch]);

  if (!authLoading && !user) { router.replace("/login"); return null; }
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

  const isDoubles = match.mode === "doubles";
  const allPlayerIds = [match.player1_id, match.player2_id, match.player3_id, match.player4_id].filter(Boolean);
  const teamAIds = [match.player1_id, match.player2_id];
  const teamBIds = [match.player3_id, match.player4_id].filter(Boolean) as string[];
  const isPlayer = allPlayerIds.includes(userId || "");
  const isTeamA = teamAIds.includes(userId || "");
  const isSubmitter = match.submitted_by === userId;

  const canSubmitScore = isPlayer && (match.status === "pending" || match.status === "disputed");
  // For doubles: anyone on the opposing team of the submitter can confirm
  const canConfirm = (() => {
    if (!isPlayer || match.status !== "score_submitted" || isSubmitter) return false;
    if (!isDoubles) return true;
    // Submitter's team shouldn't confirm — opponent team should
    const submitterIsTeamA = teamAIds.includes(match.submitted_by || "");
    return submitterIsTeamA ? !isTeamA : isTeamA;
  })();
  const canCancel = isPlayer && match.status === "pending";
  const isOwner = userId === match.player1_id;

  // Team display names
  const teamALabel = isDoubles
    ? `${match.player1.username} & ${match.player2.username}`
    : match.player1.username;
  const teamBLabel = isDoubles
    ? `${match.player3?.username || "?"} & ${match.player4?.username || "?"}`
    : match.player2.username;

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
  ): { winnerId: string | null; winningTeam: Team | null } => {
    let p1Wins = 0;
    let p2Wins = 0;
    for (let i = 0; i < p1Scores.length; i++) {
      if (p1Scores[i] > p2Scores[i]) p1Wins++;
      else if (p2Scores[i] > p1Scores[i]) p2Wins++;
    }

    if (isDoubles) {
      if (p1Wins > p2Wins) return { winnerId: null, winningTeam: "a" };
      if (p2Wins > p1Wins) return { winnerId: null, winningTeam: "b" };
      return { winnerId: null, winningTeam: null };
    }

    if (p1Wins > p2Wins) return { winnerId: match.player1_id, winningTeam: null };
    if (p2Wins > p1Wins) return { winnerId: match.player2_id, winningTeam: null };
    return { winnerId: null, winningTeam: null };
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

      const { winnerId, winningTeam } = determineWinner(p1Scores, p2Scores);

      await supabase
        .from("matches")
        .update({
          player1_scores: p1Scores,
          player2_scores: p2Scores,
          submitted_by: userId,
          winner_id: winnerId,
          winning_team: winningTeam,
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

  const handleConfirmSingles = async () => {
    if (!userId || !match.winner_id) return;

    await supabase
      .from("matches")
      .update({ confirmed_by: userId, status: "confirmed" })
      .eq("id", match.id);

    const loserId = match.winner_id === match.player1_id ? match.player2_id : match.player1_id;

    const [winnerRating, loserRating] = await Promise.all([
      supabase.from("ladder_ratings").select("*").eq("user_id", match.winner_id).single(),
      supabase.from("ladder_ratings").select("*").eq("user_id", loserId).single(),
    ]);

    if (winnerRating.data && loserRating.data) {
      const { newWinnerRating, newLoserRating } = calculateElo(
        winnerRating.data.elo_rating,
        loserRating.data.elo_rating,
      );
      const now = new Date().toISOString();
      await Promise.all([
        supabase.from("ladder_ratings").update({
          elo_rating: newWinnerRating,
          wins: (winnerRating.data as LadderRating).wins + 1,
          last_played: now, updated_at: now,
        }).eq("user_id", match.winner_id),
        supabase.from("ladder_ratings").update({
          elo_rating: newLoserRating,
          losses: (loserRating.data as LadderRating).losses + 1,
          last_played: now, updated_at: now,
        }).eq("user_id", loserId),
      ]);
    }
  };

  const handleConfirmDoubles = async () => {
    if (!userId || !match.winning_team) return;

    await supabase
      .from("matches")
      .update({ confirmed_by: userId, status: "confirmed" })
      .eq("id", match.id);

    const winnerIds = match.winning_team === "a" ? teamAIds : teamBIds;
    const loserIds = match.winning_team === "a" ? teamBIds : teamAIds;

    // Fetch all 4 ratings
    const allIds = [...winnerIds, ...loserIds];
    const { data: allRatings } = await supabase
      .from("ladder_ratings")
      .select("*")
      .in("user_id", allIds);

    if (!allRatings || allRatings.length < 4) return;

    const ratingMap = new Map(allRatings.map((r: LadderRating) => [r.user_id, r]));
    const w1 = ratingMap.get(winnerIds[0]);
    const w2 = ratingMap.get(winnerIds[1]);
    const l1 = ratingMap.get(loserIds[0]);
    const l2 = ratingMap.get(loserIds[1]);

    if (!w1 || !w2 || !l1 || !l2) return;

    const { newWinnerRatings, newLoserRatings } = calculateDoublesElo(
      [w1.elo_rating, w2.elo_rating],
      [l1.elo_rating, l2.elo_rating],
    );

    const now = new Date().toISOString();
    await Promise.all([
      supabase.from("ladder_ratings").update({
        elo_rating: newWinnerRatings[0], wins: w1.wins + 1, last_played: now, updated_at: now,
      }).eq("user_id", winnerIds[0]),
      supabase.from("ladder_ratings").update({
        elo_rating: newWinnerRatings[1], wins: w2.wins + 1, last_played: now, updated_at: now,
      }).eq("user_id", winnerIds[1]),
      supabase.from("ladder_ratings").update({
        elo_rating: newLoserRatings[0], losses: l1.losses + 1, last_played: now, updated_at: now,
      }).eq("user_id", loserIds[0]),
      supabase.from("ladder_ratings").update({
        elo_rating: newLoserRatings[1], losses: l2.losses + 1, last_played: now, updated_at: now,
      }).eq("user_id", loserIds[1]),
    ]);
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      if (isDoubles) {
        await handleConfirmDoubles();
      } else {
        await handleConfirmSingles();
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
      await supabase.from("matches").delete().eq("id", match.id);

      if (isOwner) {
        await supabase.from("proposals").update({ status: "cancelled" }).eq("id", match.proposal_id);
      } else if (isDoubles) {
        // For doubles, revert to pairing so teams can reform
        await supabase.from("proposals").update({ status: "pairing" }).eq("id", match.proposal_id);
      } else {
        await supabase.from("proposals").update({
          status: "open", accepted_by: null, accepted_at: null,
        }).eq("id", match.proposal_id);
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
      await supabase.from("matches").update({ status: "disputed" }).eq("id", match.id);
      await fetchMatch();
    } catch (err) {
      console.error("Dispute error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Find who submitted for the confirm prompt
  const submitterName = (() => {
    if (!match.submitted_by) return "Someone";
    const all = [match.player1, match.player2, match.player3, match.player4].filter(Boolean) as Profile[];
    return all.find((p) => p.id === match.submitted_by)?.username || "Someone";
  })();

  // Winner display
  const winnerDisplay = (() => {
    if (isDoubles && match.winning_team) {
      return match.winning_team === "a" ? `Team A: ${teamALabel}` : `Team B: ${teamBLabel}`;
    }
    if (!isDoubles && match.winner_id) {
      return match.winner_id === match.player1_id ? match.player1.username : match.player2.username;
    }
    return null;
  })();

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
        <AppHeader
          title={isDoubles ? "Doubles Match" : "Match"}
          badge={
            <span className={`inline-block text-[12px] px-2.5 py-0.5 rounded-full font-medium ${statusColor[match.status]}`}>
              {statusLabel[match.status]}
            </span>
          }
          onBack={goBack}
        />

        {/* Players */}
        <Card>
          <CardContent className="pt-5 space-y-3">
            {isDoubles ? (
              <div className="rounded-xl border-2 border-green-600/30 bg-green-950/5 overflow-hidden px-3 py-3">
                {/* Team labels */}
                <div className="flex justify-between mb-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-green-700">Team A</span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-green-700">Team B</span>
                </div>

                {/* Court with VS */}
                <div className="relative flex gap-0">
                  {/* Team A */}
                  <div className="flex-1 flex flex-col gap-2 pr-2">
                    <MatchPlayerChip profile={match.player1} />
                    <MatchPlayerChip profile={match.player2} />
                  </div>

                  {/* Net + VS circle */}
                  <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 flex flex-col items-center">
                    <div className="w-[3px] flex-1 bg-green-600/40 rounded-full" />
                    <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center z-10 shrink-0 -my-1">
                      <span className="text-[9px] font-bold text-white tracking-tight">VS</span>
                    </div>
                    <div className="w-[3px] flex-1 bg-green-600/40 rounded-full" />
                  </div>

                  {/* Team B */}
                  <div className="flex-1 flex flex-col gap-2 pl-2">
                    {match.player3 && <MatchPlayerChip profile={match.player3} />}
                    {match.player4 && <MatchPlayerChip profile={match.player4} />}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[15px] font-medium">{match.player1.username}</p>
                  <p className="text-[12px] text-muted-foreground">{match.player1.skill_level}</p>
                </div>
                <span className="text-[14px] font-bold text-muted-foreground">vs</span>
                <div className="text-right">
                  <p className="text-[15px] font-medium">{match.player2.username}</p>
                  <p className="text-[12px] text-muted-foreground">{match.player2.skill_level}</p>
                </div>
              </div>
            )}
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
                  : "Scores"}
            </h3>

            <div className="space-y-2">
              {/* Header */}
              <div className="grid grid-cols-[1fr_repeat(3,48px)] gap-2 text-center">
                <div />
                <span className="text-[11px] text-muted-foreground">G1</span>
                <span className="text-[11px] text-muted-foreground">G2</span>
                <span className="text-[11px] text-muted-foreground">G3</span>
              </div>

              {/* Team A / Player 1 */}
              <div className="grid grid-cols-[1fr_repeat(3,48px)] gap-4 items-center">
                <span className="text-[13px] font-medium truncate">
                  {isDoubles ? "Team A" : match.player1.username}
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

              {/* Team B / Player 2 */}
              <div className="grid grid-cols-[1fr_repeat(3,48px)] gap-4 items-center">
                <span className="text-[13px] font-medium truncate">
                  {isDoubles ? "Team B" : match.player2.username}
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
            {winnerDisplay && match.status !== "pending" && (
              <p className="text-center text-[13px] font-medium text-green-600">
                Winner: {winnerDisplay}
              </p>
            )}

            {/* Actions */}
            {canSubmitScore && (
              <Button onClick={handleSubmitScore} disabled={submitting} className="w-full">
                {submitting ? "Submitting..." : "Submit Score"}
              </Button>
            )}

            {canConfirm && (
              <div className="space-y-2">
                <p className="text-[12px] text-muted-foreground text-center">
                  {submitterName} submitted this score. Please confirm or dispute.
                </p>
                <div className="flex gap-2">
                  <Button onClick={handleConfirm} disabled={submitting} className="flex-1">
                    {submitting ? "..." : "Confirm"}
                  </Button>
                  <Button onClick={handleDispute} disabled={submitting} variant="destructive" className="flex-1">
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
                  Score was disputed. Any player can correct and resubmit.
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

function MatchPlayerChip({ profile }: { profile: Profile }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border-2 border-border bg-card w-full">
      <div className="w-7 h-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-[12px] font-bold shrink-0">
        {profile.username.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold truncate leading-tight">{profile.username}</p>
        <p className="text-[10px] text-muted-foreground leading-tight">{profile.skill_level}</p>
      </div>
    </div>
  );
}
