"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type {
  Proposal,
  Match,
  LadderRating,
  LadderMember,
  Profile,
  Park,
  ProposalWithDetails,
  MatchWithDetails,
  LadderRankEntry,
  SkillTier,
  SkillLevel,
  MatchMode,
  ProposalSignup,
  ProposalSignupWithProfile,
} from "@/types/database";
import { SKILL_TIER_LEVELS } from "@/types/database";

export interface TierPreview {
  tier: SkillTier;
  playerCount: number;
  topPlayers: { username: string; elo_rating: number }[];
  openProposals: number;
  totalMatches: number;
  levelBreakdown: Record<string, number>;
}

export function useTierPreviews() {
  const [previews, setPreviews] = useState<TierPreview[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const [ratingsRes, profilesRes, proposalsRes, matchesRes] = await Promise.all([
      supabase.from("ladder_ratings").select("*").order("elo_rating", { ascending: false }),
      supabase.from("profiles").select("*"),
      supabase.from("proposals").select("*").eq("status", "open").gte("expires_at", new Date().toISOString()),
      supabase.from("matches").select("*").in("status", ["pending", "score_submitted", "confirmed"]),
    ]);

    const ratings = ratingsRes.data || [];
    const profiles = profilesRes.data || [];
    const proposals = proposalsRes.data || [];
    const matches = matchesRes.data || [];

    const profileMap = new Map(profiles.map((p: Profile) => [p.id, p]));

    const tiers: SkillTier[] = ["beginner", "intermediate", "advanced"];
    const result: TierPreview[] = tiers.map((tier) => {
      const tierLevels = SKILL_TIER_LEVELS[tier];

      // Players in this tier
      const tierRatings = ratings.filter((r: LadderRating) => {
        const p = profileMap.get(r.user_id);
        return p && tierLevels.includes(p.skill_level as SkillLevel);
      });

      // Top 3
      const topPlayers = tierRatings.slice(0, 3).map((r: LadderRating) => {
        const p = profileMap.get(r.user_id);
        return { username: p?.username || "Unknown", elo_rating: r.elo_rating };
      });

      // Level breakdown
      const levelBreakdown: Record<string, number> = {};
      for (const level of tierLevels) {
        levelBreakdown[level] = tierRatings.filter((r: LadderRating) => {
          const p = profileMap.get(r.user_id);
          return p?.skill_level === level;
        }).length;
      }

      // Open proposals in this tier
      const openProposals = proposals.filter((p: Proposal) => {
        const creator = profileMap.get(p.creator_id);
        return creator && tierLevels.includes(creator.skill_level as SkillLevel);
      }).length;

      // Total confirmed matches in this tier
      const totalMatches = matches.filter((m: Match) => {
        const p1 = profileMap.get(m.player1_id);
        return p1 && tierLevels.includes(p1.skill_level as SkillLevel);
      }).length;

      return {
        tier,
        playerCount: tierRatings.length,
        topPlayers,
        openProposals,
        totalMatches,
        levelBreakdown,
      };
    });

    setPreviews(result);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { previews, loading };
}

export function useLadderMembership(userId: string | undefined) {
  const [member, setMember] = useState<LadderMember | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    const { data } = await supabase
      .from("ladder_members")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .single();
    setMember(data);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { member, loading, refetch: fetch };
}

export function useLadderRankings(tier: SkillTier) {
  const [rankings, setRankings] = useState<LadderRankEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data: ratings } = await supabase
      .from("ladder_ratings")
      .select("*")
      .order("elo_rating", { ascending: false });

    if (!ratings || ratings.length === 0) {
      setRankings([]);
      setLoading(false);
      return;
    }

    const userIds = ratings.map((r: LadderRating) => r.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .in("id", userIds);

    const profileMap = new Map((profiles || []).map((p: Profile) => [p.id, p]));
    const tierLevels = SKILL_TIER_LEVELS[tier];

    // Filter to only players in this tier, then rank
    const filtered = ratings.filter((r: LadderRating) => {
      const profile = profileMap.get(r.user_id);
      return profile && tierLevels.includes(profile.skill_level as SkillLevel);
    });

    const ranked: LadderRankEntry[] = filtered.map((r: LadderRating, i: number) => {
      const profile = profileMap.get(r.user_id);
      return {
        rank: i + 1,
        user_id: r.user_id,
        username: profile?.username || "Unknown",
        skill_level: profile?.skill_level || "3.5",
        elo_rating: r.elo_rating,
        wins: r.wins,
        losses: r.losses,
        last_played: r.last_played,
      };
    });

    setRankings(ranked);
    setLoading(false);
  }, [tier]);

  useEffect(() => { fetch(); }, [fetch]);

  return { rankings, loading, refetch: fetch };
}

export function useProposals(tier: SkillTier, mode: MatchMode = "singles") {
  const [proposals, setProposals] = useState<ProposalWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const now = new Date().toISOString();
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Singles: open + accepted; Doubles: open + forming + pairing + accepted
    const activeStatuses = mode === "doubles"
      ? ["open", "forming", "pairing", "accepted"]
      : ["open", "accepted"];

    const { data } = await supabase
      .from("proposals")
      .select("*")
      .eq("mode", mode)
      .in("status", activeStatuses)
      .gte("created_at", oneWeekAgo)
      .gte("expires_at", now)
      .order("proposed_time", { ascending: true });

    if (!data || data.length === 0) {
      setProposals([]);
      setLoading(false);
      return;
    }

    // Gather unique IDs for profiles (creators + acceptors + partners)
    const personIds = [
      ...new Set([
        ...data.map((p: Proposal) => p.creator_id),
        ...data.filter((p: Proposal) => p.accepted_by).map((p: Proposal) => p.accepted_by!),
        ...data.filter((p: Proposal) => p.partner_id).map((p: Proposal) => p.partner_id!),
        ...data.filter((p: Proposal) => p.acceptor_partner_id).map((p: Proposal) => p.acceptor_partner_id!),
      ]),
    ];
    const parkIds = [...new Set(data.map((p: Proposal) => p.park_id))];

    const [profilesRes, parksRes] = await Promise.all([
      supabase.from("profiles").select("*").in("id", personIds),
      supabase.from("parks").select("*").in("id", parkIds),
    ]);

    const profileMap = new Map((profilesRes.data || []).map((p: Profile) => [p.id, p]));
    const parkMap = new Map((parksRes.data || []).map((p: Park) => [p.id, p]));
    const tierLevels = SKILL_TIER_LEVELS[tier];

    // Filter to this tier based on creator's skill level
    const enriched: ProposalWithDetails[] = data
      .filter((p: Proposal) => {
        const creator = profileMap.get(p.creator_id);
        return creator && tierLevels.includes(creator.skill_level as SkillLevel);
      })
      .map((p: Proposal) => ({
        ...p,
        creator: profileMap.get(p.creator_id)!,
        acceptor: p.accepted_by ? profileMap.get(p.accepted_by) || null : null,
        park: parkMap.get(p.park_id)!,
      }));

    setProposals(enriched);
    setLoading(false);
  }, [tier, mode]);

  useEffect(() => {
    fetch();

    const channel = supabase
      .channel(`proposals_changes_${mode}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "proposals" }, () => {
        fetch();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetch, mode]);

  return { proposals, loading, refetch: fetch };
}

export function useMyMatches(userId: string | undefined, tier: SkillTier, mode: MatchMode = "singles") {
  const [matches, setMatches] = useState<MatchWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Active matches (pending/score_submitted/disputed) + confirmed within last week
    const { data } = await supabase
      .from("matches")
      .select("*")
      .eq("mode", mode)
      .or(`player1_id.eq.${userId},player2_id.eq.${userId},player3_id.eq.${userId},player4_id.eq.${userId}`)
      .neq("status", "cancelled")
      .gte("created_at", oneWeekAgo)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!data || data.length === 0) {
      setMatches([]);
      setLoading(false);
      return;
    }

    const playerIds = [...new Set(data.flatMap((m: Match) => [m.player1_id, m.player2_id, m.player3_id, m.player4_id].filter(Boolean) as string[]))];
    const proposalIds = [...new Set(data.map((m: Match) => m.proposal_id))];

    const [profilesRes, proposalsRes] = await Promise.all([
      supabase.from("profiles").select("*").in("id", playerIds),
      supabase.from("proposals").select("*, parks(*)").in("id", proposalIds),
    ]);

    const profileMap = new Map((profilesRes.data || []).map((p: Profile) => [p.id, p]));
    const tierLevels = SKILL_TIER_LEVELS[tier];

    type ProposalWithPark = Proposal & { parks: Park };
    const proposalMap = new Map(
      (proposalsRes.data || []).map((p: ProposalWithPark) => [p.id, p])
    );

    const enriched: MatchWithDetails[] = data
      .filter(() => {
        // Show matches where the current user is in this tier
        const userProfile = profileMap.get(userId);
        return userProfile && tierLevels.includes(userProfile.skill_level as SkillLevel);
      })
      .map((m: Match) => {
        const proposal = proposalMap.get(m.proposal_id) as ProposalWithPark | undefined;
        return {
          ...m,
          player1: profileMap.get(m.player1_id)!,
          player2: profileMap.get(m.player2_id)!,
          player3: m.player3_id ? profileMap.get(m.player3_id) || null : null,
          player4: m.player4_id ? profileMap.get(m.player4_id) || null : null,
          park: proposal?.parks || { id: "", name: "Unknown", address: null, lat: 0, lng: 0, court_count: 0, created_at: "" },
        };
      });

    setMatches(enriched);
    setLoading(false);
  }, [userId, tier, mode]);

  useEffect(() => {
    fetch();

    const channel = supabase
      .channel(`matches_changes_${mode}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => {
        fetch();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetch, mode]);

  return { matches, loading, refetch: fetch };
}

// ========================
// DOUBLES-SPECIFIC HOOKS
// ========================

// Fetch signups for a specific doubles proposal, with realtime
export function useProposalSignups(proposalId: string | undefined) {
  const [signups, setSignups] = useState<ProposalSignupWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const hasFetched = useRef(false);

  const fetch = useCallback(async () => {
    if (!proposalId) { setLoading(false); return; }
    // Only show loading spinner on initial fetch, not refetches
    if (!hasFetched.current) setLoading(true);

    const { data } = await supabase
      .from("proposal_signups")
      .select("*")
      .eq("proposal_id", proposalId)
      .order("joined_at", { ascending: true });

    if (!data || data.length === 0) {
      setSignups([]);
      setLoading(false);
      return;
    }

    const userIds = data.map((s: ProposalSignup) => s.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .in("id", userIds);

    const profileMap = new Map((profiles || []).map((p: Profile) => [p.id, p]));

    const enriched: ProposalSignupWithProfile[] = data.map((s: ProposalSignup) => ({
      ...s,
      profile: profileMap.get(s.user_id)!,
    }));

    setSignups(enriched);
    setLoading(false);
    hasFetched.current = true;
  }, [proposalId]);

  useEffect(() => {
    fetch();

    if (!proposalId) return;

    const channel = supabase
      .channel(`signups_${proposalId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "proposal_signups",
        filter: `proposal_id=eq.${proposalId}`,
      }, () => {
        fetch();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetch, proposalId]);

  return { signups, loading, refetch: fetch };
}

// Count signups for a list of proposal IDs (for proposal cards showing "2/4 players")
export function useSignupCounts(proposalIds: string[]) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const idsKey = proposalIds.sort().join(",");

  const fetch = useCallback(async () => {
    if (proposalIds.length === 0) {
      setCounts({});
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("proposal_signups")
      .select("proposal_id")
      .in("proposal_id", proposalIds);

    const result: Record<string, number> = {};
    for (const id of proposalIds) result[id] = 0;
    for (const row of data || []) {
      result[row.proposal_id] = (result[row.proposal_id] || 0) + 1;
    }

    setCounts(result);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  useEffect(() => {
    fetch();

    if (proposalIds.length === 0) return;

    const channel = supabase
      .channel("signup_counts")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "proposal_signups",
      }, () => {
        fetch();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetch, proposalIds.length]);

  return { counts, loading, refetch: fetch };
}
