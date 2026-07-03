/**
 * Round 4: 不许多动症
 *
 * Group surviving players by captainChanges, walk from highest to lowest.
 * Once accumulated ≥ 10, keep swallowing next bins while their size ≤ accumulated total.
 * All players in swallowed bins are eliminated.
 */
module.exports = function round4({ players, getStat, roundId, previousResults }) {

  // Build set of previously eliminated userIds
  const deadSet = new Set();
  for (const rid of Object.keys(previousResults)) {
    for (const e of (previousResults[rid].eliminated || [])) {
      deadSet.add(e.userId);
    }
  }

  // Only surviving players participate
  const alive = players.filter(p => !deadSet.has(p.userId));

  // Group by captainChanges, sorted descending by value
  const groups = new Map();
  for (const p of alive) {
    const v = p.captainChanges || 0;
    if (!groups.has(v)) groups.set(v, []);
    groups.get(v).push(p);
  }

  const sortedValues = Array.from(groups.keys()).sort((a, b) => b - a);

  // Walk bins: accumulate until ≥ 10, then swallow next bins while size ≤ accumulated
  let accumulated = 0;
  let triggered = false;
  let maxChanges = 0;
  let minChanges = 0;

  for (let i = 0; i < sortedValues.length; i++) {
    const v = sortedValues[i];
    const size = groups.get(v).length;

    if (!triggered) {
      accumulated += size;

      if (accumulated >= 10) {
        triggered = true;
        maxChanges = sortedValues[0];
        minChanges = v;
      }
    } else {
      // Swallow if next bin's size ≤ current accumulated
      if (size <= accumulated) {
        accumulated += size;
        minChanges = v;
      } else {
        break;
      }
    }
  }

  // If never triggered (total alive < 10), eliminate everyone
  if (!triggered) {
    return {
      title: `Run for：不许多动症`,
      description: '存活玩家不足 10 人，全员淘汰。',
      ranking: alive
        .sort((a, b) => (b.captainChanges || 0) - (a.captainChanges || 0) || a.userId - b.userId)
        .map(p => ({ userId: p.userId, userName: p.userName, captainChanges: p.captainChanges || 0 })),
      eliminated: alive.map(p => ({ userId: p.userId, userName: p.userName, captainChanges: p.captainChanges || 0 })),
      extra: { maxChanges: sortedValues[0] || 0, minChanges: sortedValues[sortedValues.length - 1] || 0, eliminatedCount: alive.length }
    };
  }

  // Build eliminated list: all players whose captainChanges is in [minChanges, maxChanges]
  const ranking = alive
    .sort((a, b) => (b.captainChanges || 0) - (a.captainChanges || 0) || a.userId - b.userId)
    .map(p => ({ userId: p.userId, userName: p.userName, captainChanges: p.captainChanges || 0 }));

  const eliminated = ranking.filter(r =>
    r.captainChanges >= minChanges && r.captainChanges <= maxChanges
  );

  return {
    title: `Run for：不许多动症`,
    description: '不许多动症：按更换队长次数分档统计，逐档累计达到10人后继续吞并后续小档位，区间内全部淘汰。',
    ranking,
    eliminated,
    extra: {
      maxChanges,
      minChanges,
      eliminatedCount: eliminated.length
    }
  };
};
