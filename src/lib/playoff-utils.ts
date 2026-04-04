import { supabase } from "@/lib/supabase";
import type { PlayoffRound, MatchMode } from "@/types/database";
import { getSeasonRange } from "@/lib/ladder-hooks";

// Seeding matchups: 1v8, 4v5, 3v6, 2v7 (standard bracket)
const QF_SEEDS: [number, number][] = [
  [1, 8], // QF pos 1
  [4, 5], // QF pos 2
  [3, 6], // QF pos 3
  [2, 7], // QF pos 4
];

interface TopPlayer {
  user_id: string;
  elo_rating: number;
}

/**
 * Create a playoff bracket for a tier.
 * Singles: top 8 players → 8-player bracket.
 * Doubles: top 16 players → auto-paired into 8 teams → 8-team bracket.
 */
export async function createBracket(
  tier: string,
  mode: MatchMode,
  topPlayers: TopPlayer[],
) {
  if (mode === "singles" && topPlayers.length < 8) throw new Error("Need at least 8 players");
  if (mode === "doubles" && topPlayers.length < 16) throw new Error("Need at least 16 players for doubles playoffs");

  const season = getSeasonRange();

  // 1. Insert bracket
  const { data: bracket, error: bracketErr } = await supabase
    .from("playoff_brackets")
    .insert({ season: season.label, tier, mode })
    .select()
    .single();

  if (bracketErr || !bracket) throw bracketErr || new Error("Failed to create bracket");

  if (mode === "singles") {
    await createSinglesBracket(bracket.id, tier, topPlayers.slice(0, 8));
  } else {
    await createDoublesBracket(bracket.id, tier, topPlayers.slice(0, 16));
  }

  return bracket;
}

async function createSinglesBracket(bracketId: string, tier: string, top8: TopPlayer[]) {
  // Insert seeds
  const seedRows = top8.map((p, i) => ({
    bracket_id: bracketId,
    user_id: p.user_id,
    seed: i + 1,
    elo_at_seed: p.elo_rating,
  }));
  await supabase.from("playoff_seeds").insert(seedRows);

  // Insert 7 playoff_matches slots
  const slots = buildBracketSlots(bracketId, top8.map(p => p.user_id));

  const { data: playoffMatches } = await supabase
    .from("playoff_matches")
    .insert(slots)
    .select();

  if (!playoffMatches) throw new Error("Failed to create playoff match slots");

  // Create proposal + matches for QF round
  const proposalId = await createPlayoffProposal(bracketId, top8[0].user_id, top8[1].user_id, tier, "singles");
  if (!proposalId) throw new Error("Failed to create playoff proposal");

  await linkQfMatches(playoffMatches, proposalId, "singles");
}

async function createDoublesBracket(bracketId: string, tier: string, top16: TopPlayer[]) {
  // Insert 16 individual seeds
  const seedRows = top16.map((p, i) => ({
    bracket_id: bracketId,
    user_id: p.user_id,
    seed: i + 1,
    elo_at_seed: p.elo_rating,
  }));
  await supabase.from("playoff_seeds").insert(seedRows);

  // Straight pairing into 8 teams: seed 1+2, 3+4, ..., 15+16
  const teams: { seed: number; lead: TopPlayer; partner: TopPlayer }[] = [];
  for (let i = 0; i < 8; i++) {
    teams.push({
      seed: i + 1,
      lead: top16[i * 2],
      partner: top16[i * 2 + 1],
    });
  }

  // Insert team rows
  const teamRows = teams.map(t => ({
    bracket_id: bracketId,
    seed: t.seed,
    lead_id: t.lead.user_id,
    partner_id: t.partner.user_id,
    team_elo: Math.round((t.lead.elo_rating + t.partner.elo_rating) / 2),
  }));
  await supabase.from("playoff_teams").insert(teamRows);

  // Build bracket slots using team lead IDs (same 1v8 seeding pattern)
  const teamLeadIds = teams.map(t => t.lead.user_id);
  const slots = buildBracketSlots(bracketId, teamLeadIds);

  const { data: playoffMatches } = await supabase
    .from("playoff_matches")
    .insert(slots)
    .select();

  if (!playoffMatches) throw new Error("Failed to create playoff match slots");

  // Create proposal + matches for QF round
  const proposalId = await createPlayoffProposal(bracketId, teams[0].lead.user_id, teams[1].lead.user_id, tier, "doubles");
  if (!proposalId) throw new Error("Failed to create playoff proposal");

  await linkQfMatchesDoubles(playoffMatches, proposalId, teams);
}

function buildBracketSlots(bracketId: string, orderedIds: string[]) {
  const slots: { bracket_id: string; round: PlayoffRound; position: number; player1_id: string | null; player2_id: string | null }[] = [];

  // QF slots (round 1, positions 1-4)
  for (let i = 0; i < 4; i++) {
    const [s1, s2] = QF_SEEDS[i];
    slots.push({
      bracket_id: bracketId,
      round: 1,
      position: i + 1,
      player1_id: orderedIds[s1 - 1],
      player2_id: orderedIds[s2 - 1],
    });
  }

  // SF slots (round 2, positions 1-2)
  slots.push({ bracket_id: bracketId, round: 2, position: 1, player1_id: null, player2_id: null });
  slots.push({ bracket_id: bracketId, round: 2, position: 2, player1_id: null, player2_id: null });

  // Final slot (round 3, position 1)
  slots.push({ bracket_id: bracketId, round: 3, position: 1, player1_id: null, player2_id: null });

  return slots;
}

async function createPlayoffProposal(bracketId: string, creatorId: string, acceptorId: string, tier: string, mode: MatchMode): Promise<string | null> {
  const { data: proposal } = await supabase
    .from("proposals")
    .insert({
      creator_id: creatorId,
      location_name: "Playoff Match",
      proposed_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      message: `Playoff: ${tier} Quarterfinals`,
      status: "accepted",
      accepted_by: acceptorId,
      accepted_at: new Date().toISOString(),
      mode,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  return proposal?.id || null;
}

async function linkQfMatches(playoffMatches: Array<Record<string, unknown>>, proposalId: string, mode: MatchMode) {
  const deadline = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const qfSlots = playoffMatches.filter((pm) => pm.round === 1);

  for (const slot of qfSlots) {
    const { data: matchRow } = await supabase
      .from("matches")
      .insert({
        proposal_id: proposalId,
        player1_id: slot.player1_id,
        player2_id: slot.player2_id,
        mode,
        status: "pending",
      })
      .select()
      .single();

    if (matchRow) {
      await supabase
        .from("playoff_matches")
        .update({ match_id: matchRow.id, forfeit_deadline: deadline })
        .eq("id", slot.id as string);
    }
  }
}

async function linkQfMatchesDoubles(
  playoffMatches: Array<Record<string, unknown>>,
  proposalId: string,
  teams: { seed: number; lead: TopPlayer; partner: TopPlayer }[],
) {
  const deadline = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const qfSlots = playoffMatches.filter((pm) => pm.round === 1);

  // Build lead → partner lookup
  const teamByLead = new Map(teams.map(t => [t.lead.user_id, t]));

  for (const slot of qfSlots) {
    const team1 = teamByLead.get(slot.player1_id as string);
    const team2 = teamByLead.get(slot.player2_id as string);
    if (!team1 || !team2) continue;

    const { data: matchRow } = await supabase
      .from("matches")
      .insert({
        proposal_id: proposalId,
        player1_id: team1.lead.user_id,
        player2_id: team1.partner.user_id,
        player3_id: team2.lead.user_id,
        player4_id: team2.partner.user_id,
        mode: "doubles",
        status: "pending",
      })
      .select()
      .single();

    if (matchRow) {
      await supabase
        .from("playoff_matches")
        .update({ match_id: matchRow.id, forfeit_deadline: deadline })
        .eq("id", slot.id as string);
    }
  }
}

/**
 * Map a QF/SF winner position to the next round slot.
 */
function getNextSlot(round: PlayoffRound, position: number): { nextRound: PlayoffRound; nextPosition: number; slot: "player1_id" | "player2_id" } | null {
  if (round === 1) {
    const nextPosition = position <= 2 ? 1 : 2;
    const slot = position % 2 === 1 ? "player1_id" : "player2_id";
    return { nextRound: 2, nextPosition, slot };
  }
  if (round === 2) {
    const slot = position === 1 ? "player1_id" : "player2_id";
    return { nextRound: 3, nextPosition: 1, slot };
  }
  return null;
}

/** Look up team partner for a given lead_id in a doubles bracket */
async function getTeamPartner(bracketId: string, leadId: string): Promise<string | null> {
  const { data } = await supabase
    .from("playoff_teams")
    .select("partner_id")
    .eq("bracket_id", bracketId)
    .eq("lead_id", leadId)
    .single();
  return data?.partner_id || null;
}

/** Get the bracket mode */
async function getBracketMode(bracketId: string): Promise<MatchMode> {
  const { data } = await supabase
    .from("playoff_brackets")
    .select("mode")
    .eq("id", bracketId)
    .single();
  return (data?.mode as MatchMode) || "singles";
}

/**
 * Advance the bracket after a match is confirmed or forfeit.
 * For doubles, winnerId is the team lead — partner is resolved from playoff_teams.
 */
export async function advancePlayoffBracket(
  bracketId: string,
  playoffMatchId: string,
  winnerId: string,
) {
  // 1. Update this playoff match winner
  await supabase
    .from("playoff_matches")
    .update({ winner_id: winnerId })
    .eq("id", playoffMatchId);

  // Get the playoff match to know round/position
  const { data: pm } = await supabase
    .from("playoff_matches")
    .select("*")
    .eq("id", playoffMatchId)
    .single();

  if (!pm) return;

  const next = getNextSlot(pm.round as PlayoffRound, pm.position);

  if (!next) {
    // This was the Final — mark bracket completed
    await supabase
      .from("playoff_brackets")
      .update({
        status: "completed",
        champion_id: winnerId,
        completed_at: new Date().toISOString(),
      })
      .eq("id", bracketId);
    return;
  }

  // 2. Set winner on next-round match
  const { data: nextMatch } = await supabase
    .from("playoff_matches")
    .select("*")
    .eq("bracket_id", bracketId)
    .eq("round", next.nextRound)
    .eq("position", next.nextPosition)
    .single();

  if (!nextMatch) return;
  if (nextMatch[next.slot] !== null) return;

  await supabase
    .from("playoff_matches")
    .update({ [next.slot]: winnerId })
    .eq("id", nextMatch.id);

  // Refetch to check if both players/teams are now set
  const { data: updated } = await supabase
    .from("playoff_matches")
    .select("*")
    .eq("id", nextMatch.id)
    .single();

  if (!updated || !updated.player1_id || !updated.player2_id) return;

  // Both sides set — create a match row and link it
  const mode = await getBracketMode(bracketId);
  const proposalId = await getOrCreatePlayoffProposal(bracketId, updated.player1_id, updated.player2_id, mode);
  if (!proposalId) return;

  let matchInsert: Record<string, unknown>;

  if (mode === "doubles") {
    const partner1 = await getTeamPartner(bracketId, updated.player1_id);
    const partner2 = await getTeamPartner(bracketId, updated.player2_id);
    matchInsert = {
      proposal_id: proposalId,
      player1_id: updated.player1_id,
      player2_id: partner1,
      player3_id: updated.player2_id,
      player4_id: partner2,
      mode: "doubles",
      status: "pending",
    };
  } else {
    matchInsert = {
      proposal_id: proposalId,
      player1_id: updated.player1_id,
      player2_id: updated.player2_id,
      mode: "singles",
      status: "pending",
    };
  }

  const { data: matchRow } = await supabase
    .from("matches")
    .insert(matchInsert)
    .select()
    .single();

  if (matchRow) {
    const deadline = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    await supabase
      .from("playoff_matches")
      .update({ match_id: matchRow.id, forfeit_deadline: deadline })
      .eq("id", updated.id);
  }
}

/** Find an existing proposal for this bracket's matches, or create one */
async function getOrCreatePlayoffProposal(bracketId: string, player1Id: string, player2Id: string, mode: MatchMode = "singles"): Promise<string | null> {
  // Try to find proposal from any existing match in this bracket
  const { data: linked } = await supabase
    .from("playoff_matches")
    .select("match_id")
    .eq("bracket_id", bracketId)
    .not("match_id", "is", null)
    .limit(1);

  if (linked && linked.length > 0 && linked[0].match_id) {
    const { data: refMatch } = await supabase
      .from("matches")
      .select("proposal_id")
      .eq("id", linked[0].match_id)
      .single();
    if (refMatch?.proposal_id) return refMatch.proposal_id;
  }

  // No existing proposal found — create one
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: proposal } = await supabase
    .from("proposals")
    .insert({
      creator_id: user.id,
      location_name: "Playoff Match",
      proposed_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      message: "Playoff match",
      status: "accepted",
      accepted_by: player1Id === user.id ? player2Id : player1Id,
      accepted_at: new Date().toISOString(),
      mode,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  return proposal?.id || null;
}

/**
 * Admin undo: reverse an advancement.
 */
export async function undoPlayoffAdvancement(
  bracketId: string,
  playoffMatchId: string,
) {
  const { data: pm } = await supabase
    .from("playoff_matches")
    .select("*")
    .eq("id", playoffMatchId)
    .single();

  if (!pm || !pm.winner_id) return;

  const winnerId = pm.winner_id;

  // 1. Clear winner on this match, reset the linked match to pending
  await supabase
    .from("playoff_matches")
    .update({ winner_id: null, forfeit: false })
    .eq("id", playoffMatchId);

  if (pm.match_id) {
    await supabase
      .from("matches")
      .update({ status: "pending", winner_id: null, confirmed_by: null, submitted_by: null, player1_scores: null, player2_scores: null, winning_team: null })
      .eq("id", pm.match_id);
  }

  // 2. Find and clean the next-round slot
  const next = getNextSlot(pm.round as PlayoffRound, pm.position);

  if (!next) {
    // Was the Final — revert bracket to active
    await supabase
      .from("playoff_brackets")
      .update({ status: "active", champion_id: null, completed_at: null })
      .eq("id", bracketId);
    return;
  }

  const { data: nextMatch } = await supabase
    .from("playoff_matches")
    .select("*")
    .eq("bracket_id", bracketId)
    .eq("round", next.nextRound)
    .eq("position", next.nextPosition)
    .single();

  if (!nextMatch) return;
  if (nextMatch[next.slot] !== winnerId) return;
  if (nextMatch.winner_id) return;

  if (nextMatch.match_id) {
    const { data: linkedMatch } = await supabase
      .from("matches")
      .select("status")
      .eq("id", nextMatch.match_id)
      .single();

    if (linkedMatch?.status === "pending") {
      await supabase.from("matches").delete().eq("id", nextMatch.match_id);
      await supabase
        .from("playoff_matches")
        .update({ [next.slot]: null, match_id: null, forfeit_deadline: null })
        .eq("id", nextMatch.id);
    } else {
      await supabase
        .from("playoff_matches")
        .update({ [next.slot]: null })
        .eq("id", nextMatch.id);
    }
  } else {
    await supabase
      .from("playoff_matches")
      .update({ [next.slot]: null })
      .eq("id", nextMatch.id);
  }
}

/**
 * Ensure all playoff matches with both players have a linked match row.
 */
export async function ensurePlayoffMatchRows(bracketId: string) {
  const { data: slots, error: slotsErr } = await supabase
    .from("playoff_matches")
    .select("*")
    .eq("bracket_id", bracketId)
    .not("player1_id", "is", null)
    .not("player2_id", "is", null)
    .is("match_id", null)
    .is("winner_id", null);

  console.log("[playoff] ensureMatchRows: found", slots?.length ?? 0, "slots needing match rows", slotsErr?.message ?? "");

  if (!slots || slots.length === 0) return;

  const mode = await getBracketMode(bracketId);

  for (const slot of slots) {
    console.log("[playoff] creating match for slot", slot.round, slot.position, "players:", slot.player1_id, "vs", slot.player2_id);

    const proposalId = await getOrCreatePlayoffProposal(bracketId, slot.player1_id!, slot.player2_id!, mode);
    if (!proposalId) { console.error("[playoff] failed to get/create proposal"); continue; }

    let matchInsert: Record<string, unknown>;

    if (mode === "doubles") {
      const partner1 = await getTeamPartner(bracketId, slot.player1_id!);
      const partner2 = await getTeamPartner(bracketId, slot.player2_id!);
      matchInsert = {
        proposal_id: proposalId,
        player1_id: slot.player1_id,
        player2_id: partner1,
        player3_id: slot.player2_id,
        player4_id: partner2,
        mode: "doubles",
        status: "pending",
      };
    } else {
      matchInsert = {
        proposal_id: proposalId,
        player1_id: slot.player1_id,
        player2_id: slot.player2_id,
        mode: "singles",
        status: "pending",
      };
    }

    const { data: matchRow, error: matchErr } = await supabase
      .from("matches")
      .insert(matchInsert)
      .select()
      .single();

    console.log("[playoff] match insert:", matchRow?.id ?? "FAILED", matchErr?.message ?? "");

    if (matchRow) {
      const deadline = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      await supabase
        .from("playoff_matches")
        .update({ match_id: matchRow.id, forfeit_deadline: deadline })
        .eq("id", slot.id);
      console.log("[playoff] linked match", matchRow.id, "to playoff slot", slot.id);
    }
  }
}

/**
 * Lazy forfeit check — run on page load.
 */
export async function checkForfeitDeadlines(bracketId: string) {
  const now = new Date().toISOString();

  const { data: overdue } = await supabase
    .from("playoff_matches")
    .select("*")
    .eq("bracket_id", bracketId)
    .is("winner_id", null)
    .not("forfeit_deadline", "is", null)
    .lt("forfeit_deadline", now);

  if (!overdue || overdue.length === 0) return;

  for (const pm of overdue) {
    const p1 = pm.player1_id;
    const p2 = pm.player2_id;

    let winnerId: string | null = null;
    if (p1 && !p2) winnerId = p1;
    else if (p2 && !p1) winnerId = p2;
    else if (p1 && p2) {
      continue;
    } else {
      continue;
    }

    await supabase
      .from("playoff_matches")
      .update({ forfeit: true })
      .eq("id", pm.id);

    await advancePlayoffBracket(bracketId, pm.id, winnerId!);
  }
}
