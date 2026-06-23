/**
 * Round 2 Rule: Eliminate the 5 players with lowest total Shots on Target (ST)
 * from their starting 11.
 *
 * Input:
 *   players  — array of player team data from players.json
 *   getStat  — function(playerId, roundId, statName) => number
 *   roundId  — current round number
 *
 * Output:
 *   { title, description, ranking, eliminated, extra }
 */
module.exports = function round2({ players, getStat, roundId }) {
  const positions = ['GK', 'DEF', 'MID', 'FWD'];

  const withST = players.map(p => {
    let totalST = 0;
    const lineup = p.lineup || {};

    for (const pos of positions) {
      const arr = lineup[pos];
      if (!Array.isArray(arr)) continue;
      for (const fp of arr) {
        const id = fp.id || fp.playerId || fp.footballerId;
        if (id != null) {
          totalST += getStat(id, roundId, 'ST');
        }
      }
    }

    return {
      userId: p.userId,
      userName: p.userName,
      totalST
    };
  });

  // Sort descending by ST, ties broken by userId for stability
  withST.sort((a, b) => b.totalST - a.totalST || a.userId - b.userId);

  const eliminated = withST.slice(-5);

  return {
    title: `Round ${roundId}: Lowest Shots on Target`,
    description: '淘汰首发 11 人射正（ST）总数最少的 5 位范特西玩家。',
    ranking: withST,
    eliminated,
    extra: {}
  };
};
