import { supabase } from "@/lib/supabase";
import type { PlayoffRound } from "@/types/database";
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
 * Inserts bracket, seeds, playoff match slots, and linked matches for QF round.
 */
export async function createBracket(
  tier: string,
  mode: "singles",
  topPlayers: TopPlayer[],
) {
  if (topPlayers.length < 8) throw new Error("Need at least 8 players");

  const season = getSeasonRange();
  const top8 = topPlayers.slice(0, 8);

  // 1. Insert bracket
  const { data: bracket, error: bracketErr } = await supabase
    .from("playoff_brackets")
    .insert({ season: season.label, tier, mode })
    .select()
    .single();

  if (bracketErr || !bracket) throw bracketErr || new Error("Failed to create bracket");

  // 2. Insert seeds
  const seedRows = top8.map((p, i) => ({
    bracket_id: bracket.id,
    user_id: p.user_id,
    seed: i + 1,
    elo_at_seed: p.elo_rating,
  }));
  await supabase.from("playoff_seeds").insert(seedRows);

  // 3. Insert 7 playoff_matches slots
  const slots: { bracket_id: string; round: PlayoffRound; position: number; player1_id: string | null; player2_id: string | null }[] = [];

  // QF slots (round 1, positions 1-4)
  for (let i = 0; i < 4; i++) {
    const [s1, s2] = QF_SEEDS[i];
    slots.push({
      bracket_id: bracket.id,
      round: 1,
      position: i + 1,
      player1_id: top8[s1 - 1].user_id,
      player2_id: top8[s2 - 1].user_id,
    });
  }

  // SF slots (round 2, positions 1-2) — empty until QF winners determined
  slots.push({ bracket_id: bracket.id, round: 2, position: 1, player1_id: null, player2_id: null });
  slots.push({ bracket_id: bracket.id, round: 2, position: 2, player1_id: null, player2_id: null });

  // Final slot (round 3, position 1)
  slots.push({ bracket_id: bracket.id, round: 3, position: 1, player1_id: null, player2_id: null });

  const { data: playoffMatches } = await supabase
    .from("playoff_matches")
    .insert(slots)
    .select();

  if (!playoffMatches) throw new Error("Failed to create playoff match slots");

  // 4. Create a playoff proposal + 4 matches for QF round
  const { data: proposal } = await supabase
    .from("proposals")
    .insert({
      creator_id: top8[0].user_id,
      location_name: "Playoff Match",
      proposed_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      message: `Playoff: ${tier} Quarterfinals`,
      status: "accepted",
      accepted_by: top8[1].user_id,
      accepted_at: new Date().toISOString(),
      mode: "singles",
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  if (!proposal) throw new Error("Failed to create playoff proposal");

  const deadline = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  // Create a match row for each QF and link it
  const qfSlots = playoffMatches.filter((pm) => pm.round === 1);
  for (const slot of qfSlots) {
    const { data: matchRow } = await supabase
      .from("matches")
      .insert({
        proposal_id: proposal.id,
        player1_id: slot.player1_id,
        player2_id: slot.player2_id,
        mode: "singles",
        status: "pending",
      })
      .select()
      .single();

    if (matchRow) {
      await supabase
        .from("playoff_matches")
        .update({ match_id: matchRow.id, forfeit_deadline: deadline })
        .eq("id", slot.id);
    }
  }

  return bracket;
}

/**
 * Map a QF/SF winner position to the next round slot.
 * QF1 winner → SF1.player1, QF2 winner → SF1.player2
 * QF3 winner → SF2.player1, QF4 winner → SF2.player2
 * SF1 winner → Final.player1, SF2 winner → Final.player2
 */
function getNextSlot(round: PlayoffRound, position: number): { nextRound: PlayoffRound; nextPosition: number; slot: "player1_id" | "player2_id" } | null {
  if (round === 1) {
    // QF → SF
    const nextPosition = position <= 2 ? 1 : 2;
    const slot = position % 2 === 1 ? "player1_id" : "player2_id";
    return { nextRound: 2, nextPosition, slot };
  }
  if (round === 2) {
    // SF → Final
    const slot = position === 1 ? "player1_id" : "player2_id";
    return { nextRound: 3, nextPosition: 1, slot };
  }
  return null; // Final has no next
}

/**
 * Advance the bracket after a match is confirmed or forfeit.
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

  // 2. Set winner on next-round match (race-condition guard: only if slot is still null)
  const { data: nextMatch } = await supabase
    .from("playoff_matches")
    .select("*")
    .eq("bracket_id", bracketId)
    .eq("round", next.nextRound)
    .eq("position", next.nextPosition)
    .single();

  if (!nextMatch) return;

  // Only update if slot is still empty
  if (nextMatch[next.slot] !== null) return;

  await supabase
    .from("playoff_matches")
    .update({ [next.slot]: winnerId })
    .eq("id", nextMatch.id);

  // Refetch to check if both players are now set
  const { data: updated } = await supabase
    .from("playoff_matches")
    .select("*")
    .eq("id", nextMatch.id)
    .single();

  if (!updated || !updated.player1_id || !updated.player2_id) return;

  // Both players set — create a match row and link it
  const proposalId = await getOrCreatePlayoffProposal(bracketId, updated.player1_id, updated.player2_id);
  if (!proposalId) return;

  const { data: matchRow } = await supabase
    .from("matches")
    .insert({
      proposal_id: proposalId,
      player1_id: updated.player1_id,
      player2_id: updated.player2_id,
      mode: "singles",
      status: "pending",
    })
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
async function getOrCreatePlayoffProposal(bracketId: string, player1Id: string, player2Id: string): Promise<string | null> {
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

  // No existing proposal found — create one using the current user as creator (RLS requires creator_id = auth.uid())
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
      mode: "singles",
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  return proposal?.id || null;
}

/**
 * Admin undo: reverse an advancement.
 * Clears winner on this match, removes the winner from the next-round slot,
 * and deletes the next-round match row if it was auto-created and hasn't been played.
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

  // Only clear if the slot still holds the winner we're undoing
  if (nextMatch[next.slot] !== winnerId) return;

  // If next-round match has already been played (has a winner), don't undo further
  if (nextMatch.winner_id) return;

  // Delete the auto-created match row if it exists and is still pending
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
      // Match already in progress, just clear the player slot
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
 * Fixes cases where advancement set both players but match creation failed.
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

  for (const slot of slots) {
    console.log("[playoff] creating match for slot", slot.round, slot.position, "players:", slot.player1_id, "vs", slot.player2_id);

    const proposalId = await getOrCreatePlayoffProposal(bracketId, slot.player1_id!, slot.player2_id!);
    if (!proposalId) { console.error("[playoff] failed to get/create proposal"); continue; }

    const { data: matchRow, error: matchErr } = await supabase
      .from("matches")
      .insert({
        proposal_id: proposalId,
        player1_id: slot.player1_id,
        player2_id: slot.player2_id,
        mode: "singles",
        status: "pending",
      })
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
 * Finds playoff matches where deadline has passed and no winner, auto-advances.
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
    // If only one player present, they win by forfeit
    const p1 = pm.player1_id;
    const p2 = pm.player2_id;

    let winnerId: string | null = null;
    if (p1 && !p2) winnerId = p1;
    else if (p2 && !p1) winnerId = p2;
    else if (p1 && p2) {
      // Both present but no match played — check if match exists and has no scores
      // For now, skip — both players had the chance to play
      continue;
    } else {
      continue;
    }

    // Mark as forfeit
    await supabase
      .from("playoff_matches")
      .update({ forfeit: true })
      .eq("id", pm.id);

    await advancePlayoffBracket(bracketId, pm.id, winnerId!);
  }
}
