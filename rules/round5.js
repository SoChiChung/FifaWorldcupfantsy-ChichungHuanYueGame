/**
 * Round 5: 奇数偶数大逃杀
 *
 * Rank surviving players by roundPoints descending.
 * Tie-break: roundPoints → overallPoints → userId
 *
 * qualifier = 1 (Spain)  → eliminate even ranks (2, 4, 6, ...)
 * qualifier = 2 (Portugal) → eliminate odd ranks  (1, 3, 5, ...)
 */
module.exports = function round5({ players, getStat, roundId, previousResults, qualifier }) {

  // Build set of previously eliminated userIds
  const deadSet = new Set();
  for (const rid of Object.keys(previousResults)) {
    for (const e of (previousResults[rid].eliminated || [])) {
      deadSet.add(e.userId);
    }
  }

  // Only surviving players participate
  const alive = players.filter(p => !deadSet.has(p.userId));

  // Rank by roundPoints desc, then overallPoints desc, then userId asc
  const ranking = alive
    .map(p => ({
      userId: p.userId,
      userName: p.userName,
      points: p.roundPoints,
      totalPoints: p.overallPoints
    }))
    .sort((a, b) =>
      b.points - a.points ||
      b.totalPoints - a.totalPoints ||
      a.userId - b.userId
    )
    .map((r, i) => ({ rank: i + 1, ...r }));

  // Determine which parity to eliminate
  let eliminated;
  let qualifierName;
  let eliminationType;

  if (qualifier === 1) {
    eliminated = ranking.filter(r => r.rank % 2 === 0);
    qualifierName = 'Spain';
    eliminationType = 'Even Rank';
  } else if (qualifier === 2) {
    eliminated = ranking.filter(r => r.rank % 2 === 1);
    qualifierName = 'Portugal';
    eliminationType = 'Odd Rank';
  } else {
    eliminated = [...ranking];
    qualifierName = 'Unknown';
    eliminationType = 'All';
  }

  return {
    title: `Round ${roundId}: Odd Even Battle Royale`,
    description: qualifier === 1
      ? 'Spain 晋级！淘汰排行榜上所有偶数排名的玩家。(单轮分数一致总分高者靠前，单轮分&总分一致userId少的靠前)'
      : qualifier === 2
        ? 'Portugal 晋级！淘汰排行榜上所有奇数排名的玩家。(单轮分数一致总分高者靠前，单轮分&总分一致userId少的靠前)'
        : 'qualifier 配置错误，全员淘汰。',
    ranking,
    eliminated,
    extra: { qualifier, qualifierName, eliminationType }
  };
};
