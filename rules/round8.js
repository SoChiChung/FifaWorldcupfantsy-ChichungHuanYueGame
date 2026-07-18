/**
 * Round 8: Final round.
 * Ranking: finalPoints -> captainPoints -> champion starters -> overallPoints -> userId.
 */
module.exports = function round8({
  players,
  footballers = {},
  fullFootballers = [],
  roundId = 8,
  previousResults = {},
  winningGoalPlayerIds = [],
  championTeamId = null,
  preview = false
}) {
  const round7 = previousResults['7'] || {};
  const qualified = Array.isArray(round7.qualified) ? round7.qualified : [];
  const playerById = new Map(players.map(player => [player.userId, player]));
  const dataPending = preview || qualified.some(entry => !playerById.has(entry.userId));
  const fullById = new Map((Array.isArray(fullFootballers) ? fullFootballers : []).map(player => [String(player.id), player]));
  const winningGoalIds = new Set((Array.isArray(winningGoalPlayerIds) ? winningGoalPlayerIds : []).map(Number));
  const positions = ['GK', 'DEF', 'MID', 'FWD'];

  function getFootballer(id) {
    if (id == null) return null;
    return fullById.get(String(id)) || null;
  }

  function getRoundPoints(id) {
    const full = getFootballer(id);
    const fullPoints = full?.stats?.roundPoints?.[String(roundId)];
    if (Number.isFinite(Number(fullPoints))) return Number(fullPoints);

    const legacy = footballers[String(id)]?.[String(roundId)];
    if (Number.isFinite(Number(legacy?.points))) return Number(legacy.points);
    if (Number.isFinite(Number(legacy?.stats?.roundPoints))) return Number(legacy.stats.roundPoints);
    return 0;
  }

  function getLineupIds(player) {
    return positions.flatMap(position => Array.isArray(player?.lineup?.[position]) ? player.lineup[position] : []);
  }

  const ranking = qualified.map((qualifiedEntry) => {
    // Round 7 entries only identify finalists. Never use their old roundPoints
    // as Round 8 scores when the current-round API has no player record.
    const player = playerById.get(qualifiedEntry.userId) || {};
    const lineupPlayerIds = getLineupIds(player);
    const matchedWinningGoalPlayerIds = lineupPlayerIds.filter(id => winningGoalIds.has(Number(id)));
    const winningGoalBonus = matchedWinningGoalPlayerIds.length > 0 ? 5 : 0;
    const basePoints = dataPending ? 0 : Number(player.roundPoints || 0);
    const captainId = player.captain ?? null;
    const captainPoints = getRoundPoints(captainId);
    const championStarterCount = championTeamId == null ? 0 : lineupPlayerIds.reduce((count, id) => {
      return count + (getFootballer(id)?.squadId === championTeamId ? 1 : 0);
    }, 0);

    return {
      userId: player.userId,
      userName: player.userName || qualifiedEntry.userName,
      basePoints,
      winningGoalBonus,
      finalPoints: basePoints + winningGoalBonus,
      captainId,
      captainPoints,
      championStarterCount,
      hasWinningGoalPlayer: matchedWinningGoalPlayerIds.length > 0,
      winningGoalPlayerIds: matchedWinningGoalPlayerIds,
      overallPoints: Number(player.overallPoints || qualifiedEntry.overallPoints || 0),
      isPreview: dataPending
    };
  });

  ranking.sort((a, b) =>
    b.finalPoints - a.finalPoints ||
    b.captainPoints - a.captainPoints ||
    b.championStarterCount - a.championStarterCount ||
    b.overallPoints - a.overallPoints ||
    a.userId - b.userId
  );
  ranking.forEach((entry, index) => { entry.rank = index + 1; });

  const warning = qualified.length !== 9
    ? `Round 7 qualified ${qualified.length} players; expected 9.`
    : null;

  return {
    title: 'Round 8: Final Round',
    description: '9 名玩家按最终得分排名：本轮基础得分+Bonus；Bonus规则：持有在两场比赛取得Winningoal的球员，每个+5分，如果是点球大战，则按点球大战胜利方最后一位破平队员计算',
    ranking,
    qualified: [],
    eliminated: [],
    extra: {
      preview: dataPending,
      dataStatus: dataPending ? 'pending' : 'live',
      finalistCount: qualified.length,
      finalists: qualified.map(entry => ({ userId: entry.userId, userName: entry.userName, group: entry.group })),
      winningGoalPlayerIds: Array.isArray(winningGoalPlayerIds) ? winningGoalPlayerIds : [],
      championTeamId,
      bonusPoints: 5,
      warning
    }
  };
};
