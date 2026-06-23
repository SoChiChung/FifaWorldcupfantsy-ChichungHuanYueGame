const fs = require('fs');
const path = require('path');
const { loadConfig, loadPlayers } = require('./lib/data');

async function fetchFootballers() {
  const config = loadConfig();
  const { cookie } = config;

  if (!cookie) {
    console.error('ERROR: No cookie found in config.json');
    process.exit(1);
  }

  const players = loadPlayers();
  console.log(`Loaded ${players.length} players from players.json`);

  // Collect unique player IDs from starting lineups
  const playerIds = new Set();
  for (const p of players) {
    const lineup = p.lineup || {};
    const positions = ['GK', 'DEF', 'MID', 'FWD'];
    for (const pos of positions) {
      const arr = lineup[pos];
      if (!Array.isArray(arr)) continue;
      for (const fp of arr) {
        const id = fp.id || fp.playerId || fp.footballerId;
        if (id != null) playerIds.add(String(id));
      }
    }
  }

  console.log(`Unique footballer IDs found: ${playerIds.size}`);

  const footballers = {};
  let success = 0;
  let fail = 0;
  const ids = Array.from(playerIds);

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const url = `https://play.fifa.com/json/fantasy/player_stats/${id}.json`;

    try {
      const res = await fetch(url, {
        headers: {
          'Cookie': cookie,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!res.ok) {
        console.error(`[${i + 1}/${ids.length}] Player ${id}: HTTP ${res.status}`);
        fail++;
        continue;
      }

      const data = await res.json();

      // Transform to { roundId: { points, stats } }
      footballers[id] = {};
      const items = Array.isArray(data) ? data : (data.stats || data.data || [data]);

      for (const item of items) {
        if (!item) continue;
        const rid = String(item.roundId || item.round || item.id || item.matchDay);
        if (!rid || rid === 'undefined') continue;

        const stats = item.stats || item.statistics || item.stat || {};
        footballers[id][rid] = {
          points: item.points || item.totalPoints || item.score || 0,
          stats: {
            ST: stats.ST || stats.st || stats.shotsOnTarget || 0,
            GS: stats.GS || stats.gs || stats.goalsScored || 0,
            AS: stats.AS || stats.as || stats.assists || 0,
            YC: stats.YC || stats.yc || stats.yellowCards || 0,
            RC: stats.RC || stats.rc || stats.redCards || 0,
            CS: stats.CS || stats.cs || stats.cleanSheets || 0,
            SV: stats.SV || stats.sv || stats.saves || 0,
            GC: stats.GC || stats.gc || stats.goalsConceded || 0,
            PKG: stats.PKG || stats.pkg || stats.penaltyGoals || 0,
            OG: stats.OG || stats.og || stats.ownGoals || 0
          }
        };
      }

      console.log(`[${i + 1}/${ids.length}] Player ${id}: OK (${Object.keys(footballers[id]).length} rounds)`);
      success++;

    } catch (err) {
      console.error(`[${i + 1}/${ids.length}] Player ${id}: ${err.message}`);
      fail++;
    }
  }

  const outPath = path.join(__dirname, '..', 'data', 'footballers.json');
  fs.writeFileSync(outPath, JSON.stringify(footballers, null, 2));
  console.log(`\nDone. Success: ${success}, Failed: ${fail}`);
  console.log(`Saved ${Object.keys(footballers).length} footballers to data/footballers.json`);
}

fetchFootballers().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
