const fs = require('fs');
const path = require('path');
const { loadConfig, loadPlayers, loadFootballers, loadResult, createGetStat } = require('./lib/data');

function runRules() {
  const config = loadConfig();
  const roundId = config.roundId;

  console.log(`Round ${roundId}\n`);

  const players = loadPlayers();
  const footballers = loadFootballers();
  const getStat = createGetStat(footballers);

  console.log(`Players: ${players.length}`);
  console.log(`Footballers: ${Object.keys(footballers).length}`);

  // Load previous results
  const allResults = loadResult();
  const previousResults = {};
  for (const key of Object.keys(allResults)) {
    if (String(key) !== String(roundId)) {
      previousResults[key] = allResults[key];
    }
  }

  // Load and execute rule
  const rulePath = path.join(__dirname, '..', 'rules', `round${roundId}.js`);

  if (!fs.existsSync(rulePath)) {
    console.error(`ERROR: Rule not found: rules/round${roundId}.js`);
    process.exit(1);
  }

  const rule = require(rulePath);
  const result = rule({ players, getStat, roundId, previousResults, qualifier: config.qualifier });

  if (!result || !result.title || !result.ranking || !result.eliminated) {
    console.error('ERROR: Rule must return { title, description, ranking, eliminated, extra }');
    process.exit(1);
  }

  allResults[String(roundId)] = result;

  const outPath = path.join(__dirname, '..', 'data', 'result.json');
  fs.writeFileSync(outPath, JSON.stringify(allResults, null, 2));

  console.log(`\n${result.title}`);
  console.log(`${result.description}`);
  console.log(`\nEliminated: ${result.eliminated.map(e => e.userName).join(', ')}`);
  console.log(`Saved to data/result.json\n`);
}

runRules();
