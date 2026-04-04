"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AppHeader } from "@/components/app-header";
import { Loader } from "@/components/loader";
import { createBracket } from "@/lib/playoff-utils";
import { usePlayoffBracket } from "@/lib/playoff-hooks";
import { getSeasonRange } from "@/lib/ladder-hooks";
import type { SkillTier, MatchMode } from "@/types/database";
import { SKILL_TIER_LEVELS, SKILL_TIER_LABELS } from "@/types/database";
import type { LadderRating, Profile, SkillLevel } from "@/types/database";

const ADMIN_IDS = (process.env.NEXT_PUBLIC_ADMIN_IDS || "").split(",").map((s) => s.trim()).filter(Boolean);

interface ParkSubmission {
  id: string;
  submitted_by: string;
  name: string;
  address: string;
  court_count: number;
  status: string;
  created_at: string;
  submitter_username?: string;
}

interface FeedbackItem {
  id: string;
  user_id: string;
  message: string;
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
  username?: string;
  email?: string;
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [section, setSection] = useState<"parks" | "feedback" | "playoffs">("parks");

  // Park submissions state
  const [submissions, setSubmissions] = useState<ParkSubmission[]>([]);
  const [parkTab, setParkTab] = useState<"pending" | "reviewed">("pending");
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  // Feedback state
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [feedbackTab, setFeedbackTab] = useState<"new" | "replied">("new");
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const isAdmin = user && ADMIN_IDS.includes(user.id);

  // --- Park submissions ---
  const fetchSubmissions = useCallback(async () => {
    const { data } = await supabase
      .from("park_submissions")
      .select("*")
      .order("created_at", { ascending: false });

    if (!data) { setLoading(false); return; }

    const userIds = [...new Set(data.map((s: ParkSubmission) => s.submitted_by))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", userIds);

    const profileMap = new Map((profiles || []).map((p: { id: string; username: string }) => [p.id, p.username]));

    setSubmissions(
      data.map((s: ParkSubmission) => ({
        ...s,
        submitter_username: profileMap.get(s.submitted_by) || "Unknown",
      }))
    );
    setLoading(false);
  }, []);

  // --- Feedback ---
  const fetchFeedback = useCallback(async () => {
    const { data } = await supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false });

    if (!data) { setFeedbackLoading(false); return; }

    const userIds = [...new Set(data.map((f: FeedbackItem) => f.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", userIds);

    const profileMap = new Map((profiles || []).map((p: { id: string; username: string }) => [p.id, p.username]));

    setFeedbackItems(
      data.map((f: FeedbackItem) => ({
        ...f,
        username: profileMap.get(f.user_id) || "Unknown",
      }))
    );
    setFeedbackLoading(false);
  }, []);

  useEffect(() => {
    if (!authLoading && !user) { router.replace("/login"); return; }
    if (user && !ADMIN_IDS.includes(user.id)) { router.replace("/"); return; }
    if (user) {
      fetchSubmissions();
      fetchFeedback();
    }
  }, [user, authLoading, router, fetchSubmissions, fetchFeedback]);

  const handleApprove = async (submission: ParkSubmission) => {
    setActionId(submission.id);
    try {
      let lat = 35.7796;
      let lng = -78.6382;
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(submission.address)}&format=json&limit=1`
        );
        const data = await res.json();
        if (data.length > 0) {
          lat = parseFloat(data[0].lat);
          lng = parseFloat(data[0].lon);
        }
      } catch {
        // Use fallback coords
      }

      const { error: parkError } = await supabase.from("parks").insert({
        name: submission.name,
        address: submission.address,
        lat,
        lng,
        court_count: submission.court_count,
      });

      if (parkError) {
        console.error("Insert park error:", parkError);
      }

      await supabase
        .from("park_submissions")
        .update({ status: "approved" })
        .eq("id", submission.id);

      await fetchSubmissions();
    } catch (err) {
      console.error("Approve error:", err);
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (submission: ParkSubmission) => {
    setActionId(submission.id);
    try {
      await supabase
        .from("park_submissions")
        .update({ status: "rejected" })
        .eq("id", submission.id);
      await fetchSubmissions();
    } catch (err) {
      console.error("Reject error:", err);
    } finally {
      setActionId(null);
    }
  };

  const handleReply = async (item: FeedbackItem) => {
    if (!replyText.trim()) return;
    setReplySending(true);
    try {
      await supabase
        .from("feedback")
        .update({
          admin_reply: replyText.trim(),
          replied_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      // Send reply email via edge function
      await supabase.functions.invoke("send-email", {
        body: {
          type: "feedback_reply",
          feedback_id: item.id,
          user_id: item.user_id,
          admin_reply: replyText.trim(),
        },
      });

      setReplyText("");
      setReplyingTo(null);
      await fetchFeedback();
    } catch (err) {
      console.error("Reply error:", err);
    } finally {
      setReplySending(false);
    }
  };

  const handleDeleteSubmission = async (id: string) => {
    if (confirmDeleteId !== id) { setConfirmDeleteId(id); return; }
    setActionId(id);
    try {
      await supabase.from("park_submissions").delete().eq("id", id);
      await fetchSubmissions();
    } catch (err) {
      console.error("Delete submission error:", err);
    } finally {
      setActionId(null);
      setConfirmDeleteId(null);
    }
  };

  const handleDeleteFeedback = async (id: string) => {
    if (confirmDeleteId !== id) { setConfirmDeleteId(id); return; }
    setActionId(id);
    try {
      await supabase.from("feedback").delete().eq("id", id);
      await fetchFeedback();
    } catch (err) {
      console.error("Delete feedback error:", err);
    } finally {
      setActionId(null);
      setConfirmDeleteId(null);
    }
  };

  if (authLoading || loading) return <Loader />;
  if (!isAdmin) return null;

  const pending = submissions.filter((s) => s.status === "pending");
  const reviewed = submissions.filter((s) => s.status !== "pending");
  const parkActive = parkTab === "pending" ? pending : reviewed;

  const newFeedback = feedbackItems.filter((f) => !f.admin_reply);
  const repliedFeedback = feedbackItems.filter((f) => f.admin_reply);
  const feedbackActive = feedbackTab === "new" ? newFeedback : repliedFeedback;

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-8 sm:px-6 space-y-5">
        <AppHeader
          title="Admin"
          subtitle={`${pending.length} pending · ${newFeedback.length} feedback`}
          backHref="/"
        />

        {/* Section toggle */}
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => setSection("parks")}
            className={`flex-1 text-[13px] font-medium py-2 rounded-md transition-colors ${
              section === "parks"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Parks
          </button>
          <button
            onClick={() => setSection("feedback")}
            className={`flex-1 text-[13px] font-medium py-2 rounded-md transition-colors ${
              section === "feedback"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Feedback {newFeedback.length > 0 && (
              <span className="ml-1 text-[10px] bg-violet-100 text-violet-700 border border-violet-200 px-1.5 py-0.5 rounded-full">
                {newFeedback.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setSection("playoffs")}
            className={`flex-1 text-[13px] font-medium py-2 rounded-md transition-colors ${
              section === "playoffs"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Playoffs
          </button>
        </div>

        {/* Parks section */}
        {section === "parks" && (
          <>
            <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
              <button
                onClick={() => setParkTab("pending")}
                className={`flex-1 text-[12px] font-medium py-1.5 rounded-md transition-colors ${
                  parkTab === "pending"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Pending ({pending.length})
              </button>
              <button
                onClick={() => setParkTab("reviewed")}
                className={`flex-1 text-[12px] font-medium py-1.5 rounded-md transition-colors ${
                  parkTab === "reviewed"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Reviewed ({reviewed.length})
              </button>
            </div>

            {parkActive.length === 0 ? (
              <div className="text-center py-12 text-[14px] text-muted-foreground">
                {parkTab === "pending" ? "No pending submissions." : "No reviewed submissions yet."}
              </div>
            ) : (
              <div className="space-y-3">
                {parkActive.map((s) => (
                  <Card key={s.id}>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[15px] font-semibold truncate">{s.name}</p>
                          <p className="text-[12px] text-muted-foreground truncate">{s.address}</p>
                        </div>
                        {s.status !== "pending" && (
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${
                            s.status === "approved"
                              ? "text-green-700 bg-green-50 border-green-200"
                              : "text-red-700 bg-red-50 border-red-200"
                          }`}>
                            {s.status === "approved" ? "Approved" : "Rejected"}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[12px] text-muted-foreground">
                        <span>{s.court_count} court{s.court_count !== 1 ? "s" : ""}</span>
                        <span>by {s.submitter_username}</span>
                        <span>{new Date(s.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                        <button
                          onClick={() => handleDeleteSubmission(s.id)}
                          disabled={actionId === s.id}
                          className={`text-[11px] font-medium px-2 py-0.5 rounded transition-colors ${
                            confirmDeleteId === s.id
                              ? "text-red-600 bg-red-50 hover:bg-red-100"
                              : "text-muted-foreground hover:text-red-500"
                          }`}
                        >
                          {confirmDeleteId === s.id ? "Delete?" : "Del"}
                        </button>
                      </div>

                      {s.status === "pending" && (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleApprove(s)}
                            disabled={actionId === s.id}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                            size="sm"
                          >
                            {actionId === s.id ? "Approving..." : "Approve"}
                          </Button>
                          <Button
                            onClick={() => handleReject(s)}
                            disabled={actionId === s.id}
                            variant="outline"
                            className="flex-1 text-red-500 hover:text-red-600 hover:bg-red-50"
                            size="sm"
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* Feedback section */}
        {section === "feedback" && (
          <>
            <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
              <button
                onClick={() => setFeedbackTab("new")}
                className={`flex-1 text-[12px] font-medium py-1.5 rounded-md transition-colors ${
                  feedbackTab === "new"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                New ({newFeedback.length})
              </button>
              <button
                onClick={() => setFeedbackTab("replied")}
                className={`flex-1 text-[12px] font-medium py-1.5 rounded-md transition-colors ${
                  feedbackTab === "replied"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Replied ({repliedFeedback.length})
              </button>
            </div>

            {feedbackLoading ? (
              <Loader />
            ) : feedbackActive.length === 0 ? (
              <div className="text-center py-12 text-[14px] text-muted-foreground">
                {feedbackTab === "new" ? "No new feedback." : "No replies yet."}
              </div>
            ) : (
              <div className="space-y-3">
                {feedbackActive.map((f) => (
                  <Card key={f.id}>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[14px] font-semibold">{f.username}</p>
                          <p className="text-[12px] text-muted-foreground">
                            {new Date(f.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {f.admin_reply && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border text-green-700 bg-green-50 border-green-200">
                              Replied
                            </span>
                          )}
                          <button
                            onClick={() => handleDeleteFeedback(f.id)}
                            disabled={actionId === f.id}
                            className={`text-[11px] font-medium px-2 py-0.5 rounded transition-colors ${
                              confirmDeleteId === f.id
                                ? "text-red-600 bg-red-50 hover:bg-red-100"
                                : "text-muted-foreground hover:text-red-500"
                            }`}
                          >
                            {confirmDeleteId === f.id ? "Delete?" : "Del"}
                          </button>
                        </div>
                      </div>

                      <p className="text-[13px] text-foreground leading-relaxed whitespace-pre-wrap">
                        {f.message}
                      </p>

                      {f.admin_reply && (
                        <div className="bg-violet-50 border border-violet-200 rounded-lg px-3 py-2">
                          <p className="text-[11px] font-medium text-violet-600 mb-1">Your reply</p>
                          <p className="text-[13px] text-foreground whitespace-pre-wrap">{f.admin_reply}</p>
                        </div>
                      )}

                      {!f.admin_reply && replyingTo === f.id && (
                        <div className="space-y-2">
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Type your reply..."
                            rows={3}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none"
                          />
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleReply(f)}
                              disabled={replySending || !replyText.trim()}
                              className="flex-1 text-white"
                              style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6)" }}
                              size="sm"
                            >
                              {replySending ? "Sending..." : "Send Reply"}
                            </Button>
                            <Button
                              onClick={() => { setReplyingTo(null); setReplyText(""); }}
                              variant="outline"
                              size="sm"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}

                      {!f.admin_reply && replyingTo !== f.id && (
                        <Button
                          onClick={() => { setReplyingTo(f.id); setReplyText(""); }}
                          variant="outline"
                          size="sm"
                          className="text-violet-600 hover:text-violet-700 hover:bg-violet-50 border-violet-200"
                        >
                          Reply
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
        {/* Playoffs section */}
        {section === "playoffs" && <PlayoffsSection />}
      </div>
    </main>
  );
}

function PlayoffsSection() {
  const season = getSeasonRange();
  const tiers: SkillTier[] = ["beginner", "intermediate", "advanced"];
  const [mode, setMode] = useState<MatchMode>("singles");
  const [tierCounts, setTierCounts] = useState<Record<SkillTier, number>>({ beginner: 0, intermediate: 0, advanced: 0 });
  const [tierPlayers, setTierPlayers] = useState<Record<SkillTier, { user_id: string; elo_rating: number }[]>>({ beginner: [], intermediate: [], advanced: [] });
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<SkillTier | null>(null);
  const [cancelling, setCancelling] = useState<SkillTier | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<SkillTier | null>(null);

  const { bracket: beginnerBracket, refetch: refetchBeginner } = usePlayoffBracket("beginner", mode);
  const { bracket: intermediateBracket, refetch: refetchIntermediate } = usePlayoffBracket("intermediate", mode);
  const { bracket: advancedBracket, refetch: refetchAdvanced } = usePlayoffBracket("advanced", mode);

  const brackets: Record<SkillTier, typeof beginnerBracket> = {
    beginner: beginnerBracket,
    intermediate: intermediateBracket,
    advanced: advancedBracket,
  };
  const refetches: Record<SkillTier, () => Promise<void>> = {
    beginner: refetchBeginner,
    intermediate: refetchIntermediate,
    advanced: refetchAdvanced,
  };

  const isDoubles = mode === "doubles";
  const minPlayers = isDoubles ? 16 : 8;

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: ratings } = await supabase
        .from("ladder_ratings")
        .select("*")
        .eq("mode", mode)
        .order("elo_rating", { ascending: false });

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, skill_level");

      if (!ratings || !profiles) { setLoading(false); return; }

      const profileMap = new Map(profiles.map((p: { id: string; skill_level: string }) => [p.id, p]));
      const counts: Record<SkillTier, number> = { beginner: 0, intermediate: 0, advanced: 0 };
      const players: Record<SkillTier, { user_id: string; elo_rating: number }[]> = { beginner: [], intermediate: [], advanced: [] };

      for (const r of ratings as LadderRating[]) {
        const p = profileMap.get(r.user_id);
        if (!p) continue;
        for (const tier of tiers) {
          if (SKILL_TIER_LEVELS[tier].includes(p.skill_level as SkillLevel)) {
            counts[tier]++;
            players[tier].push({ user_id: r.user_id, elo_rating: r.elo_rating });
            break;
          }
        }
      }

      setTierCounts(counts);
      setTierPlayers(players);
      setLoading(false);
    })();
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStart = async (tier: SkillTier) => {
    setStarting(tier);
    try {
      await createBracket(tier, mode, tierPlayers[tier]);
      await refetches[tier]();
    } catch (err) {
      console.error("Start playoffs error:", err);
    } finally {
      setStarting(null);
    }
  };

  const handleCancel = async (tier: SkillTier) => {
    if (confirmCancel !== tier) { setConfirmCancel(tier); return; }
    setCancelling(tier);
    try {
      const bracket = brackets[tier];
      if (bracket) {
        await supabase
          .from("playoff_brackets")
          .update({ status: "cancelled" })
          .eq("id", bracket.id);
        await refetches[tier]();
      }
    } catch (err) {
      console.error("Cancel playoffs error:", err);
    } finally {
      setCancelling(null);
      setConfirmCancel(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-[13px] text-muted-foreground">
          {season.label} Season — Week {season.currentWeek}/{season.totalWeeks}
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 max-w-[200px] mx-auto">
        <button
          onClick={() => { setMode("singles"); setConfirmCancel(null); }}
          className={`flex-1 text-[13px] font-medium py-1.5 rounded-md transition-colors ${
            mode === "singles"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Singles
        </button>
        <button
          onClick={() => { setMode("doubles"); setConfirmCancel(null); }}
          className={`flex-1 text-[13px] font-medium py-1.5 rounded-md transition-colors ${
            mode === "doubles"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Doubles
        </button>
      </div>

      {loading ? <Loader /> : tiers.map((tier) => {
        const bracket = brackets[tier];
        const count = tierCounts[tier];
        const hasEnough = count >= minPlayers;
        const isActive = bracket?.status === "active";
        const isCompleted = bracket?.status === "completed";

        return (
          <Card key={tier}>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[15px] font-semibold">{SKILL_TIER_LABELS[tier]}</p>
                  <p className="text-[12px] text-muted-foreground">
                    <span className={hasEnough ? "text-green-600 font-medium" : "text-red-500 font-medium"}>
                      {count} {isDoubles ? "doubles" : ""} players
                    </span>
                    {" "}({minPlayers} required)
                  </p>
                </div>
                {bracket && (
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${
                    isActive ? "text-blue-700 bg-blue-50 border-blue-200" :
                    isCompleted ? "text-green-700 bg-green-50 border-green-200" :
                    "text-gray-700 bg-gray-50 border-gray-200"
                  }`}>
                    {bracket.status.charAt(0).toUpperCase() + bracket.status.slice(1)}
                  </span>
                )}
              </div>

              {isActive && (
                <a
                  href={`/ladder/playoffs?tier=${tier}&mode=${mode}`}
                  className={`block text-[12px] ${isDoubles ? "text-amber-600" : "text-sky-600"} hover:underline font-medium`}
                >
                  View Bracket →
                </a>
              )}

              <div className="flex gap-2">
                {!bracket || bracket.status === "cancelled" ? (
                  <Button
                    onClick={() => handleStart(tier)}
                    disabled={!hasEnough || starting === tier}
                    className={`flex-1 text-white ${isDoubles ? "bg-amber-600 hover:bg-amber-700" : "bg-sky-600 hover:bg-sky-700"}`}
                    size="sm"
                  >
                    {starting === tier ? "Starting..." : `Start ${isDoubles ? "Doubles " : ""}Playoffs`}
                  </Button>
                ) : isActive ? (
                  <Button
                    onClick={() => handleCancel(tier)}
                    disabled={cancelling === tier}
                    variant="outline"
                    className={`flex-1 ${
                      confirmCancel === tier
                        ? "text-red-600 border-red-300 hover:bg-red-50"
                        : "text-muted-foreground"
                    }`}
                    size="sm"
                  >
                    {cancelling === tier ? "Cancelling..." : confirmCancel === tier ? "Confirm Cancel?" : "Cancel Playoffs"}
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
