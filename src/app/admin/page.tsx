"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AppHeader } from "@/components/app-header";
import { Loader } from "@/components/loader";

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

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [submissions, setSubmissions] = useState<ParkSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [tab, setTab] = useState<"pending" | "reviewed">("pending");

  const isAdmin = user && ADMIN_IDS.includes(user.id);

  const fetchSubmissions = useCallback(async () => {
    // Service role not available client-side, so we query via a workaround:
    // Admin can see all submissions via a permissive RLS policy (added in migration)
    const { data } = await supabase
      .from("park_submissions")
      .select("*")
      .order("created_at", { ascending: false });

    if (!data) { setLoading(false); return; }

    // Fetch submitter usernames
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

  useEffect(() => {
    if (!authLoading && !user) { router.replace("/login"); return; }
    if (user && !ADMIN_IDS.includes(user.id)) { router.replace("/"); return; }
    if (user) fetchSubmissions();
  }, [user, authLoading, router, fetchSubmissions]);

  const handleApprove = async (submission: ParkSubmission) => {
    setActionId(submission.id);
    try {
      // Geocode via Nominatim
      let lat = 35.7796;  // Raleigh fallback
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

      // Insert into parks
      const { error: parkError } = await supabase.from("parks").insert({
        name: submission.name,
        address: submission.address,
        lat,
        lng,
        court_count: submission.court_count,
      });

      if (parkError) {
        console.error("Insert park error:", parkError);
        // Could be duplicate name — still mark as approved
      }

      // Mark submission as approved
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

  if (authLoading || loading) return <Loader />;
  if (!isAdmin) return null;

  const pending = submissions.filter((s) => s.status === "pending");
  const reviewed = submissions.filter((s) => s.status !== "pending");

  const active = tab === "pending" ? pending : reviewed;

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-8 sm:px-6 space-y-5">
        <AppHeader
          title="Admin"
          subtitle={`${pending.length} pending submission${pending.length !== 1 ? "s" : ""}`}
          backHref="/"
        />

        {/* Tabs */}
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => setTab("pending")}
            className={`flex-1 text-[13px] font-medium py-2 rounded-md transition-colors ${
              tab === "pending"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Pending ({pending.length})
          </button>
          <button
            onClick={() => setTab("reviewed")}
            className={`flex-1 text-[13px] font-medium py-2 rounded-md transition-colors ${
              tab === "reviewed"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Reviewed ({reviewed.length})
          </button>
        </div>

        {active.length === 0 ? (
          <div className="text-center py-12 text-[14px] text-muted-foreground">
            {tab === "pending" ? "No pending submissions." : "No reviewed submissions yet."}
          </div>
        ) : (
          <div className="space-y-3">
            {active.map((s) => (
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
      </div>
    </main>
  );
}
