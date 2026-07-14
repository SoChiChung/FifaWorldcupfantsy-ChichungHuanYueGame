/**
 * Round 7: 八强小组赛
 *
 * 34 surviving players → 8 groups (A~H).
 * A/B: 5 players, C~H: 4 players.
 * Group assignment by Round 6 ranking (fixed serpentine).
 * Team assignment by seed (1=Argentina, 2=England, 3=France, 4=Spain).
 * A5/B5 get random team via deterministic pseudo-random seed.
 * finalPoints = roundPoints + team bonus.
 * Group winner advances; rest eliminated.
 *
 * Tie-break: bonus desc → overallPoints desc → userId asc
 */
module.exports = function round7({ players, getStat, roundId, previousResults, qualifier, bonuses }) {

  // ── 1. Filter dead players ──────────────────
  const deadSet = new Set();
  for (const rid of Object.keys(previousResults)) {
    for (const e of (previousResults[rid].eliminated || [])) {
      deadSet.add(e.userId);
    }
  }
  const alive = players.filter(p => !deadSet.has(p.userId));

  // ── 2. Get Round 6 ranking order ───────────
  const r6ranking = (previousResults['6'] && previousResults['6'].ranking) || [];
  const r6Order = new Map();
  r6ranking.forEach((r, i) => r6Order.set(r.userId, i));

  // Sort alive players by R6 rank (missing → append at end by userId)
  const sorted = [...alive].sort((a, b) => {
    const ia = r6Order.has(a.userId) ? r6Order.get(a.userId) : 9999;
    const ib = r6Order.has(b.userId) ? r6Order.get(b.userId) : 9999;
    return ia - ib || a.userId - b.userId;
  });

  // ── 3. Assign groups ────────────────────────
  const GROUP_NAMES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const TEAMS = ['Argentina', 'England', 'France', 'Spain'];
  const TEAM_BY_SEED = { 1: 'Argentina', 2: 'England', 3: 'France', 4: 'Spain' };

  const groups = {};
  for (const g of GROUP_NAMES) groups[g] = [];

  for (let i = 0; i < Math.min(32, sorted.length); i++) {
    const groupIdx = i % 8;
    const seed = Math.floor(i / 8) + 1;   // 1, 2, 3, 4
    groups[GROUP_NAMES[groupIdx]].push({
      ...sorted[i],
      seed,
      assignedTeam: TEAM_BY_SEED[seed]
    });
  }

  // A5 and B5 (positions 32 and 33 in 0-based)
  function seededPick(seed, options) {
    const r = ((seed * 1103515245 + 12345) >>> 0) % options.length;
    return options[r];
  }

  if (sorted.length > 32) {
    const a5 = sorted[32];
    const a5team = seededPick(7 * 10000 + a5.userId, TEAMS);
    groups['A'].push({ ...a5, seed: 5, assignedTeam: a5team });
  }
  if (sorted.length > 33) {
    const b5 = sorted[33];
    const b5team = seededPick(7 * 10000 + b5.userId, TEAMS);
    groups['B'].push({ ...b5, seed: 5, assignedTeam: b5team });
  }

  // ── 4. Calculate scores ─────────────────────
  for (const g of GROUP_NAMES) {
    groups[g] = groups[g].map(p => {
      const bonus = (bonuses && bonuses[p.assignedTeam]) || 0;
      const finalPoints = (p.roundPoints || 0) + bonus;
      return {
        userId: p.userId,
        userName: p.userName,
        seed: p.seed,
        assignedTeam: p.assignedTeam,
        roundPoints: p.roundPoints || 0,
        overallPoints: p.overallPoints || 0,
        bonus,
        finalPoints,
        qualified: false
      };
    });
  }

  // ── 5. Determine group winners ──────────────
  for (const g of GROUP_NAMES) {
    groups[g].sort((a, b) =>
      b.finalPoints - a.finalPoints ||
      b.bonus - a.bonus ||
      b.overallPoints - a.overallPoints ||
      a.userId - b.userId
    );
    groups[g][0].qualified = true;
  }

  // ── 6. Build output ─────────────────────────
  const qualified = [];
  const eliminated = [];
  const ranking = [];

  for (const g of GROUP_NAMES) {
    for (const p of groups[g]) {
      const entry = { ...p, group: g };
      ranking.push(entry);
      if (p.qualified) {
        qualified.push(entry);
      } else {
        eliminated.push(entry);
      }
    }
  }

  ranking.sort((a, b) =>
    b.finalPoints - a.finalPoints ||
    b.bonus - a.bonus ||
    b.overallPoints - a.overallPoints ||
    a.userId - b.userId
  );
  ranking.forEach((r, i) => { r.rank = i + 1; });

  return {
    title: `Round ${roundId}: Quarter-Final Group Stage`,
    description: `八强小组赛：34名玩家分入A~H八组，每组最高分晋级四分之一决赛。${qualified.length}人晋级下一轮。`,
    groups,
    ranking,
    qualified,
    eliminated,
    extra: {
      teamBonuses: bonuses,
      a5Team: groups['A'].find(p => p.seed === 5)?.assignedTeam || null,
      b5Team: groups['B'].find(p => p.seed === 5)?.assignedTeam || null,
      aliveCount: alive.length
    }
  };
};
