"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
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
import { Dropdown } from "@/components/dropdown";
import { theme } from "@/lib/theme";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { isTriangleZip } from "@/lib/geo";
import { LayoutGroup, motion } from "framer-motion";
import { useHourlyWeather, weatherIcon } from "@/lib/use-weather";

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
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
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
  const [sortMode, setSortMode] = useState<"closest" | "busiest">(location ? "closest" : "busiest");
  const [paddleLoading, setPaddleLoading] = useState<string | null>(null);
  const [userCheckIns, setUserCheckIns] = useState<Record<string, string>>({});

  // Zip code prompt state
  const [zipInput, setZipInput] = useState("");
  const [zipSaving, setZipSaving] = useState(false);
  const [zipError, setZipError] = useState<string | null>(null);

  // Modal state
  const [modalParkId, setModalParkId] = useState<string | null>(null);

  // Add court state
  const [showAddCourt, setShowAddCourt] = useState(false);
  const [courtSearch, setCourtSearch] = useState("");
  const [courtResults, setCourtResults] = useState<{ name: string; address: string }[]>([]);
  const [courtSearching, setCourtSearching] = useState(false);
  const [courtName, setCourtName] = useState("");
  const [courtAddress, setCourtAddress] = useState("");
  const [courtCount, setCourtCount] = useState("2");
  const [courtSubmitting, setCourtSubmitting] = useState(false);
  const [courtSubmitted, setCourtSubmitted] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const hasLocation = !!location;
  const [topN, setTopN] = useState(3);

  const parkActivities = useMemo(() => {
    const effectiveSort = !hasLocation ? "busiest" : sortMode;
    const sorted = [...parkActivitiesBase].sort((a, b) => {
      if (effectiveSort === "closest") {
        return (a.distanceMiles ?? 999) - (b.distanceMiles ?? 999);
      }
      return (b.totalPlayers + b.totalInterested) - (a.totalPlayers + a.totalInterested);
    });
    const top = sorted.slice(0, topN);
    // If user has an active intent park, make sure it's included at the top
    if (intentParkId && !top.some((a) => a.park.id === intentParkId)) {
      const intentPark = parkActivitiesBase.find((a) => a.park.id === intentParkId);
      if (intentPark) return [intentPark, ...top.slice(0, topN - 1)];
    }
    if (intentParkId) {
      return [
        ...top.filter((a) => a.park.id === intentParkId),
        ...top.filter((a) => a.park.id !== intentParkId),
      ];
    }
    return top;
  }, [parkActivitiesBase, intentParkId, sortMode, hasLocation, topN]);

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
    return <PickupSkeleton />;
  }

  // Zip code prompt for existing users
  if (!profile.zip_code) {
    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-lg mx-auto px-4 py-8 sm:px-6 space-y-8">
          <AppHeader
            title="Pickup"
            subtitle="Play now"
            backHref="/"
          />
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h2 className="text-[18px] font-semibold text-center">Add Your Zip Code</h2>
              <p className="text-[14px] text-muted-foreground text-center">
                To use pickup, please add your zip code. This helps us determine feature availability in your area.
              </p>
              <div className="space-y-2">
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 27601"
                  value={zipInput}
                  onChange={(e) => {
                    setZipInput(e.target.value.replace(/\D/g, "").slice(0, 5));
                    setZipError(null);
                  }}
                  maxLength={5}
                  className="h-11 text-[15px] text-center"
                  autoFocus
                />
                {zipError && (
                  <p className="text-[13px] text-red-600 text-center">{zipError}</p>
                )}
              </div>
              <Button
                className="w-full"
                disabled={zipSaving}
                onClick={async () => {
                  const trimmed = zipInput.trim();
                  if (!/^\d{5}$/.test(trimmed)) {
                    setZipError("Please enter a valid 5-digit zip code");
                    return;
                  }
                  setZipSaving(true);
                  setZipError(null);
                  await supabase
                    .from("profiles")
                    .update({ zip_code: trimmed })
                    .eq("id", user!.id);
                  await refreshProfile();
                  setZipSaving(false);
                }}
              >
                {zipSaving ? "Saving..." : "Save Zip Code"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const isOutsideTriangle = !!profile.zip_code && !isTriangleZip(profile.zip_code);

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
          subtitle={<>Tap <span className="text-green-700 dark:text-green-400 font-semibold border border-green-300 dark:border-green-700 rounded-full px-2 py-0.5">I&apos;m in</span> to signal you&apos;re down to play, or{" "}<button onClick={() => setShowAddCourt(true)} className="text-green-700 dark:text-green-400 font-medium underline">add a court</button>.</>}
          backHref="/"
        />

        {locationError && (
          <p className="text-[13px] text-amber-600 text-center">
            {locationError}
          </p>
        )}

        {isOutsideTriangle && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-4 text-center space-y-1">
            <p className="text-[13px] font-medium text-amber-800 dark:text-amber-300">
              Pickup is currently available for NC Triangle players. You&apos;re in view-only mode.
            </p>
            <p className="text-[12px] text-amber-700 dark:text-amber-400">
              Update your zip code in{" "}
              <button onClick={() => router.push("/settings")} className="underline font-medium">
                Settings
              </button>
            </p>
          </div>
        )}

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

        {/* Sort toggle + Court cards */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center bg-muted rounded-full p-1 gap-0.5">
              <Dropdown
                value={String(topN)}
                onChange={(v) => setTopN(parseInt(v))}
                options={[3, 5, 7, 10].map((n) => ({ value: String(n), label: `Top ${n}` }))}
                variant="compact"
              />
              {([
                { value: "closest" as const, label: "Closest", disabled: !hasLocation, icon: <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg> },
                { value: "busiest" as const, label: "Busiest", disabled: false, icon: <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
              ]).map((s) => {
                const active = (hasLocation ? sortMode : "busiest") === s.value;
                return (
                  <button
                    key={s.value}
                    onClick={() => !s.disabled && setSortMode(s.value)}
                    className={`relative flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded-full transition-colors ${
                      s.disabled && !active ? "text-muted-foreground/40 cursor-not-allowed" : ""
                    }`}
                  >
                    {active && (
                      <motion.div
                        layoutId="sort-mode-indicator"
                        className="absolute inset-0 rounded-full bg-green-600 shadow-sm"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className={`relative z-10 flex items-center gap-1.5 ${
                      active ? "text-white" : s.disabled ? "" : "text-muted-foreground hover:text-foreground"
                    }`}>
                      {s.icon}
                      {s.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
            </div>
          ) : parkActivities.length === 0 ? (
            <div className="text-center py-12 text-[14px] text-muted-foreground">
              No courts found. Check back soon!
            </div>
          ) : (
            <LayoutGroup>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {parkActivities.map((activity) => (
                  <motion.div
                    key={activity.park.id}
                    layout
                    layoutId={activity.park.id}
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  >
                    <ParkCard
                      activity={activity}
                      onTap={(parkId) => {
                        if (isOutsideTriangle) return;
                        setModalParkId(parkId);
                      }}
                      isUserGoing={
                        intentActive && intentParkId === activity.park.id
                      }
                      hasActiveIntent={intentActive}
                      userCheckedIn={activity.park.id in userCheckIns}
                      userId={userId}
                      playerProfiles={playerProfiles}
                    />
                  </motion.div>
                ))}
              </div>
            </LayoutGroup>
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
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            <span>You</span>
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

      {/* Add Court modal */}
      {showAddCourt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowAddCourt(false); setCourtName(""); setCourtAddress(""); setCourtSearch(""); setCourtResults([]); setCourtSubmitted(false); } }}
        >
          <div className="bg-background w-full max-w-md rounded-2xl shadow-2xl animate-in zoom-in-95 fade-in duration-200 max-h-[85vh] overflow-y-auto">
            <div className="px-5 py-5 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-[18px] font-bold">Add a Court</h2>
                  <p className="text-[13px] text-muted-foreground mt-0.5">
                    Know a court that could benefit from Court Pulse? Add it here.
                  </p>
                </div>
                <button
                  onClick={() => { setShowAddCourt(false); setCourtName(""); setCourtAddress(""); setCourtSearch(""); setCourtResults([]); setCourtSubmitted(false); }}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1 -mr-1 -mt-1"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>

              {courtSubmitted ? (
                /* Success state */
                <div className="text-center py-4 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-600"><path d="M20 6 9 17l-5-5"/></svg>
                  </div>
                  <p className="text-[15px] font-semibold">Court Submitted!</p>
                  <p className="text-[13px] text-muted-foreground">
                    Our team will review and add your court within 24–48 hours.
                  </p>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => { setCourtSubmitted(false); setCourtName(""); setCourtAddress(""); setCourtSearch(""); }}
                      className="flex-1 text-[13px] font-medium py-2 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    >
                      Submit Another
                    </button>
                    <button
                      onClick={() => { setShowAddCourt(false); setCourtSubmitted(false); setCourtName(""); setCourtAddress(""); setCourtSearch(""); setCourtResults([]); }}
                      className={`flex-1 text-[13px] font-medium py-2 rounded-lg ${theme.ladder.button}`}
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : !courtName ? (
                /* Search step */
                <div className="space-y-2">
                  <label className="text-[13px] font-medium">Search for the park</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={courtSearch}
                      onChange={(e) => {
                        const q = e.target.value;
                        setCourtSearch(q);
                        if (searchTimeout.current) clearTimeout(searchTimeout.current);
                        if (q.trim().length < 3) { setCourtResults([]); return; }
                        setCourtSearching(true);
                        searchTimeout.current = setTimeout(async () => {
                          try {
                            const res = await fetch(
                              `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q + " park")}&format=json&addressdetails=1&limit=5&countrycodes=us`
                            );
                            const data = await res.json();
                            setCourtResults(
                              data.map((r: { display_name: string; name: string }) => ({
                                name: r.name || r.display_name.split(",")[0],
                                address: r.display_name,
                              }))
                            );
                          } catch {
                            setCourtResults([]);
                          } finally {
                            setCourtSearching(false);
                          }
                        }, 600);
                      }}
                      placeholder="e.g. Millbrook Exchange Park, Raleigh"
                      className="w-full rounded-md border border-input bg-background px-3 py-2.5 pr-10 text-[15px] focus:outline-none focus:ring-2 focus:ring-ring"
                      autoFocus
                    />
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {courtSearching ? (
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeDasharray="30" strokeDashoffset="10"/></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                      )}
                    </div>
                  </div>

                  {courtResults.length > 0 && (
                    <div className="border border-border rounded-lg overflow-hidden">
                      {courtResults.map((r, i) => (
                        <button
                          key={i}
                          onClick={() => { setCourtName(r.name); setCourtAddress(r.address); setCourtResults([]); setCourtSearch(""); }}
                          className="w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-b-0"
                        >
                          <p className="text-[13px] font-medium truncate">{r.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{r.address}</p>
                        </button>
                      ))}
                    </div>
                  )}

                  {courtSearch.trim().length >= 3 && !courtSearching && courtResults.length === 0 && (
                    <p className="text-[12px] text-muted-foreground text-center py-2">
                      No results found. Try a different search.
                    </p>
                  )}

                  <div className="text-center pt-1">
                    <button
                      onClick={() => { setCourtName(courtSearch.trim() || "Unknown"); setCourtAddress(""); }}
                      className="text-[12px] text-muted-foreground hover:text-foreground underline"
                    >
                      Can&apos;t find it? Enter manually
                    </button>
                  </div>
                </div>
              ) : (
                /* Confirm + details step */
                <div className="space-y-3">
                  <div className="bg-muted/40 rounded-lg px-3 py-2.5 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium truncate">{courtName}</p>
                      {courtAddress && <p className="text-[11px] text-muted-foreground truncate">{courtAddress}</p>}
                    </div>
                    <button
                      onClick={() => { setCourtName(""); setCourtAddress(""); }}
                      className="text-[11px] text-muted-foreground hover:text-foreground shrink-0 underline"
                    >
                      Change
                    </button>
                  </div>

                  {!courtAddress && (
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-medium">Address</label>
                      <input
                        type="text"
                        value={courtAddress}
                        onChange={(e) => setCourtAddress(e.target.value)}
                        placeholder="e.g. 1905 Spring Forest Rd, Raleigh, NC"
                        maxLength={200}
                        className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium">Number of Courts</label>
                    <Dropdown
                      value={courtCount}
                      onChange={setCourtCount}
                      options={[1, 2, 3, 4, 5, 6, 7, 8, 10, 12].map((n) => ({ value: String(n), label: String(n) }))}
                      placeholder="Select..."
                    />
                  </div>

                  <p className="text-[11px] text-muted-foreground text-center">
                    Our team will review and add your court within 24–48 hours.
                  </p>

                  <Button
                    onClick={async () => {
                      if (!courtName.trim() || !courtAddress.trim() || !userId) return;
                      setCourtSubmitting(true);
                      try {
                        await supabase.from("park_submissions").insert({
                          submitted_by: userId,
                          name: courtName.trim(),
                          address: courtAddress.trim(),
                          court_count: parseInt(courtCount),
                        });
                        setCourtName("");
                        setCourtAddress("");
                        setCourtCount("2");
                        setCourtSubmitted(true);
                      } catch (err) {
                        console.error("Submit court error:", err);
                      } finally {
                        setCourtSubmitting(false);
                      }
                    }}
                    disabled={!courtName.trim() || !courtAddress.trim() || courtSubmitting}
                    className={`w-full ${theme.ladder.button}`}
                  >
                    {courtSubmitting ? "Submitting..." : "Submit Court"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
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
  const todayStr = new Date().toISOString().split("T")[0];
  const hourly = useHourlyWeather(todayStr, true, park.lat, park.lng);
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
                {availableHours.map((slot) => {
                  // For "Now", use current hour; for others, parse the ISO time
                  const hour = slot.value
                    ? new Date(slot.value).getHours()
                    : new Date().getHours();
                  const hourKey = `${String(hour).padStart(2, "0")}:00`;
                  const forecast = hourly.get(hourKey);

                  return (
                    <button
                      key={slot.label}
                      onClick={() => onImGoing(park.id, slot.value)}
                      disabled={actionLoading}
                      className="shrink-0 flex flex-col items-center gap-1 px-4 py-2.5 rounded-xl border border-border/50 bg-background text-[13px] font-medium hover:bg-green-50 hover:border-green-400 hover:text-green-700 transition-colors active:scale-95"
                    >
                      <span>{slot.label}</span>
                      {forecast && (
                        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                          <span>{weatherIcon(forecast.weatherCode)}</span>
                          <span>{forecast.temp}°</span>
                        </span>
                      )}
                    </button>
                  );
                })}
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

// --------------- Skeleton Components ---------------

function Shimmer({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className || ""}`} />;
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Shimmer className="h-5 w-28" />
        <Shimmer className="h-4 w-12 rounded-full" />
      </div>
      <Shimmer className="h-3 w-36" />
      <div className="flex gap-2 pt-1">
        <Shimmer className="h-6 w-14 rounded-full" />
        <Shimmer className="h-6 w-14 rounded-full" />
      </div>
    </div>
  );
}

function PickupSkeleton() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8 sm:px-6 space-y-6">
        {/* Header skeleton */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Shimmer className="h-7 w-16 rounded-full" />
            <div className="flex items-center gap-1.5">
              <Shimmer className="h-4 w-12" />
              <Shimmer className="h-8 w-8 rounded-full" />
            </div>
          </div>
          <div className="text-center space-y-1.5">
            <Shimmer className="h-6 w-24 mx-auto" />
            <Shimmer className="h-4 w-56 mx-auto" />
          </div>
        </div>

        {/* Sort toggle skeleton */}
        <Shimmer className="h-10 w-64 rounded-full" />

        {/* Card grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>

        {/* Legend skeleton */}
        <div className="flex items-center justify-center gap-4">
          <Shimmer className="h-3 w-16" />
          <Shimmer className="h-3 w-12" />
        </div>
      </div>
    </main>
  );
}
