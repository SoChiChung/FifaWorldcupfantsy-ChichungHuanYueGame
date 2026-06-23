/**
 * Round 2: Eliminate the 5 players with lowest total ST from starting 11.
 *
 * Tie-break:
 *   1. totalST   descending (more = better)
 *   2. totalGS   descending (more = better)
 *   3. totalMP   ascending  (less = better)
 *   4. userId    ascending  (stable fallback)
 */
module.exports = function round2({ players, getStat, roundId }) {
  const positions = ['GK', 'DEF', 'MID', 'FWD'];

  const ranking = players.map(p => {
    let totalST = 0;
    let totalGS = 0;
    let totalMP = 0;
    const lineup = p.lineup || {};

    for (const pos of positions) {
      for (const playerId of (lineup[pos] || [])) {
        totalST += getStat(playerId, roundId, 'ST');
        totalGS += getStat(playerId, roundId, 'GS');
        totalMP += getStat(playerId, roundId, 'MP');
      }
    }

    return { userId: p.userId, userName: p.userName, totalST, totalGS, totalMP };
  });

  ranking.sort((a, b) =>
    b.totalST - a.totalST ||
    b.totalGS - a.totalGS ||
    a.totalMP - b.totalMP ||
    a.userId - b.userId
  );

  // Check for unresolvable tie at the cut boundary (5th vs 6th worst)
  let tieDetected = false;
  if (ranking.length > 5) {
    const a = ranking[ranking.length - 5];
    const b = ranking[ranking.length - 6];
    tieDetected =
      a.totalST === b.totalST &&
      a.totalGS === b.totalGS &&
      a.totalMP === b.totalMP;
  }

  const eliminated = ranking.slice(-5);

  return {
    title: `Round ${roundId}: Lowest Shots on Target`,
    description: '淘汰首发 11 人射正总数最少的 5 位范特西玩家。（射正一样进球多者胜出，两者一样总时间短者胜出）',
    ranking,
    eliminated,
    extra: {
      tieDetected,
      ...(tieDetected ? { message: 'Unable to determine eliminated players automatically.' } : {})
    }
  };
};
