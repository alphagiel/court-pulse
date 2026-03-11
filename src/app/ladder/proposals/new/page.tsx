"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { useLadderMembership } from "@/lib/ladder-hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Park } from "@/types/database";

export default function NewProposalPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tierParam = searchParams.get("tier");
  const goBack = () => tierParam ? router.push(`/ladder?tier=${tierParam}`) : router.push("/ladder");
  const userId = user?.id;
  const { member, loading: memberLoading } = useLadderMembership(userId);

  const [parks, setParks] = useState<Park[]>([]);
  const [parkId, setParkId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.from("parks").select("*").order("name").then(({ data }) => {
      if (data) setParks(data);
    });
  }, []);

  // Set default date to today, compute min/max for date picker
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
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-[14px] text-muted-foreground">Loading...</p>
      </main>
    );
  }

  const handleSubmit = async () => {
    if (!parkId || !date || !time || !userId) return;
    setSubmitting(true);
    try {
      const proposedTime = new Date(`${date}T${time}:00`).toISOString();
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

      await supabase.from("proposals").insert({
        creator_id: userId,
        park_id: parkId,
        proposed_time: proposedTime,
        message: message.trim() || null,
        expires_at: expiresAt,
      });

      goBack();
    } catch (err) {
      console.error("Create proposal error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const isValid = parkId && date && time;

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
          <h1 className="text-[22px] font-bold tracking-[0.5px]">New Proposal</h1>
          <p className="text-[14px] text-muted-foreground">Challenge someone to a match</p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
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
              <label className="text-[14px] font-medium">Message <span className="text-muted-foreground font-normal">(optional)</span></label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Looking for a competitive match..."
                rows={2}
                maxLength={200}
                className="w-full rounded-md border border-input bg-background px-3 py-3 text-[16px] focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

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
