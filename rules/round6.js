/**
 * Round 6: 消消乐 (Match-Three Elimination)
 *
 * If 3 or more surviving players share the same roundPoints in this round,
 * all players in that score group are eliminated.
 *
 * No elimination cap — every qualifying group is eliminated in full.
 * Groups of 1 or 2 players are safe.
 */
module.exports = function round6({ players, getStat, roundId, previousResults }) {

  // Build set of previously eliminated userIds (Round2～Round5)
  const deadSet = new Set();
  for (const rid of Object.keys(previousResults)) {
    for (const e of (previousResults[rid].eliminated || [])) {
      deadSet.add(e.userId);
    }
  }

  // Only surviving players participate
  const alive = players.filter(p => !deadSet.has(p.userId));

  // Group by roundPoints
  const groups = new Map();
  for (const p of alive) {
    const pts = p.roundPoints;
    if (!groups.has(pts)) groups.set(pts, []);
    groups.get(pts).push(p);
  }

  // Execute match-three rule: groups with ≥3 members are eliminated entirely
  const eliminated = [];
  const eliminatedGroups = [];
  for (const [points, members] of groups) {
    if (members.length >= 3) {
      eliminatedGroups.push({ points, count: members.length });
      for (const m of members) {
        eliminated.push({ userId: m.userId, userName: m.userName, points });
      }
    }
  }

  // Build ranking: roundPoints descending → userId ascending, with natural rank
  const ranking = alive
    .sort((a, b) => b.roundPoints - a.roundPoints || a.userId - b.userId)
    .map((p, i) => ({
      rank: i + 1,
      userId: p.userId,
      userName: p.userName,
      points: p.roundPoints
    }));

  return {
    title: `Round ${roundId}: Match-Three Elimination`,
    description: '消消乐：本轮得分相同的存活玩家中，若同一分数人数 ≥3，则该分数段全员淘汰。',
    ranking,
    eliminated,
    extra: { eliminatedGroups }
  };
};
