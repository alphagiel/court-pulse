import type { SkillLevel } from "@/types/database";

const K_FACTOR = 32;

// Seed ELO from existing skill level
export function skillToElo(skill: SkillLevel): number {
  const map: Record<SkillLevel, number> = {
    "2.5": 800,
    "3.0": 1000,
    "3.5": 1200,
    "4.0": 1400,
    "4.5": 1600,
    "5.0": 1800,
  };
  return map[skill];
}

// Calculate new ELO ratings after a match
export function calculateElo(
  winnerRating: number,
  loserRating: number
): { newWinnerRating: number; newLoserRating: number } {
  const expectedWinner = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
  const expectedLoser = 1 / (1 + Math.pow(10, (winnerRating - loserRating) / 400));

  const newWinnerRating = Math.round(winnerRating + K_FACTOR * (1 - expectedWinner));
  const newLoserRating = Math.round(loserRating + K_FACTOR * (0 - expectedLoser));

  return { newWinnerRating, newLoserRating };
}

// Calculate new ELO ratings for a doubles match
// Uses team averages for the expected-score calculation,
// then applies the same delta to each player on the team.
export function calculateDoublesElo(
  winnerRatings: [number, number],
  loserRatings: [number, number]
): { newWinnerRatings: [number, number]; newLoserRatings: [number, number] } {
  const winnerAvg = (winnerRatings[0] + winnerRatings[1]) / 2;
  const loserAvg = (loserRatings[0] + loserRatings[1]) / 2;

  const expectedWinner = 1 / (1 + Math.pow(10, (loserAvg - winnerAvg) / 400));
  const expectedLoser = 1 / (1 + Math.pow(10, (winnerAvg - loserAvg) / 400));

  const winnerDelta = Math.round(K_FACTOR * (1 - expectedWinner));
  const loserDelta = Math.round(K_FACTOR * (0 - expectedLoser));

  return {
    newWinnerRatings: [
      winnerRatings[0] + winnerDelta,
      winnerRatings[1] + winnerDelta,
    ],
    newLoserRatings: [
      loserRatings[0] + loserDelta,
      loserRatings[1] + loserDelta,
    ],
  };
}

// Auto-balance 4 players into two teams with minimal ELO gap.
// Strategy: sort by ELO, pair highest+lowest vs two middles.
export function autoBalanceTeams(
  players: { userId: string; elo: number }[]
): { teamA: [string, string]; teamB: [string, string] } {
  const sorted = [...players].sort((a, b) => b.elo - a.elo);
  return {
    teamA: [sorted[0].userId, sorted[3].userId], // highest + lowest
    teamB: [sorted[1].userId, sorted[2].userId], // two middles
  };
}
