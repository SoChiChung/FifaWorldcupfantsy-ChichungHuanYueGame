const fs = require('fs');
const path = require('path');

// Fix players.json — resolve 201 git merge conflicts, keeping THEIRS side
function fixPlayersJson() {
  const filePath = path.join(__dirname, 'data', 'players.json');
  let content = fs.readFileSync(filePath, 'utf-8');

  const startCount = (content.match(/<<<<<<< HEAD/g) || []).length;
  console.log(`Conflicts found: ${startCount}`);

  // Each conflict:
  //   <<<<<<< HEAD
  //   ...HEAD lines...
  //   =======
  //   ...THEIRS lines (KEEP)...
  //   >>>>>>> c84db8413b3377d2d80f83eba9689e6c1f418c98
  //
  // Strategy: replace entire conflict block with just the THEIRS content.
  // Use a non-greedy match that stops at the first ======= after a HEAD marker.
  // Then from ======= to >>>>>>>, capture the THEIRS content.
  //
  // The regex handles multi-line blocks carefully:
  // Match from <<<<<<< HEAD through the next ======= (these are HEAD lines to discard),
  // then capture everything up to the >>>>>>> marker (THEIRS content to keep).

  const conflictRegex = /<<<<<<< HEAD\n([\s\S]*?)\n=======\n([\s\S]*?)\n>>>>>>> c84db8413b3377d2d80f83eba9689e6c1f418c98/g;

  let replaced = 0;
  content = content.replace(conflictRegex, (match, headContent, theirsContent) => {
    replaced++;
    return theirsContent;
  });

  console.log(`Conflicts resolved: ${replaced}`);

  // Verify no markers remain
  const remaining = (content.match(/<<<<<<< HEAD/g) || []).length;
  if (remaining > 0) {
    console.error(`ERROR: ${remaining} conflicts still remain!`);
    process.exit(1);
  }

  // Verify valid JSON
  try {
    JSON.parse(content);
    console.log('Valid JSON confirmed.');
  } catch (e) {
    console.error(`JSON still invalid: ${e.message}`);
    process.exit(1);
  }

  fs.writeFileSync(filePath, content);
  console.log('players.json fixed and saved.');
}

// Fix result.json — just in case, clean up any remaining conflict markers
function fixResultJson(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf-8');
  const before = (content.match(/<<<<<<< HEAD/g) || []).length;
  if (before === 0) {
    console.log(`${path.basename(filePath)}: clean, no conflicts.`);
    return;
  }

  content = content.replace(
    /<<<<<<< HEAD\n([\s\S]*?)\n=======\n([\s\S]*?)\n>>>>>>> c84db8413b3377d2d80f83eba9689e6c1f418c98/g,
    '$2'
  );

  const after = (content.match(/<<<<<<< HEAD/g) || []).length;
  console.log(`${path.basename(filePath)}: ${before} → ${after} conflicts resolved.`);

  try {
    JSON.parse(content);
    console.log(`  Valid JSON confirmed.`);
  } catch (e) {
    console.error(`  JSON still invalid: ${e.message}`);
  }

  fs.writeFileSync(filePath, content);
}

// Run
fixPlayersJson();
fixResultJson(path.join(__dirname, 'data', 'result.json'));
fixResultJson(path.join(__dirname, 'docs', 'data', 'result.json'));

console.log('\nAll done. Remember to delete this script: fix-conflicts.js');
