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
