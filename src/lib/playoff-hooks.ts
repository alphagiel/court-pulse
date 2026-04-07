"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type {
  PlayoffBracket,
  PlayoffSeedWithProfile,
  PlayoffMatchWithDetails,
  PlayoffMatch,
  PlayoffTeamWithProfiles,
  Profile,
  Match,
  SkillTier,
  MatchMode,
} from "@/types/database";
import { getSeasonRange, getPreviousSeasonLabel } from "@/lib/ladder-hooks";
import { SKILL_TIER_LABELS } from "@/types/database";

export function usePlayoffBracket(tier: SkillTier, mode: MatchMode = "singles") {
  const [bracket, setBracket] = useState<PlayoffBracket | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchId = useRef(0);

  const fetch = useCallback(async () => {
    const id = ++fetchId.current;
    const season = getSeasonRange();
    const { data } = await supabase
      .from("playoff_brackets")
      .select("*")
      .eq("season", season.label)
      .eq("tier", tier)
      .eq("mode", mode)
      .single();

    if (id !== fetchId.current) return;
    setBracket(data);
    setLoading(false);
  }, [tier, mode]);

  useEffect(() => {
    setLoading(true);
    fetch();

    const channel = supabase
      .channel(`playoff_bracket_${tier}_${mode}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "playoff_brackets" }, () => {
        fetch();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetch, tier, mode]);

  return { bracket, loading, refetch: fetch };
}

export function usePlayoffSeeds(bracketId: string | undefined) {
  const [seeds, setSeeds] = useState<PlayoffSeedWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchId = useRef(0);
  const prevBracketId = useRef(bracketId);

  if (bracketId !== prevBracketId.current) {
    prevBracketId.current = bracketId;
    setSeeds([]);
    setLoading(true);
  }

  const fetch = useCallback(async () => {
    const id = ++fetchId.current;
    if (!bracketId) { setSeeds([]); setLoading(false); return; }

    const { data } = await supabase
      .from("playoff_seeds")
      .select("*")
      .eq("bracket_id", bracketId)
      .order("seed", { ascending: true });

    if (id !== fetchId.current) return;

    if (!data || data.length === 0) {
      setSeeds([]);
      setLoading(false);
      return;
    }

    const userIds = data.map((s) => s.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .in("id", userIds);

    if (id !== fetchId.current) return;

    const profileMap = new Map((profiles || []).map((p: Profile) => [p.id, p]));

    setSeeds(
      data.map((s) => ({
        ...s,
        profile: profileMap.get(s.user_id)!,
      })),
    );
    setLoading(false);
  }, [bracketId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { seeds, loading };
}

export function usePlayoffTeams(bracketId: string | undefined) {
  const [teams, setTeams] = useState<PlayoffTeamWithProfiles[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchId = useRef(0);
  const prevBracketId = useRef(bracketId);

  if (bracketId !== prevBracketId.current) {
    prevBracketId.current = bracketId;
    setTeams([]);
    setLoading(true);
  }

  const fetch = useCallback(async () => {
    const id = ++fetchId.current;
    if (!bracketId) { setTeams([]); setLoading(false); return; }

    const { data } = await supabase
      .from("playoff_teams")
      .select("*")
      .eq("bracket_id", bracketId)
      .order("seed", { ascending: true });

    if (id !== fetchId.current) return;

    if (!data || data.length === 0) {
      setTeams([]);
      setLoading(false);
      return;
    }

    const userIds = data.flatMap((t) => [t.lead_id, t.partner_id]);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .in("id", userIds);

    if (id !== fetchId.current) return;

    const profileMap = new Map((profiles || []).map((p: Profile) => [p.id, p]));

    setTeams(
      data.map((t) => ({
        ...t,
        lead: profileMap.get(t.lead_id)!,
        partner: profileMap.get(t.partner_id)!,
      })),
    );
    setLoading(false);
  }, [bracketId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { teams, loading };
}

export function usePlayoffMatches(bracketId: string | undefined) {
  const [matches, setMatches] = useState<PlayoffMatchWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchId = useRef(0);
  const prevBracketId = useRef(bracketId);

  // When bracketId changes, clear stale matches immediately to prevent showing old names
  if (bracketId !== prevBracketId.current) {
    prevBracketId.current = bracketId;
    setMatches([]);
    setLoading(true);
  }

  const fetch = useCallback(async () => {
    const id = ++fetchId.current;
    if (!bracketId) { setMatches([]); setLoading(false); return; }

    const { data } = await supabase
      .from("playoff_matches")
      .select("*")
      .eq("bracket_id", bracketId)
      .order("round", { ascending: true })
      .order("position", { ascending: true });

    if (id !== fetchId.current) return;

    if (!data || data.length === 0) {
      setMatches([]);
      setLoading(false);
      return;
    }

    // Gather all player IDs
    const playerIds = new Set<string>();
    for (const pm of data) {
      if (pm.player1_id) playerIds.add(pm.player1_id);
      if (pm.player2_id) playerIds.add(pm.player2_id);
      if (pm.winner_id) playerIds.add(pm.winner_id);
    }

    const [profilesRes, matchesRes] = await Promise.all([
      playerIds.size > 0
        ? supabase.from("profiles").select("*").in("id", [...playerIds])
        : { data: [] },
      supabase.from("matches").select("*").in(
        "id",
        data.filter((pm) => pm.match_id).map((pm) => pm.match_id!),
      ),
    ]);

    if (id !== fetchId.current) return;

    const profileMap = new Map((profilesRes.data || []).map((p: Profile) => [p.id, p]));
    const matchMap = new Map((matchesRes.data || []).map((m: Match) => [m.id, m]));

    const enriched: PlayoffMatchWithDetails[] = data.map((pm: PlayoffMatch) => ({
      ...pm,
      player1: pm.player1_id ? profileMap.get(pm.player1_id) || null : null,
      player2: pm.player2_id ? profileMap.get(pm.player2_id) || null : null,
      winner: pm.winner_id ? profileMap.get(pm.winner_id) || null : null,
      matchData: pm.match_id ? matchMap.get(pm.match_id) || null : null,
    }));

    setMatches(enriched);
    setLoading(false);
  }, [bracketId]);

  useEffect(() => {
    fetch();

    if (!bracketId) return;

    const channel = supabase
      .channel(`playoff_matches_${bracketId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "playoff_matches" }, () => {
        fetch();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => {
        fetch();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetch, bracketId]);

  return { matches, loading, refetch: fetch };
}

export function usePlayoffStatus(tier: SkillTier, mode: MatchMode = "singles") {
  const [status, setStatus] = useState<{ exists: boolean; status: string | null; championName: string | null }>({
    exists: false,
    status: null,
    championName: null,
  });
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const season = getSeasonRange();
    const { data } = await supabase
      .from("playoff_brackets")
      .select("*")
      .eq("season", season.label)
      .eq("tier", tier)
      .eq("mode", mode)
      .single();

    if (!data) {
      setStatus({ exists: false, status: null, championName: null });
      setLoading(false);
      return;
    }

    let championName: string | null = null;
    if (data.champion_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", data.champion_id)
        .single();
      championName = profile?.username || null;
    }

    setStatus({ exists: true, status: data.status, championName });
    setLoading(false);
  }, [tier, mode]);

  useEffect(() => {
    fetch();

    const channel = supabase
      .channel(`playoff_status_${tier}_${mode}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "playoff_brackets" }, () => {
        fetch();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetch, tier, mode]);

  return { ...status, loading };
}

/** Check if ANY tier has active playoffs this season */
export function useAnyPlayoffsActive(mode: MatchMode = "singles") {
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const season = getSeasonRange();
    const { data } = await supabase
      .from("playoff_brackets")
      .select("id")
      .eq("season", season.label)
      .eq("mode", mode)
      .eq("status", "active")
      .limit(1);

    setActive(!!data && data.length > 0);
    setLoading(false);
  }, [mode]);

  useEffect(() => {
    fetch();

    const channel = supabase
      .channel(`any_playoffs_active_${mode}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "playoff_brackets" }, () => {
        fetch();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetch, mode]);

  return { active, loading };
}

export interface SeasonChampion {
  tier: SkillTier;
  tierLabel: string;
  username: string;
}

/** Fetch completed playoff champions from the previous season */
export function useLastSeasonChampions(mode: MatchMode = "singles") {
  const [champions, setChampions] = useState<SeasonChampion[]>([]);
  const [seasonLabel, setSeasonLabel] = useState("");
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const prevSeason = getPreviousSeasonLabel();
    setSeasonLabel(prevSeason);

    const { data } = await supabase
      .from("playoff_brackets")
      .select("*")
      .eq("season", prevSeason)
      .eq("mode", mode)
      .eq("status", "completed")
      .not("champion_id", "is", null);

    if (!data || data.length === 0) {
      setChampions([]);
      setLoading(false);
      return;
    }

    const championIds = data.map((b) => b.champion_id).filter(Boolean) as string[];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", championIds);

    const profileMap = new Map((profiles || []).map((p: { id: string; username: string }) => [p.id, p.username]));

    const result: SeasonChampion[] = data.map((b) => ({
      tier: b.tier as SkillTier,
      tierLabel: SKILL_TIER_LABELS[b.tier as SkillTier] || b.tier,
      username: profileMap.get(b.champion_id!) || "Unknown",
    }));

    // Sort: beginner, intermediate, advanced
    const order: SkillTier[] = ["beginner", "intermediate", "advanced"];
    result.sort((a, b) => order.indexOf(a.tier) - order.indexOf(b.tier));

    setChampions(result);
    setLoading(false);
  }, [mode]);

  useEffect(() => { fetch(); }, [fetch]);

  return { champions, seasonLabel, loading };
}
