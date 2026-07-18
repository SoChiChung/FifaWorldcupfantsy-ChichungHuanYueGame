/**
 * Generate a Round 8 preview without calling FIFA APIs.
 * Run: node scripts/previewRound8.js
 */
const fs = require('fs');
const path = require('path');
const {
  loadConfig,
  loadPlayers,
  loadFootballers,
  loadFullFootballers,
  loadResult
} = require('./lib/data');

const ROOT = path.join(__dirname, '..');

function main() {
  const config = loadConfig();
  const players = loadPlayers();
  const footballers = loadFootballers();
  const fullFootballers = loadFullFootballers();
  const allResults = loadResult();
  const round7 = allResults['7'] || {};

  if (!Array.isArray(round7.qualified) || round7.qualified.length === 0) {
    throw new Error('Round 7 qualified list is missing. Settle Round 7 before generating Round 8 preview.');
  }

  const round8 = require('../rules/round8');
  const result = round8({
    players,
    footballers,
    fullFootballers,
    roundId: 8,
    previousResults: { '7': round7 },
    winningGoalPlayerIds: config.winningGoalPlayerIds,
    championTeamId: config.championTeamId,
    preview: true
  });

  allResults['8'] = result;
  const output = JSON.stringify(allResults, null, 2);
  fs.writeFileSync(path.join(ROOT, 'data', 'result.json'), output);
  fs.mkdirSync(path.join(ROOT, 'docs', 'data'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'docs', 'data', 'result.json'), output);

  console.log(`Round 8 preview saved for ${result.ranking.length} finalists.`);
  console.log('Scores are placeholders and will be replaced by the live update flow.');
}

main();
