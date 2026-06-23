const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function run(script, label) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`  ${label}`);
  console.log(`${'='.repeat(50)}`);
  execSync(`node "${script}"`, { cwd: ROOT, stdio: 'inherit' });
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyFile(src, dest) {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied: ${path.relative(ROOT, src)} -> ${path.relative(ROOT, dest)}`);
  } else {
    console.warn(`WARNING: Source not found: ${src}`);
  }
}

// Step 1: Fetch player team histories
run(path.join(ROOT, 'scripts', 'fetchPlayers.js'), 'Step 1: Fetching player team histories');

// Step 2: Fetch unique footballer stats
run(path.join(ROOT, 'scripts', 'fetchFootballers.js'), 'Step 2: Fetching footballer stats');

// Step 3: Execute current round rule
run(path.join(ROOT, 'scripts', 'runRules.js'), 'Step 3: Running round rules');

// Step 4: Copy data to docs for GitHub Pages
console.log(`\n${'='.repeat(50)}`);
console.log(`  Step 4: Copying data to docs/`);
console.log(`${'='.repeat(50)}`);

ensureDir(path.join(ROOT, 'docs', 'data'));
copyFile(
  path.join(ROOT, 'data', 'result.json'),
  path.join(ROOT, 'docs', 'data', 'result.json')
);
copyFile(
  path.join(ROOT, 'data', 'huanyue.json'),
  path.join(ROOT, 'docs', 'data', 'huanyue.json')
);

console.log('\nUpdate complete.');
