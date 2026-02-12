const fs = require('fs');
const path = 'src/pages/Collection.jsx';
let content = fs.readFileSync(path, 'utf8');

// Replace the problematic long line (line 263, 0-indexed: 262)
// The line contains JSX for the empty state
const lines = content.split('\n');

// Find and log the long lines
const longLines = lines.map((line, idx) => ({ line, idx, len: line.length })).filter(x => x.len > 200);
console.log('Long lines found:', longLines.length);
longLines.forEach(x => console.log(`Line ${x.idx + 1}: ${x.len} chars`));

// The issue is line 263 (0-indexed 262)
const line263 = lines[262];
if (line263 && line263.length > 500) {
  console.log('Found long line 263, replacing...');
  
  // Extract the text content and Button elements
  // The line structure is:
  // " Your collection is empty! 😢 </p> <p ...> ... </p> <div ...> <Button ...> ... </Button> <span ...>or</span> <Button ...> ... </Button> </div>"
  
  // Split and reformat
  const newLines = [
    `          Your collection is empty! 😢`,
    `        </p>`,
    `        <p className="text-xl text-white/80 mb-4">`,
    `          Welcome! You need Pokémon to start your adventure!`,
    `        </p>`,
    `        <div className="flex flex-col gap-3 items-center">`,
    `          <Button`,
    `            onClick={async () => {`,
    `              setIsLoading(true);`,
    `              try {`,
    `                const result = await pokemonAPI.claimStarters();`,
    `                if (result.success) {`,
    `                  const caughtList = await pokemonAPI.getCaughtPokemon();`,
    `                  setAllCaught(caughtList);`,
    `                  alert(result.message);`,
    `                }`,
    `              } catch (err) {`,
    `                console.error('Failed to claim starters:', err);`,
    `                alert('Something went wrong! Try again.');`,
    `              } finally {`,
    `                setIsLoading(false);`,
    `              }`,
    `            }}`,
    `            className="h-16 px-8 text-2xl font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl"`,
    `          >`,
    `            🎁 Claim Your Starter Pokémon!`,
    `          </Button>`,
    `          <span className="text-white/60 text-sm">or</span>`,
    `          <Button`,
    `            onClick={() => onNavigate('browse')}`,
    `            className="h-12 px-6 text-lg font-bold bg-yellow-400 hover:bg-yellow-500 text-purple-900 rounded-xl"`,
    `          >`,
    `            🔍 Explore Wild Pokémon`,
    `          </Button>`,
    `        </div>`
  ];
  
  // Replace line 262 (0-indexed) with the new formatted lines
  lines.splice(262, 1, ...newLines);
  
  fs.writeFileSync(path, lines.join('\n'));
  console.log('File updated successfully!');
} else {
  console.log('Line 263 not found or not too long');
}
