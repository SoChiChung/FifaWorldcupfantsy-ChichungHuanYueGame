/**
 * Round 2: Eliminate the 5 players with lowest total ST from starting 11.
 */
module.exports = function round2({ players, getStat, roundId }) {
  const positions = ['GK', 'DEF', 'MID', 'FWD'];

  const ranking = players.map(p => {
    let totalST = 0;
    const lineup = p.lineup || {};
    for (const pos of positions) {
      for (const playerId of (lineup[pos] || [])) {
        totalST += getStat(playerId, roundId, 'ST');
      }
    }
    return {
      userId: p.userId,
      userName: p.userName,
      totalST
    };
  });

  ranking.sort((a, b) => b.totalST - a.totalST || a.userId - b.userId);

  const eliminated = ranking.slice(-5);

  return {
    title: `Round ${roundId}: Lowest Shots on Target`,
    description: '淘汰首发 11 人射正（ST）总数最少的 5 位范特西玩家。',
    ranking,
    eliminated,
    extra: {}
  };
};
