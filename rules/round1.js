/**
 * Round 1 Rule: Eliminate the player with the lowest total points.
 *
 * Input:
 *   players  — array of player team data from players.json
 *   getStat  — function(playerId, roundId, statName) => number
 *   roundId  — current round number
 *
 * Output:
 *   { title, description, ranking, eliminated, extra }
 */
module.exports = function round1({ players, getStat, roundId }) {
  const ranking = players
    .map(p => ({
      userId: p.userId,
      userName: p.userName,
      points: p.points || 0
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
