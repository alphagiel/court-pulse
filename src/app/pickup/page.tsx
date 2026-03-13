"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import {
  useUserLocation,
  useParkActivity,
  buildParkActivities,
} from "@/lib/hooks";
import { ParkCard } from "@/components/park-card";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import type { Park } from "@/types/database";
import { Loader } from "@/components/loader";

function formatHourLabel(targetTime: string | null): string {
  if (!targetTime) return "Now";
  const date = new Date(targetTime);
  const h = date.getHours();
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  return h > 12 ? `${h - 12} PM` : `${h} AM`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function getAvailableHours(): { label: string; value: string | null }[] {
  const now = new Date();
  const currentHour = now.getHours();
  const closingHour = 21;

  const slots: { label: string; value: string | null }[] = [
    { label: "Now", value: null },
  ];

  for (let h = currentHour + 1; h <= closingHour; h++) {
    const date = new Date();
    date.setHours(h, 0, 0, 0);
    const label =
      h === 0
        ? "12 AM"
        : h === 12
          ? "12 PM"
          : h > 12
            ? `${h - 12} PM`
            : `${h} AM`;
    slots.push({ label, value: date.toISOString() });
  }

  return slots;
}

export default function PickupPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { location, error: locationError } = useUserLocation();
  const { parks, checkIns, intents, playerProfiles, loading } = useParkActivity();
  const [intentActive, setIntentActive] = useState(false);
  const [intentExpiresAt, setIntentExpiresAt] = useState<string | null>(null);
  const [intentTargetLabel, setIntentTargetLabel] = useState<string | null>(
    null,
  );
  const [intentParkId, setIntentParkId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [paddleLoading, setPaddleLoading] = useState<string | null>(null);
  const [userCheckIns, setUserCheckIns] = useState<Record<string, string>>({});

  // Modal state
  const [modalParkId, setModalParkId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    } else if (!authLoading && user && !profile) {
      router.replace("/setup");
    }
  }, [authLoading, user, profile, router]);

  const userId = user?.id ?? "";
  const skillLevel = profile?.skill_level ?? "3.5";

  const parkActivitiesBase = buildParkActivities(
    parks,
    checkIns,
    intents,
    location,
  );

  const parkActivities = useMemo(() => {
    if (!intentParkId) return parkActivitiesBase;
    return [
      ...parkActivitiesBase.filter((a) => a.park.id === intentParkId),
      ...parkActivitiesBase.filter((a) => a.park.id !== intentParkId),
    ];
  }, [parkActivitiesBase, intentParkId]);

  const syncUserState = useCallback(() => {
    if (!userId) return;
    const now = new Date().toISOString();

    const activeIntent = intents.find(
      (i) => i.user_id === userId && i.expires_at > now,
    );
    setIntentActive(!!activeIntent);
    setIntentExpiresAt(activeIntent?.expires_at || null);
    setIntentTargetLabel(
      activeIntent ? formatHourLabel(activeIntent.target_time) : null,
    );
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

  const createIntent = async (parkId: string, targetTime: string | null) => {
    await supabase.from("intents").delete().eq("user_id", userId);

    let expiresAt: string;
    if (targetTime) {
      expiresAt = new Date(
        new Date(targetTime).getTime() + 60 * 60 * 1000,
      ).toISOString();
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

  const handleImGoing = async (parkId: string, targetTime: string | null) => {
    setActionLoading(true);
    try {
      await createIntent(parkId, targetTime);
      setModalParkId(null);
    } catch (err) {
      console.error("Intent error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelIntent = async () => {
    setActionLoading(true);
    try {
      await supabase.from("intents").delete().eq("user_id", userId);
      await supabase.from("check_ins").delete().eq("user_id", userId);

      setIntentActive(false);
      setIntentExpiresAt(null);
      setIntentTargetLabel(null);
      setIntentParkId(null);
      setUserCheckIns({});
      setModalParkId(null);
    } catch (err) {
      console.error("Cancel intent error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePaddleDown = async (parkId: string) => {
    setPaddleLoading(parkId);
    try {
      await supabase
        .from("check_ins")
        .delete()
        .eq("user_id", userId)
        .eq("park_id", parkId);
      const expiresAt = new Date(
        Date.now() + 2 * 60 * 60 * 1000,
      ).toISOString();
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

  if (authLoading || !user || !profile) {
    return <Loader />;
  }

  const intentParkName = intentParkId
    ? parks.find((p) => p.id === intentParkId)?.name || null
    : null;

  const modalPark = modalParkId
    ? parks.find((p) => p.id === modalParkId) || null
    : null;

  const modalActivity = modalParkId
    ? parkActivities.find((a) => a.park.id === modalParkId) || null
    : null;

  const isModalParkUserGoing = intentActive && intentParkId === modalParkId;
  const isModalParkCheckedIn = modalParkId
    ? modalParkId in userCheckIns
    : false;

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8 sm:px-6 space-y-6">
        <AppHeader
          title="Pickup"
          subtitle="Find players, hit the courts"
          backHref="/"
        />

        {locationError && (
          <p className="text-[13px] text-amber-600 text-center">
            {locationError}
          </p>
        )}

        <p className="text-[13px] text-muted-foreground text-center">
          Tap a court to signal you&apos;re down to play.
        </p>

        {/* Active intent banner */}
        {intentActive && intentParkName && (
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-300 dark:border-green-800 rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-green-700 dark:text-green-400">
                You&apos;re going to {intentParkName}
              </p>
              <p className="text-[11px] text-green-600/80 dark:text-green-500/80">
                {intentTargetLabel || "Now"} &middot; Until{" "}
                {intentExpiresAt
                  ? formatTime(new Date(intentExpiresAt))
                  : "..."}
              </p>
            </div>
            <button
              onClick={handleCancelIntent}
              disabled={actionLoading}
              className="text-[12px] text-green-600 dark:text-green-400 hover:text-red-600 dark:hover:text-red-400 font-medium transition-colors px-2 py-1"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Court cards — 2-col grid */}
        <div>
          <h2 className="text-[16px] font-semibold mb-3">Nearby Courts</h2>

          {loading ? (
            <Loader variant="inline" />
          ) : parkActivities.length === 0 ? (
            <div className="text-center py-12 text-[14px] text-muted-foreground">
              No courts found. Check back soon!
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {parkActivities.map((activity) => (
                <ParkCard
                  key={activity.park.id}
                  activity={activity}
                  onTap={setModalParkId}
                  isUserGoing={
                    intentActive && intentParkId === activity.park.id
                  }
                  userCheckedIn={activity.park.id in userCheckIns}
                  playerProfiles={playerProfiles}
                />
              ))}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
            <span>Here now</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" />
            <span>Going</span>
          </div>
        </div>
      </div>

      {/* Court modal — centered popup */}
      {modalPark && (
        <CourtModal
          park={modalPark}
          activity={modalActivity}
          isUserGoing={isModalParkUserGoing}
          isCheckedIn={isModalParkCheckedIn}
          checkInExpiresAt={
            modalParkId ? userCheckIns[modalParkId] || null : null
          }
          intentTargetLabel={isModalParkUserGoing ? intentTargetLabel : null}
          intentExpiresAt={isModalParkUserGoing ? intentExpiresAt : null}
          actionLoading={actionLoading}
          paddleLoading={paddleLoading === modalParkId}
          onImGoing={handleImGoing}
          onCancel={handleCancelIntent}
          onCheckIn={handlePaddleDown}
          onClose={() => setModalParkId(null)}
        />
      )}
    </main>
  );
}

// --------------- Court Modal (centered) ---------------

function CourtModal({
  park,
  activity,
  isUserGoing,
  isCheckedIn,
  checkInExpiresAt,
  intentTargetLabel,
  intentExpiresAt,
  actionLoading,
  paddleLoading,
  onImGoing,
  onCancel,
  onCheckIn,
  onClose,
}: {
  park: Park;
  activity: ReturnType<typeof buildParkActivities>[number] | null;
  isUserGoing: boolean;
  isCheckedIn: boolean;
  checkInExpiresAt: string | null;
  intentTargetLabel: string | null;
  intentExpiresAt: string | null;
  actionLoading: boolean;
  paddleLoading: boolean;
  onImGoing: (parkId: string, targetTime: string | null) => void;
  onCancel: () => void;
  onCheckIn: (parkId: string) => void;
  onClose: () => void;
}) {
  const availableHours = useMemo(() => getAvailableHours(), []);
  const checkOutTime = checkInExpiresAt
    ? formatTime(new Date(checkInExpiresAt))
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-background w-full max-w-md rounded-2xl shadow-2xl animate-in zoom-in-95 fade-in duration-200 max-h-[80vh] overflow-y-auto">
        <div className="px-5 py-5 space-y-5">
          {/* Close button */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[18px] font-bold">{park.name}</h2>
                {park.court_count > 0 && (
                  <span className="text-[12px] text-muted-foreground">
                    {park.court_count} courts
                  </span>
                )}
              </div>
              <p className="text-[13px] text-muted-foreground mt-0.5">
                {park.address || "Location pending"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 -mr-1 -mt-1"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Activity summary */}
          {activity &&
            (activity.totalPlayers > 0 || activity.totalInterested > 0) && (
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
                  <span className="text-[13px]">
                    <span className="font-semibold">
                      {activity.totalPlayers}
                    </span>{" "}
                    <span className="text-muted-foreground">here</span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" />
                  <span className="text-[13px]">
                    <span className="font-semibold">
                      {activity.totalInterested}
                    </span>{" "}
                    <span className="text-muted-foreground">going</span>
                  </span>
                </div>
              </div>
            )}

          <div className="border-t border-border/40" />

          {/* Action area */}
          {isUserGoing ? (
            <div className="space-y-3">
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-300 dark:border-green-800 rounded-xl px-4 py-3 text-center">
                <p className="text-[14px] font-semibold text-green-700 dark:text-green-400">
                  You&apos;re going!
                </p>
                <p className="text-[12px] text-green-600/80 dark:text-green-500/80 mt-0.5">
                  {intentTargetLabel || "Now"} &middot; Until{" "}
                  {intentExpiresAt
                    ? formatTime(new Date(intentExpiresAt))
                    : "..."}
                </p>
              </div>

              {isCheckedIn ? (
                <Button
                  size="lg"
                  disabled
                  className="w-full py-5 rounded-xl bg-green-600/80 text-white flex flex-col items-center gap-0.5 opacity-90 cursor-default h-auto"
                >
                  <span className="text-[15px] font-semibold">
                    You&apos;re Here
                  </span>
                  {checkOutTime && (
                    <span className="text-[11px] font-normal opacity-80">
                      Auto check-out at {checkOutTime}
                    </span>
                  )}
                </Button>
              ) : (
                <Button
                  size="lg"
                  className="w-full py-5 rounded-xl bg-green-600 hover:bg-green-700 text-white h-auto"
                  onClick={() => onCheckIn(park.id)}
                  disabled={paddleLoading}
                >
                  <span className="text-[15px] font-semibold">
                    {paddleLoading ? "Checking in..." : "I'm Here"}
                  </span>
                </Button>
              )}

              <div className="flex gap-2.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-10 text-[13px] font-medium"
                  onClick={onCancel}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-10 text-[13px] font-medium"
                  onClick={() =>
                    window.open(
                      `https://www.google.com/maps/dir/?api=1&destination=${park.lat},${park.lng}`,
                      "_blank",
                    )
                  }
                >
                  Directions
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[13px] text-muted-foreground text-center">
                When are you going?
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {availableHours.map((slot) => (
                  <button
                    key={slot.label}
                    onClick={() => onImGoing(park.id, slot.value)}
                    disabled={actionLoading}
                    className="shrink-0 px-4 py-2.5 rounded-xl border border-border/50 bg-background text-[13px] font-medium hover:bg-green-50 hover:border-green-400 hover:text-green-700 transition-colors active:scale-95"
                  >
                    {slot.label}
                  </button>
                ))}
              </div>

              <Button
                size="sm"
                variant="outline"
                className="w-full h-10 text-[13px] font-medium"
                onClick={() =>
                  window.open(
                    `https://www.google.com/maps/dir/?api=1&destination=${park.lat},${park.lng}`,
                    "_blank",
                  )
                }
              >
                Directions
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
