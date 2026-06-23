/**
 * Round 1: Eliminate the player with the lowest roundPoints.
 */
module.exports = function round1({ players, getStat, roundId }) {
  const ranking = players
    .map(p => ({
      userId: p.userId,
      userName: p.userName,
      points: p.roundPoints
    }))
    .sort((a, b) => b.points - a.points);

  const eliminated = [ranking[ranking.length - 1]];

  return {
    title: `Round ${roundId}: Lowest Total Points`,
    description: '淘汰总分最低的 1 位范特西玩家。',
    ranking,
    eliminated,
    extra: {}
  };
};
