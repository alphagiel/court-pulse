"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type {
  Proposal,
  Match,
  LadderRating,
  LadderMember,
  Profile,
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
  openProposalsSingles: number;
  openProposalsDoubles: number;
  totalMatches: number;
  levelBreakdown: Record<string, number>;
}

export function useTierPreviews() {
  const [previews, setPreviews] = useState<TierPreview[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const [ratingsRes, profilesRes, proposalsRes, matchesRes] = await Promise.all([
      supabase.from("ladder_ratings").select("*").eq("mode", "singles").order("elo_rating", { ascending: false }),
      supabase.from("profiles").select("*"),
      supabase.from("proposals").select("*").in("status", ["open", "forming"]).gte("expires_at", new Date().toISOString()).gte("proposed_time", new Date().toISOString()),
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

      // Open proposals in this tier by mode
      const tierProposals = proposals.filter((p: Proposal) => {
        const creator = profileMap.get(p.creator_id);
        return creator && tierLevels.includes(creator.skill_level as SkillLevel);
      });
      const openProposalsSingles = tierProposals.filter((p: Proposal) => p.mode === "singles").length;
      const openProposalsDoubles = tierProposals.filter((p: Proposal) => p.mode === "doubles").length;

      // Total confirmed matches in this tier
      const totalMatches = matches.filter((m: Match) => {
        const p1 = profileMap.get(m.player1_id);
        return p1 && tierLevels.includes(p1.skill_level as SkillLevel);
      }).length;

      return {
        tier,
        playerCount: tierRatings.length,
        topPlayers,
        openProposalsSingles,
        openProposalsDoubles,
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

export function useLadderRankings(tier: SkillTier, mode: MatchMode = "singles") {
  const [rankings, setRankings] = useState<LadderRankEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data: ratings } = await supabase
      .from("ladder_ratings")
      .select("*")
      .eq("mode", mode)
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

    // Compute W/L from confirmed matches (source of truth)
    const { data: confirmedMatches } = await supabase
      .from("matches")
      .select("player1_id, player2_id, player3_id, player4_id, winner_id, winning_team, mode, status")
      .eq("mode", mode)
      .eq("status", "confirmed");

    const winsMap = new Map<string, number>();
    const lossesMap = new Map<string, number>();
    for (const m of confirmedMatches || []) {
      if (mode === "singles") {
        const loserId = m.player1_id === m.winner_id ? m.player2_id : m.player1_id;
        winsMap.set(m.winner_id, (winsMap.get(m.winner_id) || 0) + 1);
        lossesMap.set(loserId, (lossesMap.get(loserId) || 0) + 1);
      } else {
        // Doubles: winning_team is "a" or "b"
        const teamA = [m.player1_id, m.player2_id].filter(Boolean);
        const teamB = [m.player3_id, m.player4_id].filter(Boolean);
        const winners = m.winning_team === "a" ? teamA : teamB;
        const losers = m.winning_team === "a" ? teamB : teamA;
        for (const id of winners) {
          winsMap.set(id, (winsMap.get(id) || 0) + 1);
        }
        for (const id of losers) {
          lossesMap.set(id, (lossesMap.get(id) || 0) + 1);
        }
      }
    }

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
        wins: winsMap.get(r.user_id) || 0,
        losses: lossesMap.get(r.user_id) || 0,
        last_played: r.last_played,
      };
    });

    setRankings(ranked);
    setLoading(false);
  }, [tier, mode]);

  useEffect(() => {
    fetch();

    const channel = supabase
      .channel(`rankings_changes_${mode}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ladder_ratings" }, () => {
        fetch();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetch, mode]);

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
      .gte("proposed_time", now)
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
    const profilesRes = await supabase.from("profiles").select("*").in("id", personIds);

    const profileMap = new Map((profilesRes.data || []).map((p: Profile) => [p.id, p]));
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

export function getSeasonRange(): { label: string; start: string; end: string; currentWeek: number; totalWeeks: number } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  let start: string, end: string, label: string;
  if (month >= 2 && month <= 4) { label = "Spring"; start = `${year}-03-01`; end = `${year}-06-01`; }
  else if (month >= 5 && month <= 7) { label = "Summer"; start = `${year}-06-01`; end = `${year}-09-01`; }
  else if (month >= 8 && month <= 10) { label = "Fall"; start = `${year}-09-01`; end = `${year}-12-01`; }
  else {
    label = "Winter";
    start = month <= 1 ? `${year - 1}-12-01` : `${year}-12-01`;
    end = month <= 1 ? `${year}-03-01` : `${year + 1}-03-01`;
  }
  const startDate = new Date(start);
  const endDate = new Date(end);
  const totalWeeks = Math.ceil((endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
  const elapsed = Math.floor((now.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  const currentWeek = Math.min(Math.max(elapsed, 1), totalWeeks);
  return { label, start, end, currentWeek, totalWeeks };
}

/** Returns the previous season label (e.g. current=Spring → previous=Winter) */
export function getPreviousSeasonLabel(): string {
  const now = new Date();
  const month = now.getMonth();
  if (month >= 2 && month <= 4) return "Winter";    // Spring → prev is Winter
  if (month >= 5 && month <= 7) return "Spring";     // Summer → prev is Spring
  if (month >= 8 && month <= 10) return "Summer";    // Fall → prev is Summer
  return "Fall";                                      // Winter → prev is Fall
}

export function useMyMatches(userId: string | undefined, tier: SkillTier, mode: MatchMode = "singles") {
  const [matches, setMatches] = useState<MatchWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);

    const season = getSeasonRange();

    // All matches for the current season
    const { data } = await supabase
      .from("matches")
      .select("*")
      .eq("mode", mode)
      .or(`player1_id.eq.${userId},player2_id.eq.${userId},player3_id.eq.${userId},player4_id.eq.${userId}`)
      .neq("status", "cancelled")
      .gte("created_at", season.start)
      .lt("created_at", season.end)
      .order("created_at", { ascending: false })
      .limit(100);

    if (!data || data.length === 0) {
      setMatches([]);
      setLoading(false);
      return;
    }

    const playerIds = [...new Set(data.flatMap((m: Match) => [m.player1_id, m.player2_id, m.player3_id, m.player4_id].filter(Boolean) as string[]))];
    const proposalIds = [...new Set(data.map((m: Match) => m.proposal_id))];

    const [profilesRes, proposalsRes] = await Promise.all([
      supabase.from("profiles").select("*").in("id", playerIds),
      supabase.from("proposals").select("*").in("id", proposalIds),
    ]);

    const profileMap = new Map((profilesRes.data || []).map((p: Profile) => [p.id, p]));
    const tierLevels = SKILL_TIER_LEVELS[tier];

    const proposalMap = new Map(
      (proposalsRes.data || []).map((p: Proposal) => [p.id, p])
    );

    const enriched: MatchWithDetails[] = data
      .filter(() => {
        // Show matches where the current user is in this tier
        const userProfile = profileMap.get(userId);
        return userProfile && tierLevels.includes(userProfile.skill_level as SkillLevel);
      })
      .map((m: Match) => {
        const proposal = proposalMap.get(m.proposal_id);
        return {
          ...m,
          player1: profileMap.get(m.player1_id)!,
          player2: profileMap.get(m.player2_id)!,
          player3: m.player3_id ? profileMap.get(m.player3_id) || null : null,
          player4: m.player4_id ? profileMap.get(m.player4_id) || null : null,
          locationName: proposal?.location_name || null,
          locationAddress: proposal?.location_address || null,
          proposedTime: proposal?.proposed_time || null,
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

export type TierMatchEntry = MatchWithDetails;

export function useTierMatches(tier: SkillTier, mode: MatchMode = "singles") {
  const [matches, setMatches] = useState<TierMatchEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);

    const season = getSeasonRange();

    const { data } = await supabase
      .from("matches")
      .select("*")
      .eq("mode", mode)
      .neq("status", "cancelled")
      .gte("created_at", season.start)
      .lt("created_at", season.end)
      .order("created_at", { ascending: false })
      .limit(200);

    if (!data || data.length === 0) {
      setMatches([]);
      setLoading(false);
      return;
    }

    const playerIds = [...new Set(data.flatMap((m: Match) => [m.player1_id, m.player2_id, m.player3_id, m.player4_id].filter(Boolean) as string[]))];
    const proposalIds = [...new Set(data.map((m: Match) => m.proposal_id))];

    const [profilesRes, proposalsRes] = await Promise.all([
      supabase.from("profiles").select("*").in("id", playerIds),
      supabase.from("proposals").select("*").in("id", proposalIds),
    ]);

    const profileMap = new Map((profilesRes.data || []).map((p: Profile) => [p.id, p]));
    const tierLevels = SKILL_TIER_LEVELS[tier];

    const proposalMap = new Map(
      (proposalsRes.data || []).map((p: Proposal) => [p.id, p])
    );

    // Filter to matches where player1 is in this tier
    const enriched: TierMatchEntry[] = data
      .filter((m: Match) => {
        const p1 = profileMap.get(m.player1_id);
        return p1 && tierLevels.includes(p1.skill_level as SkillLevel);
      })
      .map((m: Match) => {
        const proposal = proposalMap.get(m.proposal_id);
        return {
          ...m,
          player1: profileMap.get(m.player1_id)!,
          player2: profileMap.get(m.player2_id)!,
          player3: m.player3_id ? profileMap.get(m.player3_id) || null : null,
          player4: m.player4_id ? profileMap.get(m.player4_id) || null : null,
          locationName: proposal?.location_name || null,
          locationAddress: proposal?.location_address || null,
          proposedTime: proposal?.proposed_time || null,
        };
      });

    setMatches(enriched);
    setLoading(false);
  }, [tier, mode]);

  useEffect(() => {
    fetch();

    const channel = supabase
      .channel(`tier_matches_${tier}_${mode}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => {
        fetch();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetch, tier, mode]);

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

// Fetch team names for matched (accepted) doubles proposals
export function useSignupTeams(proposalIds: string[]) {
  const [teams, setTeams] = useState<Record<string, { teamA: string[]; teamB: string[] }>>({});

  const idsKey = proposalIds.sort().join(",");

  const fetch = useCallback(async () => {
    if (proposalIds.length === 0) {
      setTeams({});
      return;
    }

    const { data } = await supabase
      .from("proposal_signups")
      .select("proposal_id, user_id, team")
      .in("proposal_id", proposalIds);

    if (!data || data.length === 0) { setTeams({}); return; }

    const userIds = [...new Set(data.map((r: { user_id: string }) => r.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", userIds);

    const nameMap = new Map((profiles || []).map((p: { id: string; username: string }) => [p.id, p.username]));

    const result: Record<string, { teamA: string[]; teamB: string[] }> = {};
    for (const row of data) {
      if (!result[row.proposal_id]) result[row.proposal_id] = { teamA: [], teamB: [] };
      const name = nameMap.get(row.user_id) || "?";
      if (row.team === "a") result[row.proposal_id].teamA.push(name);
      else if (row.team === "b") result[row.proposal_id].teamB.push(name);
    }

    setTeams(result);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  useEffect(() => { fetch(); }, [fetch]);

  return { teams };
}

// --- Action banners: accepted singles + filled doubles ---

export interface ActionBanner {
  id: string;
  type: "singles_accepted" | "doubles_filled";
  message: string;
  url: string;
}

export function useActionBanners(userId: string | undefined) {
  const [banners, setBanners] = useState<ActionBanner[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!userId) { setLoading(false); return; }

    const now = new Date().toISOString();

    // Singles: proposals I created that were accepted (match exists) — exclude playoff proposals
    const { data: accepted } = await supabase
      .from("proposals")
      .select("id, proposed_time, location_name, acceptor:profiles!proposals_accepted_by_fkey(username), matches(id)")
      .eq("creator_id", userId)
      .eq("mode", "singles")
      .eq("status", "accepted")
      .neq("location_name", "Playoff Match")
      .gte("proposed_time", now);

    // Doubles: proposals I'm signed up for that are in pairing status
    const { data: mySignups } = await supabase
      .from("proposal_signups")
      .select("proposal_id")
      .eq("user_id", userId);

    const signupIds = (mySignups || []).map((s: { proposal_id: string }) => s.proposal_id);

    let filledProposals: Array<Record<string, unknown>> = [];
    if (signupIds.length > 0) {
      const { data } = await supabase
        .from("proposals")
        .select("id, proposed_time, location_name")
        .in("id", signupIds)
        .eq("mode", "doubles")
        .eq("status", "pairing")
        .gte("proposed_time", now);
      filledProposals = data || [];
    }

    const result: ActionBanner[] = [];

    for (const p of accepted || []) {
      const matchArr = p.matches as unknown as Array<{ id: string }> | null;
      const match = matchArr?.[0];
      const acceptor = p.acceptor as unknown as { username: string } | null;
      const acceptorName = acceptor?.username || "Someone";
      const locName = (p.location_name as string) || "";
      result.push({
        id: `singles-${p.id}`,
        type: "singles_accepted",
        message: `${acceptorName} accepted your proposal${locName ? ` at ${locName}` : ""}`,
        url: match ? `/ladder/match/${match.id}` : `/ladder?tab=matches`,
      });
    }

    for (const p of filledProposals) {
      const locName = (p.location_name as string) || "";
      result.push({
        id: `doubles-${p.id}`,
        type: "doubles_filled",
        message: `Your doubles event${locName ? ` at ${locName}` : ""} has 4 players — arrange the pairing`,
        url: `/ladder/proposals/${p.id}?mode=doubles`,
      });
    }

    setBanners(result);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetch(); }, [fetch]);

  const dismiss = (bannerId: string) => {
    const dismissed = JSON.parse(sessionStorage.getItem("dismissed_banners") || "[]");
    dismissed.push(bannerId);
    sessionStorage.setItem("dismissed_banners", JSON.stringify(dismissed));
    setBanners((prev) => prev.filter((b) => b.id !== bannerId));
  };

  // Filter out already-dismissed banners on mount
  useEffect(() => {
    if (banners.length === 0) return;
    const dismissed: string[] = JSON.parse(sessionStorage.getItem("dismissed_banners") || "[]");
    if (dismissed.length > 0) {
      setBanners((prev) => prev.filter((b) => !dismissed.includes(b.id)));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  return { banners, loading, dismiss };
}
