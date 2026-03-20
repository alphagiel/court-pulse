import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const K_FACTOR = 32;

function calculateElo(winnerRating: number, loserRating: number) {
  const expectedWinner =
    1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
  const expectedLoser =
    1 / (1 + Math.pow(10, (winnerRating - loserRating) / 400));
  return {
    newWinnerRating: Math.round(winnerRating + K_FACTOR * (1 - expectedWinner)),
    newLoserRating: Math.round(loserRating + K_FACTOR * (0 - expectedLoser)),
  };
}

function calculateDoublesElo(
  winnerRatings: [number, number],
  loserRatings: [number, number],
) {
  const winnerAvg = (winnerRatings[0] + winnerRatings[1]) / 2;
  const loserAvg = (loserRatings[0] + loserRatings[1]) / 2;
  const expectedWinner =
    1 / (1 + Math.pow(10, (loserAvg - winnerAvg) / 400));
  const winnerDelta = Math.round(K_FACTOR * (1 - expectedWinner));
  const loserDelta = -winnerDelta;
  return {
    newWinnerRatings: [
      winnerRatings[0] + winnerDelta,
      winnerRatings[1] + winnerDelta,
    ] as [number, number],
    newLoserRatings: [
      loserRatings[0] + loserDelta,
      loserRatings[1] + loserDelta,
    ] as [number, number],
  };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get(
    "SUPABASE_SERVICE_ROLE_KEY",
  )!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Find matches stuck in score_submitted or disputed for > 24 hours
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: staleMatches, error: fetchError } = await supabase
    .from("matches")
    .select("*")
    .in("status", ["score_submitted", "disputed"])
    .lt("played_at", cutoff);

  if (fetchError) {
    return new Response(JSON.stringify({ error: fetchError.message }), {
      status: 500,
    });
  }

  if (!staleMatches || staleMatches.length === 0) {
    return new Response(JSON.stringify({ ok: true, confirmed: 0 }));
  }

  let confirmed = 0;
  const errors: string[] = [];

  for (const match of staleMatches) {
    try {
      // Atomically set confirmed — skip if already changed by a user
      const { data: updated, error: updateError } = await supabase
        .from("matches")
        .update({ status: "confirmed", confirmed_by: null })
        .eq("id", match.id)
        .in("status", ["score_submitted", "disputed"])
        .select()
        .single();

      if (updateError || !updated) {
        // Already confirmed by user or other race — skip
        continue;
      }

      // Update ELO ratings
      if (match.mode === "doubles") {
        await confirmDoubles(supabase, match);
      } else {
        await confirmSingles(supabase, match);
      }

      confirmed++;
    } catch (err) {
      errors.push(`match ${match.id}: ${(err as Error).message}`);
    }
  }

  return new Response(
    JSON.stringify({ ok: true, confirmed, errors: errors.length ? errors : undefined }),
  );
});

async function confirmSingles(
  supabase: ReturnType<typeof createClient>,
  match: Record<string, unknown>,
) {
  const winnerId = match.winner_id as string;
  const loserId =
    winnerId === (match.player1_id as string)
      ? (match.player2_id as string)
      : (match.player1_id as string);

  const [winnerRating, loserRating] = await Promise.all([
    supabase
      .from("ladder_ratings")
      .select("*")
      .eq("user_id", winnerId)
      .eq("mode", "singles")
      .single(),
    supabase
      .from("ladder_ratings")
      .select("*")
      .eq("user_id", loserId)
      .eq("mode", "singles")
      .single(),
  ]);

  if (!winnerRating.data || !loserRating.data) return;

  const { newWinnerRating, newLoserRating } = calculateElo(
    winnerRating.data.elo_rating,
    loserRating.data.elo_rating,
  );

  const now = new Date().toISOString();
  await Promise.all([
    supabase
      .from("ladder_ratings")
      .update({
        elo_rating: newWinnerRating,
        wins: winnerRating.data.wins + 1,
        last_played: now,
        updated_at: now,
      })
      .eq("user_id", winnerId)
      .eq("mode", "singles"),
    supabase
      .from("ladder_ratings")
      .update({
        elo_rating: newLoserRating,
        losses: loserRating.data.losses + 1,
        last_played: now,
        updated_at: now,
      })
      .eq("user_id", loserId)
      .eq("mode", "singles"),
  ]);
}

async function confirmDoubles(
  supabase: ReturnType<typeof createClient>,
  match: Record<string, unknown>,
) {
  const winningTeam = match.winning_team as string;
  const teamAIds = [match.player1_id as string, match.player2_id as string];
  const teamBIds = [match.player3_id as string, match.player4_id as string];
  const winnerIds = winningTeam === "a" ? teamAIds : teamBIds;
  const loserIds = winningTeam === "a" ? teamBIds : teamAIds;

  const allIds = [...winnerIds, ...loserIds];
  const { data: allRatings } = await supabase
    .from("ladder_ratings")
    .select("*")
    .in("user_id", allIds)
    .eq("mode", "doubles");

  if (!allRatings || allRatings.length < 4) return;

  const ratingMap = new Map(
    allRatings.map((r: { user_id: string }) => [r.user_id, r]),
  );
  const w1 = ratingMap.get(winnerIds[0]) as Record<string, number> | undefined;
  const w2 = ratingMap.get(winnerIds[1]) as Record<string, number> | undefined;
  const l1 = ratingMap.get(loserIds[0]) as Record<string, number> | undefined;
  const l2 = ratingMap.get(loserIds[1]) as Record<string, number> | undefined;

  if (!w1 || !w2 || !l1 || !l2) return;

  const { newWinnerRatings, newLoserRatings } = calculateDoublesElo(
    [w1.elo_rating, w2.elo_rating],
    [l1.elo_rating, l2.elo_rating],
  );

  const now = new Date().toISOString();
  await Promise.all([
    supabase
      .from("ladder_ratings")
      .update({
        elo_rating: newWinnerRatings[0],
        wins: w1.wins + 1,
        last_played: now,
        updated_at: now,
      })
      .eq("user_id", winnerIds[0])
      .eq("mode", "doubles"),
    supabase
      .from("ladder_ratings")
      .update({
        elo_rating: newWinnerRatings[1],
        wins: w2.wins + 1,
        last_played: now,
        updated_at: now,
      })
      .eq("user_id", winnerIds[1])
      .eq("mode", "doubles"),
    supabase
      .from("ladder_ratings")
      .update({
        elo_rating: newLoserRatings[0],
        losses: l1.losses + 1,
        last_played: now,
        updated_at: now,
      })
      .eq("user_id", loserIds[0])
      .eq("mode", "doubles"),
    supabase
      .from("ladder_ratings")
      .update({
        elo_rating: newLoserRatings[1],
        losses: l2.losses + 1,
        last_played: now,
        updated_at: now,
      })
      .eq("user_id", loserIds[1])
      .eq("mode", "doubles"),
  ]);
}
