"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getDistanceMiles, getCurrentPosition } from "@/lib/geo";
import type { Park, CheckIn, Intent, ParkActivity, IntentGroup, IntentTimeBuckets, SkillLevel } from "@/types/database";

const SKILL_LEVELS: SkillLevel[] = ["2.5", "3.0", "3.5", "4.0", "4.5", "5.0"];

function formatHour(date: Date): string {
  const h = date.getHours();
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  return h > 12 ? `${h - 12} PM` : `${h} AM`;
}

function buildIntentGroups(intents: Intent[]): IntentGroup[] {
  const groups: Record<string, number> = {};

  for (const intent of intents) {
    if (intent.target_time) {
      const targetDate = new Date(intent.target_time);
      const label = formatHour(targetDate);
      groups[label] = (groups[label] || 0) + 1;
    } else {
      groups["Now"] = (groups["Now"] || 0) + 1;
    }
  }

  // Sort: "Now" first, then by time
  const entries = Object.entries(groups).map(([label, count]) => ({ label, count }));
  entries.sort((a, b) => {
    if (a.label === "Now") return -1;
    if (b.label === "Now") return 1;
    return 0; // keep insertion order for hours (already chronological from DB)
  });

  return entries;
}

function buildIntentTimeBuckets(intents: Intent[]): IntentTimeBuckets {
  const buckets: IntentTimeBuckets = { morning: 0, afternoon: 0, evening: 0 };

  for (const intent of intents) {
    let hour: number;
    if (intent.target_time) {
      hour = new Date(intent.target_time).getHours();
    } else {
      // "Now" — use current hour
      hour = new Date().getHours();
    }

    if (hour < 12) {
      buckets.morning++;
    } else if (hour < 17) {
      buckets.afternoon++;
    } else {
      buckets.evening++;
    }
  }

  return buckets;
}

function buildSkillBreakdown(checkIns: CheckIn[]): Record<SkillLevel, number> {
  const breakdown = Object.fromEntries(SKILL_LEVELS.map((s) => [s, 0])) as Record<SkillLevel, number>;
  for (const ci of checkIns) {
    if (ci.skill_level in breakdown) {
      breakdown[ci.skill_level as SkillLevel] += ci.player_count;
    }
  }
  return breakdown;
}

export function useUserLocation() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCurrentPosition()
      .then((pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }))
      .catch(() => setError("Location access denied. Distances won't be shown."));
  }, []);

  return { location, error };
}

export function useParkActivity() {
  const [parks, setParks] = useState<Park[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [intents, setIntents] = useState<Intent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const now = new Date().toISOString();

    const [parksRes, checkInsRes, intentsRes] = await Promise.all([
      supabase.from("parks").select("*").order("name"),
      supabase.from("check_ins").select("*").gte("expires_at", now),
      supabase.from("intents").select("*").gte("expires_at", now),
    ]);

    if (parksRes.data) setParks(parksRes.data);
    if (checkInsRes.data) setCheckIns(checkInsRes.data);
    if (intentsRes.data) setIntents(intentsRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();

    // Realtime subscriptions
    const checkInChannel = supabase
      .channel("check_ins_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "check_ins" }, () => {
        fetchAll();
      })
      .subscribe();

    const intentChannel = supabase
      .channel("intents_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "intents" }, () => {
        fetchAll();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(checkInChannel);
      supabase.removeChannel(intentChannel);
    };
  }, [fetchAll]);

  return { parks, checkIns, intents, loading, refetch: fetchAll };
}

export function buildParkActivities(
  parks: Park[],
  checkIns: CheckIn[],
  intents: Intent[],
  userLocation: { lat: number; lng: number } | null
): ParkActivity[] {
  return parks
    .map((park) => {
      const parkCheckIns = checkIns.filter((ci) => ci.park_id === park.id);
      const parkIntents = intents.filter((i) => i.park_id === park.id);

      const totalPlayers = parkCheckIns.reduce((sum, ci) => sum + ci.player_count, 0);
      const totalInterested = parkIntents.length;

      const allTimes = [
        ...parkCheckIns.map((ci) => ci.created_at),
        ...parkIntents.map((i) => i.created_at),
      ];
      const lastActivity = allTimes.length > 0
        ? allTimes.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
        : null;

      const distanceMiles = userLocation
        ? getDistanceMiles(userLocation.lat, userLocation.lng, park.lat, park.lng)
        : null;

      return {
        park,
        activeCheckIns: parkCheckIns,
        activeIntents: parkIntents,
        totalPlayers,
        totalInterested,
        intentGroups: buildIntentGroups(parkIntents),
        intentTimeBuckets: buildIntentTimeBuckets(parkIntents),
        skillBreakdown: buildSkillBreakdown(parkCheckIns),
        lastActivity,
        distanceMiles,
      };
    })
    .sort((a, b) => {
      // Active parks first, then by distance
      const aActive = a.totalPlayers + a.totalInterested;
      const bActive = b.totalPlayers + b.totalInterested;
      if (aActive > 0 && bActive === 0) return -1;
      if (bActive > 0 && aActive === 0) return 1;
      if (a.distanceMiles !== null && b.distanceMiles !== null) {
        return a.distanceMiles - b.distanceMiles;
      }
      return 0;
    });
}
