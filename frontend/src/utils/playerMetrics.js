export const RANK_TIERS = [
  { label: "Novice", minRating: 0 },
  { label: "Warrior", minRating: 1200 },
  { label: "Expert", minRating: 1500 },
  { label: "Master", minRating: 1800 },
  { label: "Grandmaster", minRating: 2200 },
];

export function deriveRank(rating) {
  const score = Number(rating) || 0;

  if (score >= 2200) return "Grandmaster";
  if (score >= 1800) return "Master";
  if (score >= 1500) return "Expert";
  if (score >= 1200) return "Warrior";
  return "Novice";
}

export function normalizeUserStats(profile = {}) {
  const rating = Number(profile?.rating ?? 1200);
  const matchesPlayed = Number(profile?.matchesPlayed ?? 0);
  const matchesWon = Number(profile?.matchesWon ?? 0);

  const solvedFromIds = Array.isArray(profile?.practiceSolvedProblemIds)
    ? profile.practiceSolvedProblemIds.length
    : 0;

  const practiceSolved = Number(profile?.practiceSolvedCount ?? solvedFromIds);
  const practiceSubmissions = Number(profile?.practiceSubmissionCount ?? 0);

  const lossCount = Math.max(0, matchesPlayed - matchesWon);
  const winRate = matchesPlayed > 0 ? Math.round((matchesWon / matchesPlayed) * 100) : 0;
  const practiceAccuracy =
    practiceSubmissions > 0 ? Math.round((practiceSolved / practiceSubmissions) * 100) : 0;

  return {
    rating,
    matchesPlayed,
    matchesWon,
    lossCount,
    practiceSolved,
    practiceSubmissions,
    winRate,
    practiceAccuracy,
    rank: deriveRank(rating),
  };
}

export function calculateArenaPointBreakdown(stats) {
  const safeStats = normalizeUserStats(stats);

  const ratingPoints = Math.max(0, safeStats.rating - 1000);
  const battleWinPoints = safeStats.matchesWon * 120;
  const practiceSolvedPoints = safeStats.practiceSolved * 50;
  const participationPoints = safeStats.lossCount * 20;

  const total = ratingPoints + battleWinPoints + practiceSolvedPoints + participationPoints;

  return {
    total,
    ratingPoints,
    battleWinPoints,
    practiceSolvedPoints,
    participationPoints,
  };
}

export function getRankProgressByRating(rating) {
  const score = Number(rating) || 0;
  const currentTierIndex = RANK_TIERS.reduce((bestIndex, tier, index) => {
    if (score >= tier.minRating) return index;
    return bestIndex;
  }, 0);

  const currentTier = RANK_TIERS[currentTierIndex];
  const nextTier = RANK_TIERS[currentTierIndex + 1] || currentTier;

  const progressWithinTier =
    nextTier.minRating === currentTier.minRating
      ? 100
      : Math.min(
          100,
          Math.max(
            0,
            ((score - currentTier.minRating) / (nextTier.minRating - currentTier.minRating)) * 100
          )
        );

  // This drives the visual bar in Rewards: current rating as a percentage of the next tier threshold.
  const progressToNext =
    nextTier.minRating === 0
      ? 100
      : Math.min(100, Math.max(0, (score / nextTier.minRating) * 100));

  const ratingToNextTier = Math.max(0, nextTier.minRating - score);

  return {
    currentTier,
    nextTier,
    currentTierIndex,
    progressToNext,
    progressWithinTier,
    ratingToNextTier,
  };
}
