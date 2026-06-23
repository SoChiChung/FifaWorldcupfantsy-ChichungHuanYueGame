const fs = require('fs');
const path = require('path');
const { loadConfig, loadHuanyue } = require('./lib/data');

async function fetchPlayers() {
  const config = loadConfig();
  const huanyue = loadHuanyue();
  const { roundId, cookie } = config;

  if (!cookie) {
    console.error('ERROR: No cookie found in config.json');
    process.exit(1);
  }

  console.log(`Fetching team history for round ${roundId}...`);
  console.log(`Players to fetch: ${huanyue.length}`);

  const players = [];
  let success = 0;
  let fail = 0;

  for (let i = 0; i < huanyue.length; i++) {
    const p = huanyue[i];
    const url = `https://play.fifa.com/api/en/fantasy/team/history/${roundId}/${p.userId}`;

    try {
      const res = await fetch(url, {
        headers: {
          'Cookie': cookie,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!res.ok) {
        console.error(`[${i + 1}/${huanyue.length}] ${p.userName} (${p.userId}): HTTP ${res.status}`);
        fail++;
        continue;
      }

      const data = await res.json();
      players.push({
        userId: p.userId,
        userName: p.userName,
        roundId: roundId,
        points: data.points || data.roundPoints || 0,
        lineup: data.lineup || {},
        bench: data.bench || data.substitutes || [],
        captain: data.captain || null,
        viceCaptain: data.viceCaptain || null,
        raw: data
      });

      console.log(`[${i + 1}/${huanyue.length}] ${p.userName}: OK`);
      success++;

    } catch (err) {
      console.error(`[${i + 1}/${huanyue.length}] ${p.userName}: ${err.message}`);
      fail++;
    }
  }

  const outPath = path.join(__dirname, '..', 'data', 'players.json');
  fs.writeFileSync(outPath, JSON.stringify(players, null, 2));
  console.log(`\nDone. Success: ${success}, Failed: ${fail}`);
  console.log(`Saved to data/players.json`);
}

fetchPlayers().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
