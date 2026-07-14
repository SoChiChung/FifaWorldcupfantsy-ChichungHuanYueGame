/**
 * Preview Round 7 group assignments — no API calls needed.
 * Uses: huanyue.json (names) + result.json (R6 ranking + dead players).
 *
 * Run: node scripts/previewRound7.js
 */
const fs = require('fs');
const path = require('path');
const { loadConfig, loadHuanyue, loadResult } = require('./lib/data');

const ROOT = path.join(__dirname, '..');
const GROUP_NAMES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const TEAMS = ['Argentina', 'England', 'France', 'Spain'];
const TEAM_BY_SEED = { 1: 'Argentina', 2: 'England', 3: 'France', 4: 'Spain' };

function seededPick(seed, options) {
  const r = ((seed * 1103515245 + 12345) >>> 0) % options.length;
  return options[r];
}

function main() {
  const config = loadConfig();
  const huanyue = loadHuanyue();
  const allResults = loadResult();
  const bonuses = config.bonuses || {};

  // Build name lookup
  const nameMap = {};
  for (const p of huanyue) {
    nameMap[p.userId] = p.userName;
  }

  // Build dead set from ALL previous rounds
  const deadSet = new Set();
  for (const rid of Object.keys(allResults)) {
    for (const e of (allResults[rid].eliminated || [])) {
      deadSet.add(e.userId);
    }
  }

  // Get R6 ranking order
  const r6ranking = (allResults['6'] && allResults['6'].ranking) || [];
  const r6Order = new Map();
  r6ranking.forEach((r, i) => r6Order.set(r.userId, i));

  // All players from huanyue — skip dead ones
  const alive = huanyue.filter(p => !deadSet.has(p.userId));

  // Sort by R6 rank
  alive.sort((a, b) => {
    const ia = r6Order.has(a.userId) ? r6Order.get(a.userId) : 9999;
    const ib = r6Order.has(b.userId) ? r6Order.get(b.userId) : 9999;
    return ia - ib || a.userId - b.userId;
  });

  console.log(`Alive players: ${alive.length}`);

  // Assign groups
  const groups = {};
  for (const g of GROUP_NAMES) groups[g] = [];

  for (let i = 0; i < Math.min(32, alive.length); i++) {
    const groupIdx = i % 8;
    const seed = Math.floor(i / 8) + 1;
    groups[GROUP_NAMES[groupIdx]].push({
      userId: alive[i].userId,
      userName: alive[i].userName,
      seed,
      assignedTeam: TEAM_BY_SEED[seed]
    });
  }

  if (alive.length > 32) {
    const a5 = alive[32];
    groups['A'].push({ userId: a5.userId, userName: a5.userName, seed: 5,
      assignedTeam: seededPick(7 * 10000 + a5.userId, TEAMS) });
  }
  if (alive.length > 33) {
    const b5 = alive[33];
    groups['B'].push({ userId: b5.userId, userName: b5.userName, seed: 5,
      assignedTeam: seededPick(7 * 10000 + b5.userId, TEAMS) });
  }

  // Build preview entries with placeholder scores
  for (const g of GROUP_NAMES) {
    groups[g] = groups[g].map(p => ({
      ...p,
      roundPoints: 0,
      overallPoints: 0,
      bonus: bonuses[p.assignedTeam] || 0,
      finalPoints: 0,
      qualified: false,
      isPreview: true
    }));
  }

  // Build result
  const result = {
    title: 'Round 7: Quarter-Final Group Stage (Preview)',
    description: '八强小组赛分组预览 — 分数将在比赛开始后更新。',
    groups,
    ranking: [],
    qualified: [],
    eliminated: [],
    extra: {
      teamBonuses: bonuses,
      a5Team: groups['A'].find(p => p.seed === 5)?.assignedTeam || null,
      b5Team: groups['B'].find(p => p.seed === 5)?.assignedTeam || null,
      aliveCount: alive.length,
      preview: true
    }
  };

  // Write to both locations
  const existingResult = loadResult();
  existingResult['7'] = result;

  const dataPath = path.join(ROOT, 'data', 'result.json');
  fs.writeFileSync(dataPath, JSON.stringify(existingResult, null, 2));

  const docsDir = path.join(ROOT, 'docs', 'data');
  if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
  const docsPath = path.join(docsDir, 'result.json');
  fs.writeFileSync(docsPath, JSON.stringify(existingResult, null, 2));

  console.log(`Groups:`);
  for (const g of GROUP_NAMES) {
    const names = groups[g].map(p => `${p.userName}(${p.assignedTeam})`).join(', ');
    console.log(`  ${g}: ${names}`);
  }
  console.log(`\nPreview saved to data/result.json and docs/data/result.json`);
}

main();
