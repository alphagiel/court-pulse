"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useUserLocation, useParkActivity, buildParkActivities } from "@/lib/hooks";
import { LetsPlayButton } from "@/components/lets-play-button";
import { ParkCard } from "@/components/park-card";

function formatHourLabel(targetTime: string | null): string {
  if (!targetTime) return "Now";
  const date = new Date(targetTime);
  const h = date.getHours();
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  return h > 12 ? `${h - 12} PM` : `${h} AM`;
}

export default function Home() {
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const { location, error: locationError } = useUserLocation();
  const { parks, checkIns, intents, loading } = useParkActivity();
  const [intentActive, setIntentActive] = useState(false);
  const [intentExpiresAt, setIntentExpiresAt] = useState<string | null>(null);
  const [intentTargetLabel, setIntentTargetLabel] = useState<string | null>(null);
  const [intentParkId, setIntentParkId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [paddleLoading, setPaddleLoading] = useState<string | null>(null);
  const [allExpanded, setAllExpanded] = useState<boolean | null>(null);
  const [userCheckIns, setUserCheckIns] = useState<Record<string, string>>({}); // parkId -> expiresAt

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    } else if (!authLoading && user && !profile) {
      router.replace("/setup");
    }
  }, [authLoading, user, profile, router]);

  const userId = user?.id ?? "";
  const skillLevel = profile?.skill_level ?? "3.5";

  const parkActivitiesBase = buildParkActivities(parks, checkIns, intents, location);

  // Bubble the user's intent park to the top
  const parkActivities = useMemo(() => {
    if (!intentParkId) return parkActivitiesBase;
    return [
      ...parkActivitiesBase.filter((a) => a.park.id === intentParkId),
      ...parkActivitiesBase.filter((a) => a.park.id !== intentParkId),
    ];
  }, [parkActivitiesBase, intentParkId]);

  // Sync intent state from DB on load
  const syncUserState = useCallback(() => {
    if (!userId) return;
    const now = new Date().toISOString();

    const activeIntent = intents.find(
      (i) => i.user_id === userId && i.expires_at > now
    );
    setIntentActive(!!activeIntent);
    setIntentExpiresAt(activeIntent?.expires_at || null);
    setIntentTargetLabel(activeIntent ? formatHourLabel(activeIntent.target_time) : null);
    setIntentParkId(activeIntent?.park_id || null);

    const activeCheckIns: Record<string, string> = {};
    for (const ci of checkIns) {
      if (ci.user_id === userId && ci.expires_at > now) {
        activeCheckIns[ci.park_id] = ci.expires_at;
      }
    }
    setUserCheckIns(activeCheckIns);
  }, [intents, checkIns, userId]);

  useEffect(() => {
    syncUserState();
  }, [syncUserState]);

  // Auto-clear expired states
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().toISOString();
      if (intentExpiresAt && intentExpiresAt <= now) {
        setIntentActive(false);
        setIntentExpiresAt(null);
        setIntentTargetLabel(null);
        setIntentParkId(null);
      }
      setUserCheckIns((prev) => {
        const updated: Record<string, string> = {};
        for (const [parkId, expiresAt] of Object.entries(prev)) {
          if (expiresAt > now) updated[parkId] = expiresAt;
        }
        return updated;
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [intentExpiresAt]);

  // Create or update intent for a specific park
  const createIntent = async (parkId: string, targetTime: string | null) => {
    // Delete any existing intent (upsert)
    await supabase.from("intents").delete().eq("user_id", userId);

    let expiresAt: string;
    if (targetTime) {
      expiresAt = new Date(new Date(targetTime).getTime() + 60 * 60 * 1000).toISOString();
    } else {
      expiresAt = new Date(Date.now() + 90 * 60 * 1000).toISOString();
    }

    await supabase.from("intents").insert({
      user_id: userId,
      park_id: parkId,
      skill_level: skillLevel,
      target_time: targetTime,
      expires_at: expiresAt,
    });

    setIntentActive(true);
    setIntentExpiresAt(expiresAt);
    setIntentTargetLabel(formatHourLabel(targetTime));
    setIntentParkId(parkId);
  };

  const handleDownToPlay = async (parkId: string, targetTime: string | null) => {
    if (!parks.length) return;
    setActionLoading(true);
    try {
      await createIntent(parkId, targetTime);
    } catch (err) {
      console.error("Intent error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelIntent = async () => {
    setActionLoading(true);
    try {
      // Cancel intent
      await supabase.from("intents").delete().eq("user_id", userId);

      // Also paddle up from all parks
      await supabase.from("check_ins").delete().eq("user_id", userId);

      setIntentActive(false);
      setIntentExpiresAt(null);
      setIntentTargetLabel(null);
      setIntentParkId(null);
      setUserCheckIns({});
    } catch (err) {
      console.error("Cancel intent error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePaddleDown = async (parkId: string) => {
    setPaddleLoading(parkId);
    try {
      // Create check-in
      await supabase.from("check_ins").delete().eq("user_id", userId).eq("park_id", parkId);
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      await supabase.from("check_ins").insert({
        user_id: userId,
        park_id: parkId,
        skill_level: skillLevel,
        player_count: 1,
        expires_at: expiresAt,
      });
      setUserCheckIns((prev) => ({ ...prev, [parkId]: expiresAt }));
    } catch (err) {
      console.error("Paddle down error:", err);
    } finally {
      setPaddleLoading(null);
    }
  };

  const handlePaddleUp = async (parkId: string) => {
    setPaddleLoading(parkId);
    try {
      await supabase.from("check_ins").delete().eq("user_id", userId).eq("park_id", parkId);
      setUserCheckIns((prev) => {
        const updated = { ...prev };
        delete updated[parkId];
        return updated;
      });
    } catch (err) {
      console.error("Paddle up error:", err);
    } finally {
      setPaddleLoading(null);
    }
  };

  if (authLoading || !user || !profile) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-[14px] text-muted-foreground">Loading...</p>
      </main>
    );
  }

  const intentParkName = intentParkId
    ? parks.find((p) => p.id === intentParkId)?.name || null
    : null;

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-5 py-8 sm:px-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-1 relative">
          <button
            onClick={signOut}
            className="absolute right-0 top-0 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign out
          </button>
          <h1 className="text-[27px] font-bold tracking-[0.5px]">Court Pulse</h1>
          <p className="text-[14px] text-muted-foreground">
            {profile.username} &middot; {profile.skill_level}
          </p>
          <button
            onClick={() => router.push("/ladder")}
            className="absolute left-0 top-0 text-[13px] text-green-700 font-medium border border-green-200 bg-green-50 rounded-full px-3 py-1 hover:bg-green-100 transition-colors"
          >
            Ladder &rarr;
          </button>
        </div>

        {locationError && (
          <p className="text-[13px] text-amber-600 text-center">{locationError}</p>
        )}

        {/* I'm Down to Play Button */}
        <LetsPlayButton
          onPress={handleDownToPlay}
          onCancel={handleCancelIntent}
          isActive={intentActive}
          loading={actionLoading}
          activeTargetLabel={intentTargetLabel}
          activeParkName={intentParkName}
          expiresAt={intentExpiresAt}
          parks={parks}
        />

        {/* Dashboard */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-semibold">Nearby Courts</h2>
            {parkActivities.length > 0 && (
              <button
                onClick={() => setAllExpanded((prev) => (prev === null ? true : !prev))}
                className="text-[12px] text-muted-foreground hover:text-foreground transition-colors"
              >
                {allExpanded ? "Collapse all" : "Expand all"}
              </button>
            )}
          </div>

          {loading ? (
            <div className="text-center py-12 text-[14px] text-muted-foreground">
              Loading courts...
            </div>
          ) : parkActivities.length === 0 ? (
            <div className="text-center py-12 text-[14px] text-muted-foreground">
              No courts found. Check back soon!
            </div>
          ) : (
            <div className="space-y-2.5">
              {parkActivities.map((activity) => (
                <ParkCard
                  key={activity.park.id}
                  activity={activity}
                  onPaddleDown={handlePaddleDown}
                  paddleLoading={paddleLoading === activity.park.id}
                  userCheckedIn={activity.park.id in userCheckIns}
                  checkInExpiresAt={userCheckIns[activity.park.id] || null}
                  canCheckIn={intentActive && intentParkId === activity.park.id}
                  expandOverride={allExpanded}
                  defaultExpanded={
                    intentParkId === activity.park.id ||
                    activity.totalPlayers > 0 ||
                    activity.park.id in userCheckIns
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
