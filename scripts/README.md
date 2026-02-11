# Pokemon Mass Generation Scripts

## Overview

This directory contains scripts for generating 1000 unique Pokémon in parallel batches of 100.

## Files

- **create-pokemon-batch.js** - Main batch creation script (Node.js)
- **create-pokemon-batch.ts** - TypeScript/Deno version (requires Deno)

## Quick Start

### Run a single batch

```bash
node scripts/create-pokemon-batch.js 1
```

This will create 100 Pokémon for batch 1 (IDs 0-99).

### Run all 10 batches in parallel

To create all 1000 Pokémon in parallel:

```bash
# macOS/Linux
for i in {1..10}; do
  node scripts/create-pokemon-batch.js $i &
done
wait
echo "✨ All 1000 Pokémon created!"
```

```powershell
# Windows PowerShell
1..10 | ForEach-Object { 
  Start-Job -ScriptBlock { 
    param($batch) 
    node scripts/create-pokemon-batch.js $batch 
  } -ArgumentList $_ 
}
Get-Job | Wait-Job | Receive-Job
Write-Host "✨ All 1000 Pokémon created!"
```

### Run a subset of batches

```bash
# Create batches 1-5 (500 Pokémon)
for i in {1..5}; do
  node scripts/create-pokemon-batch.js $i &
done
wait
```

## Batch Details

Each batch:
- **Size**: 100 Pokémon
- **Naming**: Unique names based on batch number + index (no conflicts)
- **Types**: 18 different types (Fire, Water, Electric, Psychic, Dark, Dragon, Ice, Fighting, Ghost, Steel, Fairy, Rock, Ground, Flying, Poison, Bug, Normal, Grass)
- **Rarities**: Weighted distribution
  - 50% Common (power: 10-30)
  - 25% Uncommon (power: 25-50)
  - 15% Rare (power: 45-70)
  - 8% Epic (power: 65-85)
  - 2% Legendary (power: 80-100)

## Name Generation

Names are generated using multiple creative patterns:
- **Fierce**: [Adjective][Creature] - e.g., "Blazefang", "Thunderclaw"
- **Cute**: [Adjective][Cute] - e.g., "Fluffypuff", "Sparklechu"
- **Mystic**: [Mystic][Spirit] - e.g., "Phantomshade", "Eclipsewraith"
- **Elemental**: [Element][Action] - e.g., "Pyrostrike", "Hydrowave"
- **Fantasy**: Pure fantasy names - e.g., "Zypheron", "Drakovix", "Celestrix"

Each Pokémon gets a unique backstory based on its type and characteristics.

## Performance

- **Single batch**: ~30-35 seconds (100 Pokémon)
- **10 parallel batches**: ~30-40 seconds total (1000 Pokémon)
- **Rate**: ~3 Pokémon/second per batch

## Requirements

- Node.js 18+ (with ES modules support)
- Base44 CLI authentication (run `npx base44 login` first)
- Internet connection for Base44 API

## 🎨 FREE AI-Generated Images via Pollinations.ai

**IMPORTANT**: This system uses **Pollinations.ai** for **100% FREE** AI image generation!

Each Pokémon gets a unique, AI-generated image based on:
- Pokemon name and type
- Rarity level (affects art quality/style)
- Type-specific visual characteristics (flames for Fire, water effects for Water, etc.)
- Professional Pokemon card art style prompts

**Example Image URL**:
```
https://image.pollinations.ai/prompt/epic%20pokemon%20creature%20Blazefang...
```

**Benefits**:
- ✅ **Completely FREE** - No API keys needed
- ✅ **No rate limits** - Generate 1000+ images without issues
- ✅ **Instant generation** - Images available immediately
- ✅ **High quality** - Rich, detailed prompts for each Pokemon
- ✅ **Unique seeds** - Each Pokemon gets a deterministic unique image
- ✅ **Type-specific styles** - Fire Pokemon look fiery, Water Pokemon look aquatic, etc.

## Error Handling

- The script logs progress every 10 Pokémon
- Failed creations are counted and reported
- Each batch runs independently - one batch failing won't affect others

## Examples

### Check what Pokémon were created in batch 1

```bash
# You can query them in your app or via Base44 console
# Names will be deterministic based on batch number
```

### Re-run a failed batch

If batch 5 failed, you can re-run just that batch:

```bash
node scripts/create-pokemon-batch.js 5
```

Note: This will create duplicates if the batch partially succeeded. You may want to delete the batch's Pokémon first.

## Troubleshooting

### "Command not found: node"

Install Node.js from https://nodejs.org/

### Authentication errors

Make sure you're logged in to Base44:
```bash
npx base44 login
```

### Rate limiting

If you hit rate limits, reduce parallelism or add delays between batches.

## Next Steps

After generating Pokémon, you can:
1. Generate images for each Pokémon using an image generation service
2. Update the `image_url` field with real images
3. Add more fields (abilities, stats, evolutions, etc.)
4. Create relationships between Pokémon (evolutions, families, etc.)
