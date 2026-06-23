const fs = require('fs');
const path = require('path');
const { loadConfig, loadPlayers } = require('./lib/data');
const { pool } = require('./lib/pool');

async function fetchFootballers() {
  const config = loadConfig();
  const players = loadPlayers();
  const { cookie } = config;

  console.log(`Loaded players: ${players.length}`);

  // Collect unique footballer IDs from starting lineups
  const idSet = new Set();
  const positions = ['GK', 'DEF', 'MID', 'FWD'];
  let slots = 0;

  for (const p of players) {
    const lineup = p.lineup || {};
    for (const pos of positions) {
      const arr = lineup[pos];
      if (!Array.isArray(arr)) continue;
      slots += arr.length;
      for (const id of arr) {
        idSet.add(id);
      }
    }
  }

  console.log(`Collected lineup slots: ${slots}`);
  console.log(`Unique footballers: ${idSet.size}\n`);

  const idList = Array.from(idSet);
  const footballers = {};

  const tasks = idList.map((id) => {
    return async () => {
      const url = `https://play.fifa.com/json/fantasy/player_stats/${id}.json`;
      const res = await fetch(url, {
        headers: { Cookie: cookie, 'User-Agent': 'Mozilla/5.0' }
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const rounds = await res.json();

      const entry = {};
      for (const r of rounds) {
        entry[String(r.roundId)] = {
          points: r.points,
          stats: r.stats
        };
      }

      return { id, entry };
    };
  });

  let ok = 0;
  let fail = 0;

  console.log('Fetching footballers...\n');

  const results = await pool(tasks, {
    concurrency: 10,
    retries: 3,
    backoff: [1000, 2000, 4000],
    onRetry: (taskIndex, attempt, err) => {
      console.error(`  Retry ${attempt}: player ${idList[taskIndex]} — ${err.message}`);
    },
    onProgress: (done, total) => {
      if (done % 20 === 0 || done === total) {
        console.log(`  ${done} / ${total}`);
      }
    }
  });

  for (const r of results) {
    if (r) {
      footballers[r.id] = r.entry;
      ok++;
    } else {
      fail++;
    }
  }

  const outPath = path.join(__dirname, '..', 'data', 'footballers.json');
  const jsonStr = JSON.stringify(footballers, null, 2);
  fs.writeFileSync(outPath, jsonStr);

  let roundEntries = 0;
  for (const id of Object.keys(footballers)) {
    roundEntries += Object.keys(footballers[id]).length;
  }

  console.log(`\nDone. OK: ${ok}  Fail: ${fail}`);
  console.log(`Footballers: ${Object.keys(footballers).length}`);
  console.log(`Round entries: ${roundEntries}`);
  console.log(`Output size: ${(jsonStr.length / 1024).toFixed(1)} KB\n`);
}

fetchFootballers().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
