"use client";

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
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
  const { location, error: locationError } = useUserLocation();
  const { parks, checkIns, intents, loading } = useParkActivity();
  const [intentActive, setIntentActive] = useState(false);
  const [intentExpiresAt, setIntentExpiresAt] = useState<string | null>(null);
  const [intentTargetLabel, setIntentTargetLabel] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [paddleLoading, setPaddleLoading] = useState<string | null>(null);
  const [userCheckIns, setUserCheckIns] = useState<Record<string, string>>({}); // parkId -> expiresAt

  // TODO: Replace with real auth user
  const mockUserId = "demo-user";
  const mockSkillLevel = "3.5";

  const parkActivities = buildParkActivities(parks, checkIns, intents, location);

  // Sync intent state from DB on load
  const syncUserState = useCallback(() => {
    const now = new Date().toISOString();

    const activeIntent = intents.find(
      (i) => i.user_id === mockUserId && i.expires_at > now
    );
    setIntentActive(!!activeIntent);
    setIntentExpiresAt(activeIntent?.expires_at || null);
    setIntentTargetLabel(activeIntent ? formatHourLabel(activeIntent.target_time) : null);

    const activeCheckIns: Record<string, string> = {};
    for (const ci of checkIns) {
      if (ci.user_id === mockUserId && ci.expires_at > now) {
        activeCheckIns[ci.park_id] = ci.expires_at;
      }
    }
    setUserCheckIns(activeCheckIns);
  }, [intents, checkIns]);

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

  const handleDownToPlay = async (targetTime: string | null) => {
    if (!parks.length) return;
    setActionLoading(true);

    try {
      // Delete any existing intent (upsert)
      await supabase.from("intents").delete().eq("user_id", mockUserId);

      const targetPark = parkActivities[0]?.park;
      if (!targetPark) return;

      // Expire at the target hour + 1h, or 90 min from now if "Now"
      let expiresAt: string;
      if (targetTime) {
        expiresAt = new Date(new Date(targetTime).getTime() + 60 * 60 * 1000).toISOString();
      } else {
        expiresAt = new Date(Date.now() + 90 * 60 * 1000).toISOString();
      }

      await supabase.from("intents").insert({
        user_id: mockUserId,
        park_id: targetPark.id,
        skill_level: mockSkillLevel,
        target_time: targetTime,
        expires_at: expiresAt,
      });
      setIntentActive(true);
      setIntentExpiresAt(expiresAt);
      setIntentTargetLabel(formatHourLabel(targetTime));
    } catch (err) {
      console.error("Intent error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelIntent = async () => {
    setActionLoading(true);
    try {
      await supabase.from("intents").delete().eq("user_id", mockUserId);
      setIntentActive(false);
      setIntentExpiresAt(null);
      setIntentTargetLabel(null);
    } catch (err) {
      console.error("Cancel intent error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePaddleDown = async (parkId: string) => {
    setPaddleLoading(parkId);
    try {
      await supabase.from("check_ins").delete().eq("user_id", mockUserId).eq("park_id", parkId);

      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      await supabase.from("check_ins").insert({
        user_id: mockUserId,
        park_id: parkId,
        skill_level: mockSkillLevel,
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
      await supabase.from("check_ins").delete().eq("user_id", mockUserId).eq("park_id", parkId);
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

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-5 py-8 sm:px-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-[27px] font-bold tracking-[0.5px]">Court Pulse</h1>
          <p className="text-[14px] text-muted-foreground">
            Pickup Pickleball, Live
          </p>
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
          expiresAt={intentExpiresAt}
        />

        {/* Dashboard */}
        <div className="space-y-4">
          <h2 className="text-[16px] font-semibold">Nearby Courts</h2>

          {loading ? (
            <div className="text-center py-12 text-[14px] text-muted-foreground">
              Loading courts...
            </div>
          ) : parkActivities.length === 0 ? (
            <div className="text-center py-12 text-[14px] text-muted-foreground">
              No courts found. Check back soon!
            </div>
          ) : (
            <div className="space-y-4">
              {parkActivities.map((activity) => (
                <ParkCard
                  key={activity.park.id}
                  activity={activity}
                  onPaddleDown={handlePaddleDown}
                  onPaddleUp={handlePaddleUp}
                  paddleLoading={paddleLoading === activity.park.id}
                  userCheckedIn={activity.park.id in userCheckIns}
                  checkInExpiresAt={userCheckIns[activity.park.id] || null}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
