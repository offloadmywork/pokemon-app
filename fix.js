import fs from 'fs';
const content = fs.readFileSync('src/pages/Collection.jsx', 'utf8');
// Find and remove the extra </div> after the empty state section
const fixed = content.replace(
  /(<\/div>\s*<\/div>\s*)\n\s*\)\s*:\s*\(/,
  '$1) : ('
);
console.log('Searching for pattern...');
// Actually let's look at specific lines
const lines = content.split('\n');
console.log('Lines 260-275:');
for (let i = 259; i < 275 && i < lines.length; i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
