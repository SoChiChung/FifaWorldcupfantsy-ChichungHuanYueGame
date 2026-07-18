const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DATA = path.join(ROOT, 'data');

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function loadConfig() {
  const cfg = readJSON(path.join(ROOT, 'config.json'));
  return {
    roundId: cfg.roundId,
    cookie: cfg.COOKIE || cfg.cookie || '',
    qualifier: cfg.qualifier || 0,
    bonuses: cfg.bonuses || {},
    winningGoalPlayerIds: cfg.winningGoalPlayerIds || [],
    championTeamId: cfg.championTeamId ?? null
  };
}

function loadHuanyue() {
  return readJSON(path.join(DATA, 'huanyue.json'));
}

function loadPlayers() {
  return readJSON(path.join(DATA, 'players.json'));
}

function loadFootballers() {
  return readJSON(path.join(DATA, 'footballers.json'));
}

function loadFullFootballers() {
  const p = path.join(DATA, 'fullfootballers.json');
  if (!fs.existsSync(p)) return [];
  return readJSON(p);
}

function loadResult() {
  const p = path.join(DATA, 'result.json');
  if (!fs.existsSync(p)) return {};
  return readJSON(p);
}

function createGetStat(footballers) {
  return function getStat(playerId, roundId, statName) {
    const player = footballers[String(playerId)];
    if (!player) return 0;
    const round = player[String(roundId)];
    if (!round) return 0;
    if (statName === 'points') return round.points;
    return round.stats[statName] || 0;
  };
}

module.exports = {
  readJSON,
  loadConfig,
  loadHuanyue,
  loadPlayers,
  loadFootballers,
  loadFullFootballers,
  loadResult,
  createGetStat
};
