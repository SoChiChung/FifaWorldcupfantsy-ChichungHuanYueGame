/**
 * Round 3: 掐头去尾 — eliminate top 10 and bottom 10 by roundPoints.
 *
 * Only surviving players (not eliminated in previous rounds) participate.
 *
 * Tie-break:
 *   1. points     descending
 *   2. userId     ascending  (stable fallback)
 */
module.exports = function round3({ players, getStat, roundId, previousResults }) {

  // Build set of previously eliminated userIds
  const deadSet = new Set();
  for (const rid of Object.keys(previousResults)) {
    for (const e of (previousResults[rid].eliminated || [])) {
      deadSet.add(e.userId);
    }
  }

  // Only surviving players participate
  const alive = players.filter(p => !deadSet.has(p.userId));

  const ranking = alive
    .map(p => ({
      userId: p.userId,
      userName: p.userName,
      points: p.roundPoints
    }))
    .sort((a, b) =>
      b.points - a.points ||
      a.userId - b.userId
    );

  let tieDetected = false;

  // Check for tie at top-10 boundary (position 10 vs 11)
  if (ranking.length > 10) {
    const top10 = ranking[9];
    const top11 = ranking[10];
    if (top10 && top11 && top10.points === top11.points) {
      tieDetected = true;
    }
  }

  // Check for tie at bottom-10 boundary
  if (ranking.length > 10) {
    const bottom10 = ranking[ranking.length - 10];
    const bottom11 = ranking[ranking.length - 11];
    if (bottom10 && bottom11 && bottom10.points === bottom11.points) {
      tieDetected = true;
    }
  }

  const eliminated = [
    ...ranking.slice(0, 10),
    ...ranking.slice(-10)
  ];

  return {
    title: `Round ${roundId}: Cut Head and Tail`,
    description: '淘汰本轮得分前 10 名和后 10 名的玩家，合计淘汰 20 人。',
    ranking,
    eliminated,
    extra: {
      tieDetected,
      ...(tieDetected ? { message: 'Unable to determine eliminated players automatically.' } : {})
    }
  };
};
