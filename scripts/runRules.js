const fs = require('fs');
const path = require('path');
const { loadConfig, loadPlayers, loadFootballers, loadResult, createGetStat } = require('./lib/data');

function runRules() {
  const config = loadConfig();
  const roundId = config.roundId;

  console.log(`Running rule for round ${roundId}...`);

  // Load data
  const players = loadPlayers();
  const footballers = loadFootballers();
  const getStat = createGetStat(footballers);

  // Load previous results
  const allResults = loadResult();
  const previousResults = {};
  for (const key of Object.keys(allResults)) {
    if (String(key) !== String(roundId)) {
      previousResults[key] = allResults[key];
    }
  }

  // Load the rule
  const rulePath = path.join(__dirname, '..', 'rules', `round${roundId}.js`);
  if (!fs.existsSync(rulePath)) {
    console.error(`ERROR: Rule file not found: ${rulePath}`);
    process.exit(1);
  }

  const rule = require(rulePath);

  if (typeof rule !== 'function') {
    console.error(`ERROR: Rule module must export a function`);
    process.exit(1);
  }

  // Execute
  const result = rule({ players, getStat, roundId, previousResults });

  // Validate output
  if (!result || !result.title || !result.ranking || !result.eliminated) {
    console.error('ERROR: Rule must return { title, description, ranking, eliminated, extra }');
    process.exit(1);
  }

  // Store result
  allResults[String(roundId)] = result;

  const outPath = path.join(__dirname, '..', 'data', 'result.json');
  fs.writeFileSync(outPath, JSON.stringify(allResults, null, 2));

  console.log(`Round ${roundId} results:`);
  console.log(`  Title: ${result.title}`);
  console.log(`  Rankings: ${result.ranking.length} players`);
  console.log(`  Eliminated: ${result.eliminated.map(e => e.userName).join(', ')}`);
  console.log(`Saved to data/result.json`);
}

runRules();
