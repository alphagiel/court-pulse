"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { useProposalSignups } from "@/lib/ladder-hooks";

import { CourtPairing } from "@/components/court-pairing";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AppHeader } from "@/components/app-header";
import type {
  Proposal,
  Profile,
  Park,
  LadderRating,
} from "@/types/database";
import { Loader } from "@/components/loader";

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return (
    d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) +
    " at " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  );
}

export default function ProposalDetailPage() {
  return (
    <Suspense fallback={<Loader />}>
      <ProposalDetailInner />
    </Suspense>
  );
}

function ProposalDetailInner() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const tierParam = searchParams.get("tier");
  const modeParam = searchParams.get("mode");
  const tabParam = searchParams.get("tab");
  const proposalId = params.id as string;
  const userId = user?.id;
  const goBack = () => {
    const params = new URLSearchParams();
    if (tierParam) params.set("tier", tierParam);
    if (modeParam) params.set("mode", modeParam);
    if (tabParam) params.set("tab", tabParam);
    const qs = params.toString();
    router.push(`/ladder${qs ? `?${qs}` : ""}`);
  };

  const [proposal, setProposal] = useState<(Proposal & { creator: Profile; park: Park }) | null>(null);
  const [ratings, setRatings] = useState<Map<string, LadderRating>>(new Map());
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const { signups, loading: signupsLoading, refetch: refetchSignups } = useProposalSignups(proposalId);

  const fetchProposal = useCallback(async () => {
    const { data } = await supabase
      .from("proposals")
      .select("*")
      .eq("id", proposalId)
      .single();

    if (!data) { setLoading(false); return; }

    // Fetch creator profile and park separately to avoid FK naming issues
    const [creatorRes, parkRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", data.creator_id).single(),
      supabase.from("parks").select("*").eq("id", data.park_id).single(),
    ]);

    setProposal({
      ...data,
      creator: creatorRes.data!,
      park: parkRes.data!,
    });
    setLoading(false);
  }, [proposalId]);

  // Fetch doubles ELO ratings for all signed-up players
  useEffect(() => {
    if (signups.length === 0) return;
    const ids = signups.map((s) => s.user_id);
    supabase
      .from("ladder_ratings")
      .select("*")
      .in("user_id", ids)
      .eq("mode", "doubles")
      .then(({ data }) => {
        const map = new Map<string, LadderRating>();
        for (const r of data || []) map.set(r.user_id, r);
        setRatings(map);
      });
  }, [signups]);

  const handlePairingChange = useCallback(async (teamA: [string, string], teamB: [string, string]) => {
    const updates = [
      ...teamA.map((id) => ({ user_id: id, team: "a" as const })),
      ...teamB.map((id) => ({ user_id: id, team: "b" as const })),
    ];

    for (const update of updates) {
      await supabase
        .from("proposal_signups")
        .update({ team: update.team })
        .eq("proposal_id", proposalId)
        .eq("user_id", update.user_id);
    }
  }, [proposalId]);

  // Auto-transition to pairing if we have 4 signups but status is still forming
  useEffect(() => {
    if (
      signups.length >= 4 &&
      proposal?.status === "forming" &&
      proposal?.mode === "doubles"
    ) {
      supabase
        .from("proposals")
        .update({ status: "pairing" })
        .eq("id", proposalId)
        .then(() => fetchProposal());
    }
  }, [signups.length, proposal?.status, proposal?.mode, proposalId, fetchProposal]);

  useEffect(() => {
    fetchProposal();

    const channel = supabase
      .channel(`proposal_${proposalId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "proposals", filter: `id=eq.${proposalId}` }, () => {
        fetchProposal();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchProposal, proposalId]);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  if (!authLoading && !user) return null;

  if (loading || authLoading || signupsLoading) {
    return <Loader />;
  }

  if (!proposal) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-[14px] text-muted-foreground">Proposal not found.</p>
      </main>
    );
  }

  const isCreator = userId === proposal.creator_id;
  const isSignedUp = signups.some((s) => s.user_id === userId);
  const signupCount = signups.length;
  const isInvitedPartner = userId === proposal.partner_id && !isSignedUp;
  const isPairing = proposal.status === "pairing";

  // Can this user join? (role assigned internally, creator arranges teams later)
  const canJoin = !isSignedUp && !isInvitedPartner && signupCount < 4 && proposal.status !== "accepted";

  const handleAcceptPartner = async () => {
    if (!userId) return;
    setActionLoading(true);
    try {
      // Partner inserts their own signup (satisfies RLS: auth.uid() = user_id)
      await supabase.from("proposal_signups").insert({
        proposal_id: proposalId,
        user_id: userId,
        role: "partner",
      });

      // Clear seeking_partner since partner accepted
      await supabase
        .from("proposals")
        .update({ seeking_partner: false })
        .eq("id", proposalId);

      refetchSignups();
      fetchProposal();
    } catch (err) {
      console.error("Accept partner error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclinePartner = async () => {
    if (!userId) return;
    setActionLoading(true);
    try {
      // Clear partner — slot opens for anyone to join
      await supabase
        .from("proposals")
        .update({ partner_id: null, seeking_partner: false })
        .eq("id", proposalId);

      fetchProposal();
    } catch (err) {
      console.error("Decline partner error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!userId || !canJoin) return;
    setActionLoading(true);
    try {
      // Assign role: first non-creator = opponent, rest = opponent_partner
      const hasOpponent = signups.some((s) => s.role === "opponent");
      const role = hasOpponent ? "opponent_partner" : "opponent";

      await supabase.from("proposal_signups").insert({
        proposal_id: proposalId,
        user_id: userId,
        role,
      });

      const newCount = signupCount + 1;

      // If this fills it to 4, move to pairing status
      if (newCount >= 4) {
        await supabase
          .from("proposals")
          .update({ status: "pairing" })
          .eq("id", proposalId);
      } else if (proposal.status === "open") {
        await supabase
          .from("proposals")
          .update({ status: "forming" })
          .eq("id", proposalId);
      }

      refetchSignups();
      fetchProposal();
    } catch (err) {
      console.error("Join error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!userId) return;
    setActionLoading(true);
    try {
      await supabase
        .from("proposal_signups")
        .delete()
        .eq("proposal_id", proposalId)
        .eq("user_id", userId);

      // Revert status if we drop below 4
      if (signupCount - 1 <= 1) {
        await supabase.from("proposals").update({ status: "open" }).eq("id", proposalId);
      } else {
        await supabase.from("proposals").update({ status: "forming" }).eq("id", proposalId);
      }

      refetchSignups();
      fetchProposal();
    } catch (err) {
      console.error("Leave error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartMatch = async (teamA: [string, string], teamB: [string, string]) => {
    setActionLoading(true);
    try {
      // Save final team assignments
      await handlePairingChange(teamA, teamB);

      // Accept the proposal
      const firstOpponent = signups.find((s) => s.role === "opponent");
      const opponentPartner = signups.find((s) => s.role === "opponent_partner");

      await supabase
        .from("proposals")
        .update({
          status: "accepted",
          accepted_by: firstOpponent?.user_id || null,
          acceptor_partner_id: opponentPartner?.user_id || null,
          accepted_at: new Date().toISOString(),
        })
        .eq("id", proposalId);

      // Create the match
      const { data: match } = await supabase.from("matches").insert({
        proposal_id: proposalId,
        mode: "doubles",
        player1_id: teamA[0],
        player2_id: teamA[1],
        player3_id: teamB[0],
        player4_id: teamB[1],
        status: "pending",
      }).select().single();

      if (match) {
        const navParams = new URLSearchParams();
        if (tierParam) navParams.set("tier", tierParam);
        if (modeParam) navParams.set("mode", modeParam);
        navParams.set("tab", "matches");
        router.push(`/ladder/match/${match.id}?${navParams.toString()}`);
      }
    } catch (err) {
      console.error("Start match error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  // Build player info for court pairing (include saved team assignments)
  const courtPlayers = signups.map((s) => ({
    userId: s.user_id,
    profile: s.profile,
    elo: ratings.get(s.user_id)?.elo_rating || 1200,
    team: s.team,
  }));

  const statusLabel: Record<string, string> = {
    open: "Looking for players",
    forming: `${signupCount}/4 players`,
    pairing: "Arranging teams",
    accepted: "Match created",
  };

  const statusColor: Record<string, string> = {
    open: "bg-amber-100 text-amber-800",
    forming: "bg-blue-100 text-blue-800",
    pairing: "bg-green-100 text-green-800",
    accepted: "bg-green-100 text-green-800",
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-5 py-8 sm:px-6 space-y-6">
        <AppHeader
          title="Doubles"
          badge={
            <span className={`inline-block text-[12px] px-2.5 py-0.5 rounded-full font-medium ${statusColor[proposal.status] || statusColor.open}`}>
              {statusLabel[proposal.status] || proposal.status}
            </span>
          }
          onBack={goBack}
        />

        {/* Proposal info */}
        <Card>
          <CardContent className="pt-5 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[15px] font-semibold">{proposal.creator.username}</p>
                <p className="text-[12px] text-muted-foreground">Organizer</p>
              </div>
              <div className="text-right">
                <p className="text-[13px] font-medium">{proposal.park.name}</p>
                <p className="text-[12px] text-muted-foreground">{formatDateTime(proposal.proposed_time)}</p>
              </div>
            </div>
            {proposal.message && (
              <p className="text-[13px] text-muted-foreground italic">&ldquo;{proposal.message}&rdquo;</p>
            )}
          </CardContent>
        </Card>

        {/* Partner invitation */}
        {isInvitedPartner && proposal.status !== "accepted" && (
          <Card className="border-green-300 bg-green-50/50">
            <CardContent className="pt-5 space-y-3">
              <div className="text-center space-y-1">
                <p className="text-[15px] font-semibold text-green-800">
                  You&apos;ve been invited as a partner
                </p>
                <p className="text-[13px] text-green-700">
                  {proposal.creator.username} wants you on their team for doubles
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleAcceptPartner}
                  disabled={actionLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  {actionLoading ? "Accepting..." : "Accept"}
                </Button>
                <Button
                  onClick={handleDeclinePartner}
                  disabled={actionLoading}
                  variant="outline"
                  className="flex-1 text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  Decline
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Player slots (forming phase) */}
        {!isPairing && proposal.status !== "accepted" && (
          <Card>
            <CardContent className="pt-5 space-y-3">
              <h3 className="text-[14px] font-semibold">Players ({signupCount}/4)</h3>
              <div className="space-y-2">
                {signups.map((s) => (
                  <div key={s.id} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-[12px] font-bold">
                        {s.profile.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-[13px] font-medium">{s.profile.username}</p>
                        <p className="text-[11px] text-muted-foreground">{s.role === "creator" ? "Organizer" : "Player"}</p>
                      </div>
                    </div>
                    <span className="text-[12px] text-muted-foreground">{s.profile.skill_level}</span>
                  </div>
                ))}

                {/* Pending partner invitation slot — only if partner_id is set and they haven't joined yet */}
                {proposal.partner_id && proposal.seeking_partner && !signups.some((s) => s.user_id === proposal.partner_id) && (
                  <div className="flex items-center gap-2 py-1.5">
                    <div className="w-7 h-7 rounded-full border-2 border-dashed border-amber-400 bg-amber-50 flex items-center justify-center">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-amber-500" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-amber-700">Partner invited</p>
                      <p className="text-[11px] text-muted-foreground">Waiting for response...</p>
                    </div>
                  </div>
                )}

                {/* Empty slots (excluding pending partner slot) */}
                {Array.from({ length: Math.max(0, 4 - signupCount - (proposal.partner_id && proposal.seeking_partner && !signups.some((s) => s.user_id === proposal.partner_id) ? 1 : 0)) }).map((_, i) => (
                  <div key={`empty-${i}`} className="flex items-center gap-2 py-1.5 opacity-40">
                    <div className="w-7 h-7 rounded-full border-2 border-dashed border-muted-foreground/40" />
                    <p className="text-[13px] text-muted-foreground">
                      Waiting for player...
                    </p>
                  </div>
                ))}
              </div>

              {/* Join / Leave buttons (hide if user is invited partner — they use accept/decline above) */}
              {canJoin && (
                <Button
                  onClick={handleJoin}
                  disabled={actionLoading}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  {actionLoading ? "Joining..." : "Join"}
                </Button>
              )}

              {isSignedUp && !isCreator && (
                <Button
                  onClick={handleLeave}
                  disabled={actionLoading}
                  variant="outline"
                  className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  {actionLoading ? "Leaving..." : "Leave"}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Court pairing (pairing phase) */}
        {isPairing && courtPlayers.length === 4 && userId && (
          <Card>
            <CardContent className="pt-5">
              <h3 className="text-[14px] font-semibold mb-4 text-center">Arrange Teams</h3>
              <CourtPairing
                players={courtPlayers}
                creatorId={proposal.creator_id}
                currentUserId={userId}
                onStartMatch={handleStartMatch}
                onPairingChange={handlePairingChange}
                disabled={actionLoading}
              />
            </CardContent>
          </Card>
        )}

        {/* Court pairing (accepted — read-only) */}
        {proposal.status === "accepted" && courtPlayers.length === 4 && userId && (
          <Card>
            <CardContent className="pt-5">
              <CourtPairing
                players={courtPlayers}
                creatorId={proposal.creator_id}
                currentUserId={userId}
                onStartMatch={() => {}}
                disabled
              />
            </CardContent>
          </Card>
        )}

        {/* Contact info (pairing + accepted — only visible to participants) */}
        {(isPairing || proposal.status === "accepted") && courtPlayers.length === 4 && isSignedUp && (
          <Card>
            <CardContent className="pt-5 space-y-3">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                <h3 className="text-[14px] font-semibold">Contact Info</h3>
              </div>
              <p className="text-[11px] text-muted-foreground">Need to coordinate? Here&apos;s how to reach everyone.</p>
              <div className="rounded-lg border border-border bg-muted/30 divide-y divide-border">
                {signups.map((s) => (
                  <div key={s.id} className="flex items-center justify-between px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-[10px] font-bold">
                        {s.profile.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-[13px] font-medium">{s.profile.username}</span>
                    </div>
                    {s.profile.email ? (
                      <a href={`mailto:${s.profile.email}`} className="text-[12px] text-green-700 hover:underline">
                        {s.profile.email}
                      </a>
                    ) : (
                      <span className="text-[11px] text-muted-foreground italic">No email</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cancel (creator only, not yet accepted) */}
        {isCreator && proposal.status !== "accepted" && (
          <Button
            variant="outline"
            disabled={actionLoading}
            onClick={async () => {
              setActionLoading(true);
              await supabase.from("proposals").update({ status: "cancelled" }).eq("id", proposalId);
              goBack();
            }}
            className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
          >
            Cancel Proposal
          </Button>
        )}
      </div>
    </main>
  );
}
