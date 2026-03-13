"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { useLadderMembership } from "@/lib/ladder-hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AppHeader } from "@/components/app-header";
import type { Park, Profile, MatchMode, SkillLevel } from "@/types/database";
import { SKILL_TIER_LEVELS, getSkillTier } from "@/types/database";
import { Loader } from "@/components/loader";

export default function NewProposalPage() {
  return (
    <Suspense fallback={<Loader />}>
      <NewProposalPageInner />
    </Suspense>
  );
}

function NewProposalPageInner() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tierParam = searchParams.get("tier");
  const modeParam = searchParams.get("mode") as MatchMode | null;
  const tabParam = searchParams.get("tab");
  const goBack = () => {
    const params = new URLSearchParams();
    if (tierParam) params.set("tier", tierParam);
    if (mode === "doubles") params.set("mode", "doubles");
    if (tabParam) params.set("tab", tabParam);
    router.push(`/ladder${params.toString() ? `?${params}` : ""}`);
  };
  const userId = user?.id;
  const { member, loading: memberLoading } = useLadderMembership(userId);

  const [mode, setMode] = useState<MatchMode>(modeParam === "doubles" ? "doubles" : "singles");
  const [parks, setParks] = useState<Park[]>([]);
  const [parkId, setParkId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Doubles-specific state
  const [seekingPartner, setSeekingPartner] = useState(true);
  const [partnerId, setPartnerId] = useState("");
  const [tierMembers, setTierMembers] = useState<Profile[]>([]);

  useEffect(() => {
    supabase.from("parks").select("*").order("name").then(({ data }) => {
      if (data) setParks(data);
    });
  }, []);

  // Fetch tier members for partner picker (doubles with partner)
  useEffect(() => {
    if (mode !== "doubles" || seekingPartner || !profile) return;

    const userTier = getSkillTier(profile.skill_level as SkillLevel);
    const tierLevels = SKILL_TIER_LEVELS[userTier];

    (async () => {
      // Get all active ladder members
      const { data: members } = await supabase
        .from("ladder_members")
        .select("user_id")
        .eq("status", "active");

      if (!members || members.length === 0) { setTierMembers([]); return; }

      const memberIds = members.map((m: { user_id: string }) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", memberIds)
        .in("skill_level", tierLevels)
        .neq("id", userId)
        .order("username");

      setTierMembers(profiles || []);
    })();
  }, [mode, seekingPartner, profile, userId]);

  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();
  const maxDateStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  useEffect(() => {
    setDate(todayStr);
    setTime("17:00");
  }, [todayStr]);

  if (!authLoading && !user) { router.replace("/login"); return null; }
  if (!authLoading && user && !profile) { router.replace("/setup"); return null; }
  if (!memberLoading && !member) { router.replace("/ladder"); return null; }

  if (authLoading || memberLoading) {
    return <Loader />;
  }

  const handleSubmit = async () => {
    if (!parkId || !date || !time || !userId) return;
    setSubmitting(true);
    try {
      const proposedTime = new Date(`${date}T${time}:00`).toISOString();
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

      const isDoubles = mode === "doubles";
      const hasPartner = isDoubles && !seekingPartner && partnerId;

      // Create the proposal
      const { data: proposal, error } = await supabase.from("proposals").insert({
        creator_id: userId,
        park_id: parkId,
        proposed_time: proposedTime,
        message: message.trim() || null,
        expires_at: expiresAt,
        mode,
        partner_id: hasPartner ? partnerId : null,
        seeking_partner: isDoubles ? seekingPartner : false,
        status: isDoubles ? "forming" : "open",
      }).select().single();

      if (error || !proposal) throw error;

      // For doubles, auto-create the creator's signup
      // Partner is NOT auto-added — they must accept the invitation from the proposal page
      if (isDoubles) {
        await supabase.from("proposal_signups").insert({
          proposal_id: proposal.id,
          user_id: userId,
          role: "creator",
        });
      }

      goBack();
    } catch (err) {
      console.error("Create proposal error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const isValid = parkId && date && time &&
    (mode === "singles" || seekingPartner || partnerId);

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-5 py-8 sm:px-6 space-y-6">
        <AppHeader
          title="New Proposal"
          subtitle={mode === "doubles" ? "Find a doubles match" : "Challenge someone to a match"}
          onBack={goBack}
        />

        {/* Mode Toggle */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => setMode("singles")}
            className={`flex-1 py-2.5 text-[14px] font-medium transition-colors ${
              mode === "singles"
                ? "bg-green-600 text-white"
                : "bg-muted/30 text-muted-foreground hover:text-foreground"
            }`}
          >
            Singles
          </button>
          <button
            onClick={() => setMode("doubles")}
            className={`flex-1 py-2.5 text-[14px] font-medium transition-colors ${
              mode === "doubles"
                ? "bg-green-600 text-white"
                : "bg-muted/30 text-muted-foreground hover:text-foreground"
            }`}
          >
            Doubles
          </button>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            {/* Doubles: Partner selection */}
            {mode === "doubles" && (
              <div className="space-y-3">
                <label className="text-[14px] font-medium">Partner</label>
                <div className="flex rounded-lg border border-border overflow-hidden">
                  <button
                    onClick={() => { setSeekingPartner(true); setPartnerId(""); }}
                    className={`flex-1 py-2 text-[13px] font-medium transition-colors ${
                      seekingPartner
                        ? "bg-foreground text-background"
                        : "bg-muted/30 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Looking for partner
                  </button>
                  <button
                    onClick={() => setSeekingPartner(false)}
                    className={`flex-1 py-2 text-[13px] font-medium transition-colors ${
                      !seekingPartner
                        ? "bg-foreground text-background"
                        : "bg-muted/30 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    I have a partner
                  </button>
                </div>

                {seekingPartner && (
                  <p className="text-[12px] text-muted-foreground bg-muted/40 rounded-md px-3 py-2">
                    Other players in your tier can join as your partner before opponents sign up.
                  </p>
                )}

                {!seekingPartner && (
                  <select
                    value={partnerId}
                    onChange={(e) => setPartnerId(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-3 text-[16px] focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Select your partner...</option>
                    {tierMembers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.username} ({p.skill_level})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Park select */}
            <div className="space-y-1.5">
              <label className="text-[14px] font-medium">Court</label>
              <select
                value={parkId}
                onChange={(e) => setParkId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-3 text-[16px] focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select a court...</option>
                {parks.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <label className="text-[14px] font-medium">Date</label>
              <input
                type="date"
                value={date}
                min={todayStr}
                max={maxDateStr}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-3 text-[16px] focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Time */}
            <div className="space-y-1.5">
              <label className="text-[14px] font-medium">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-3 text-[16px] focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Message */}
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <label className="text-[14px] font-medium">Note <span className="text-muted-foreground font-normal">(optional)</span></label>
                <span className={`text-[11px] tabular-nums ${message.length > 70 ? "text-amber-600" : "text-muted-foreground"}`}>
                  {message.length}/80
                </span>
              </div>
              <textarea
                value={message}
                onChange={(e) => { if (e.target.value.length <= 80) setMessage(e.target.value); }}
                placeholder={mode === "doubles"
                  ? "e.g. Bringing a friend, need 2 more!"
                  : "e.g. Down for a best of 3, any level welcome"
                }
                rows={2}
                maxLength={80}
                className="w-full rounded-md border border-input bg-background px-3 py-3 text-[16px] focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            {/* Summary for doubles */}
            {mode === "doubles" && (
              <div className="text-[12px] text-muted-foreground bg-muted/40 rounded-md px-3 py-2 space-y-1">
                <p className="font-medium text-foreground">What happens next:</p>
                {seekingPartner ? (
                  <ol className="list-decimal list-inside space-y-0.5">
                    <li>A partner from your tier joins you</li>
                    <li>An opposing team (or two solos) sign up</li>
                    <li>Teams auto-balanced by rating, then everyone confirms</li>
                  </ol>
                ) : (
                  <ol className="list-decimal list-inside space-y-0.5">
                    <li>An opposing team (or two solos) sign up</li>
                    <li>Teams auto-balanced by rating, then everyone confirms</li>
                  </ol>
                )}
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={!isValid || submitting}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {submitting ? "Creating..." : "Post Proposal"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
