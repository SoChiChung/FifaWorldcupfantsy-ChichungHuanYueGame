const fs = require('fs');
const path = require('path');
const { loadConfig, loadHuanyue } = require('./lib/data');
const { pool } = require('./lib/pool');

async function fetchPlayers() {
  const config = loadConfig();
  const huanyue = loadHuanyue();
  const { roundId, cookie } = config;

  if (!cookie) {
    console.error('No cookie in config.json');
    process.exit(1);
  }

  console.log(`Fetching ${huanyue.length} players for round ${roundId}...\n`);

  const tasks = huanyue.map((p) => {
    return async () => {
      const url = `https://play.fifa.com/api/en/fantasy/team/history/${roundId}/${p.userId}`;
      const res = await fetch(url, {
        headers: { Cookie: cookie, 'User-Agent': 'Mozilla/5.0' }
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const json = await res.json();
      const team = json.success;

      if (!team) {
        throw new Error('success is null');
      }

      return {
        userId: p.userId,
        userName: p.userName,
        roundPoints: team.roundPoints,
        overallPoints: team.overallPoints,
        captainChanges: (team.captainChanges || []).length,
        lineup: team.lineup,
        bench: team.bench,
        captain: team.captain,
        viceCaptain: team.vice
      };
    };
  });

  let ok = 0;
  let fail = 0;

  const results = await pool(tasks, {
    concurrency: 10,
    retries: 3,
    backoff: [1000, 2000, 4000],
    onRetry: (taskIndex, attempt, err) => {
      console.error(`  Retry ${attempt}: ${huanyue[taskIndex].userName} — ${err.message}`);
    },
    onProgress: (done, total) => {
      // Silent progress — summary at end
    }
  });

  const players = [];
  for (let i = 0; i < results.length; i++) {
    if (results[i]) {
      players.push(results[i]);
      ok++;
    } else {
      console.error(`  Failed: ${huanyue[i].userName}`);
      fail++;
    }
  }

  const outPath = path.join(__dirname, '..', 'data', 'players.json');
  fs.writeFileSync(outPath, JSON.stringify(players, null, 2));

  console.log(`\nDone. OK: ${ok}  Fail: ${fail}`);
  console.log(`Saved ${players.length} players to data/players.json\n`);
}

fetchPlayers().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
