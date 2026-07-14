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
const GROUP_NAMES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
const GROUP_COUNT = GROUP_NAMES.length;
const TEAM_BY_SEED = { 1: 'Argentina', 2: 'England', 3: 'France', 4: 'Spain' };

function main() {
  const config = loadConfig();
  const huanyue = loadHuanyue();
  const allResults = loadResult();
  const bonuses = config.bonuses || {};

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

  // Assign groups — serpentine, fixed seed→team mapping
  const groups = {};
  for (const g of GROUP_NAMES) groups[g] = [];

  for (let i = 0; i < alive.length; i++) {
    const groupIdx = i % GROUP_COUNT;
    const seed = Math.floor(i / GROUP_COUNT) + 1;
    groups[GROUP_NAMES[groupIdx]].push({
      userId: alive[i].userId,
      userName: alive[i].userName,
      seed,
      assignedTeam: TEAM_BY_SEED[seed]
    });
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
    title: 'Round 7: Group Stage (Preview)',
    description: '小组赛分组预览 — 分数将在比赛开始后更新。',
    groups,
    ranking: [],
    qualified: [],
    eliminated: [],
    extra: {
      teamBonuses: bonuses,
      groupCount: GROUP_COUNT,
      aliveCount: alive.length,
      preview: true
    }
  };

  const existingResult = loadResult();
  existingResult['7'] = result;

  const dataPath = path.join(ROOT, 'data', 'result.json');
  fs.writeFileSync(dataPath, JSON.stringify(existingResult, null, 2));

  const docsDir = path.join(ROOT, 'docs', 'data');
  if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
  const docsPath = path.join(docsDir, 'result.json');
  fs.writeFileSync(docsPath, JSON.stringify(existingResult, null, 2));

  console.log(`Groups (4 players each):`);
  for (const g of GROUP_NAMES) {
    const names = groups[g].map(p => `${p.userName}(${p.assignedTeam})`).join(', ');
    console.log(`  ${g}: ${names}`);
  }
  console.log(`\nPreview saved to data/result.json and docs/data/result.json`);
}

main();
