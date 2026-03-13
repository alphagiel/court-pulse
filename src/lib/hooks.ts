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
  const groups: Record<string, { count: number; skillLevels: Set<string> }> = {};

  for (const intent of intents) {
    const label = intent.target_time
      ? formatHour(new Date(intent.target_time))
      : "Now";
    if (!groups[label]) {
      groups[label] = { count: 0, skillLevels: new Set() };
    }
    groups[label].count++;
    if (intent.skill_level) {
      groups[label].skillLevels.add(intent.skill_level);
    }
  }

  // Sort: "Now" first, then by time
  const entries = Object.entries(groups).map(([label, { count, skillLevels }]) => {
    const sorted = [...skillLevels].sort((a, b) => parseFloat(a) - parseFloat(b));
    const levels = sorted.length === 0
      ? "–"
      : sorted.length === 1
        ? sorted[0]
        : `${sorted[0]}–${sorted[sorted.length - 1]}`;
    return { label, count, levels };
  });
  entries.sort((a, b) => {
    if (a.label === "Now") return -1;
    if (b.label === "Now") return 1;
    return 0;
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

export interface PlayerProfile {
  username: string;
  skillLevel: SkillLevel;
  elo: number | null;
}

export function useParkActivity() {
  const [parks, setParks] = useState<Park[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [intents, setIntents] = useState<Intent[]>([]);
  const [playerProfiles, setPlayerProfiles] = useState<Record<string, PlayerProfile>>({});
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

    // Build player profiles lookup from active user_ids
    const userIds = new Set<string>();
    if (checkInsRes.data) for (const ci of checkInsRes.data) userIds.add(ci.user_id);
    if (intentsRes.data) for (const i of intentsRes.data) userIds.add(i.user_id);

    if (userIds.size > 0) {
      const ids = Array.from(userIds);
      const [profilesRes, ratingsRes] = await Promise.all([
        supabase.from("profiles").select("id, username, skill_level").in("id", ids),
        supabase.from("ladder_ratings").select("user_id, elo_rating").eq("mode", "singles").in("user_id", ids),
      ]);

      const eloMap: Record<string, number> = {};
      if (ratingsRes.data) {
        for (const r of ratingsRes.data) eloMap[r.user_id] = r.elo_rating;
      }

      const profiles: Record<string, PlayerProfile> = {};
      if (profilesRes.data) {
        for (const p of profilesRes.data) {
          profiles[p.id] = {
            username: p.username,
            skillLevel: p.skill_level,
            elo: eloMap[p.id] ?? null,
          };
        }
      }
      setPlayerProfiles(profiles);
    }

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

  return { parks, checkIns, intents, playerProfiles, loading, refetch: fetchAll };
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
