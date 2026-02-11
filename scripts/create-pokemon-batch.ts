#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read

import { createClient } from "npm:@base44/sdk@latest";

// Get batch number from command line
const batchNumber = parseInt(Deno.args[0] || "1");
if (isNaN(batchNumber) || batchNumber < 1 || batchNumber > 10) {
  console.error("❌ Usage: deno run --allow-net --allow-env create-pokemon-batch.ts <batch-number>");
  console.error("   Batch number must be between 1 and 10");
  Deno.exit(1);
}

console.log(`🚀 Starting Pokemon batch ${batchNumber} generation...`);

// Initialize Base44 client
const base44 = createClient({ appId: "698229512d043bbaba7d7e25" });

// Pokemon types (expanded list as requested)
const TYPES = [
  "Fire", "Water", "Electric", "Psychic", "Dark", "Dragon", 
  "Ice", "Fighting", "Ghost", "Steel", "Fairy", "Rock", 
  "Ground", "Flying", "Poison", "Bug", "Normal", "Grass"
];

// Rarity weights (50% Common, 25% Uncommon, 15% Rare, 8% Epic, 2% Legendary)
const RARITIES = [
  ...Array(50).fill("Common"),
  ...Array(25).fill("Uncommon"),
  ...Array(15).fill("Rare"),
  ...Array(8).fill("Epic"),
  ...Array(2).fill("Legendary"),
];

// Power level ranges by rarity
const POWER_RANGES = {
  Common: [10, 30],
  Uncommon: [25, 50],
  Rare: [45, 70],
  Epic: [65, 85],
  Legendary: [80, 100],
};

// Name prefixes by category
const NAME_PREFIXES = {
  fierce: ["Blaze", "Thunder", "Shadow", "Storm", "Venom", "Frost", "Titan", "Razor", "Crimson", "Inferno"],
  cute: ["Fluffy", "Sparkle", "Bubbles", "Cuddle", "Sweet", "Tiny", "Puff", "Cherry", "Snuggle", "Giggly"],
  mystic: ["Mystic", "Phantom", "Eclipse", "Void", "Ethereal", "Cosmic", "Lunar", "Spectral", "Enigma", "Oracle"],
  elemental: ["Aqua", "Pyro", "Terra", "Aero", "Cryo", "Electro", "Magma", "Hydro", "Volt", "Gale"],
};

const NAME_SUFFIXES = {
  creatures: ["drake", "fang", "claw", "wing", "beast", "rex", "don", "saur", "zard", "bite"],
  cute: ["puff", "chu", "belle", "sweet", "fluff", "pop", "bunny", "kitty", "pup", "mew"],
  mystic: ["shade", "wraith", "spirit", "ghost", "soul", "myst", "veil", "rift", "dream", "wisp"],
  forces: ["surge", "strike", "blast", "wave", "storm", "quake", "force", "pulse", "bolt", "rush"],
};

// Fantasy names
const FANTASY_NAMES = [
  "Zypheron", "Drakovix", "Luminae", "Nexaris", "Vortexia", "Crystallix", "Obsidian", "Aetheron",
  "Solstice", "Meridian", "Galaxian", "Nebulite", "Quartzion", "Prismara", "Chronox", "Infinitus",
  "Stellaris", "Volcara", "Tsunamix", "Tremoria", "Cyclonis", "Blizzara", "Radiance", "Umbralux",
  "Typhoonix", "Seraphix", "Titanox", "Leviath", "Phoenara", "Celestrix", "Aurorix", "Tempestus"
];

// Description templates
const DESCRIPTION_TEMPLATES = [
  (name: string, type: string) => `${name} is a legendary ${type}-type creature known for its incredible power. Ancient texts speak of its devastating abilities.`,
  (name: string, type: string) => `Born from pure ${type} energy, ${name} roams the wild lands seeking worthy trainers. Its presence electrifies the atmosphere.`,
  (name: string, type: string) => `This rare ${type}-type Pokemon has adapted to extreme environments. ${name}'s unique abilities make it a prized companion.`,
  (name: string, type: string) => `${name} emerged from the depths of an ancient ${type} temple. Legends say it can sense emotions and bonds deeply with its trainer.`,
  (name: string, type: string) => `A mysterious ${type}-type Pokemon that appears only under specific celestial alignments. ${name} possesses otherworldly powers.`,
  (name: string, type: string) => `Discovered in a remote region, ${name} demonstrates extraordinary ${type} abilities. Scientists are still studying its unique biology.`,
  (name: string, type: string) => `${name} is beloved for its loyal nature and fierce protective instincts. This ${type}-type Pokemon never abandons its friends.`,
  (name: string, type: string) => `Ancient murals depict ${name} as a guardian of ${type} energy. It awakens when the natural balance is threatened.`,
  (name: string, type: string) => `This playful yet powerful ${type}-type Pokemon brings joy wherever it goes. ${name}'s cheerful nature hides formidable strength.`,
  (name: string, type: string) => `${name} channels raw ${type} power through crystalline structures on its body. Its attacks can alter the battlefield itself.`,
];

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateUniqueName(index: number, batchNum: number): string {
  const seed = batchNum * 100 + index;
  const nameType = seed % 5;
  
  switch (nameType) {
    case 0: // Fierce [Adjective][Creature]
      return randomElement(NAME_PREFIXES.fierce) + randomElement(NAME_SUFFIXES.creatures);
    case 1: // Cute pattern
      return randomElement(NAME_PREFIXES.cute) + randomElement(NAME_SUFFIXES.cute);
    case 2: // Mystic pattern
      return randomElement(NAME_PREFIXES.mystic) + randomElement(NAME_SUFFIXES.mystic);
    case 3: // Elemental [Element][Action]
      return randomElement(NAME_PREFIXES.elemental) + randomElement(NAME_SUFFIXES.forces);
    case 4: // Pure fantasy name
      return randomElement(FANTASY_NAMES);
    default:
      return `Pokemon${seed}`;
  }
}

function generatePokemon(index: number, batchNum: number) {
  const name = generateUniqueName(index, batchNum);
  const type = randomElement(TYPES);
  const rarity = randomElement(RARITIES);
  const [minPower, maxPower] = POWER_RANGES[rarity as keyof typeof POWER_RANGES];
  const powerLevel = randomInt(minPower, maxPower);
  const description = randomElement(DESCRIPTION_TEMPLATES)(name, type);
  
  // Enhanced Pollinations.ai image generation with rich prompts
  const rarityStyles: Record<string, string> = {
    Common: "simple design, friendly, approachable",
    Uncommon: "interesting features, unique design, detailed",
    Rare: "majestic, powerful stance, impressive details, glowing aura",
    Epic: "epic legendary creature, dramatic lighting, highly detailed, mystical energy",
    Legendary: "godlike legendary pokemon, mythical, ultra detailed, divine glowing effects, cosmic aura, masterpiece"
  };
  
  const typeVisuals: Record<string, string> = {
    Fire: "red orange flames, fire effects, blazing",
    Water: "blue aqua, water droplets, ocean waves, flowing", 
    Electric: "yellow lightning, electric sparks, voltage, energetic",
    Psychic: "purple pink, mystical energy, psychic aura, mind powers",
    Dark: "dark shadows, mysterious, night colors, ominous",
    Dragon: "dragon scales, powerful wings, reptilian, majestic",
    Ice: "ice crystals, frozen, snowflakes, blue white frost",
    Fighting: "muscular, strong stance, warrior, battle ready",
    Ghost: "ethereal, spectral, transparent, purple glow, spooky",
    Steel: "metallic, silver armor, chrome, robotic elements",
    Fairy: "pink sparkles, magical, cute, enchanting wings",
    Rock: "rocky texture, stone body, earth brown, geological",
    Ground: "earth terrain, dirt, sand, ground type, sturdy",
    Flying: "large wings, sky blue, clouds, airborne, feathers",
    Poison: "toxic purple green, poisonous, venomous, hazardous",
    Bug: "insect features, exoskeleton, antennae, compound eyes",
    Normal: "natural colors, balanced design, versatile",
    Grass: "plant leaves, vines, flowers, green nature, botanical"
  };
  
  const imagePrompt = `epic pokemon creature ${name}, ${type} type pokemon, ${typeVisuals[type]}, ${rarityStyles[rarity]}, pokemon card art style, official pokemon artwork, vibrant colors, professional digital art, trending on artstation, high quality illustration, game character design`;
  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=512&height=512&nologo=true&seed=${batchNum * 1000 + index}`;
  
  return {
    name,
    type,
    description,
    image_url: imageUrl,
    rarity,
    power_level: powerLevel,
  };
}

// Generate and create 100 Pokemon for this batch
console.log(`📦 Generating 100 Pokemon for batch ${batchNumber}...`);

const startTime = Date.now();
let created = 0;
let failed = 0;

for (let i = 0; i < 100; i++) {
  try {
    const pokemon = generatePokemon(i, batchNumber);
    
    // Create in Base44 (uses CLI session)
    await base44.entities.Pokemon.create(pokemon);
    
    created++;
    
    // Log progress every 10 Pokemon
    if ((i + 1) % 10 === 0) {
      console.log(`   ✓ Created ${i + 1}/100 Pokemon...`);
    }
  } catch (error) {
    failed++;
    console.error(`   ✗ Failed to create Pokemon ${i + 1}:`, error.message);
  }
}

const duration = ((Date.now() - startTime) / 1000).toFixed(2);

console.log(`\n🎉 Batch ${batchNumber} complete!`);
console.log(`   ✅ Successfully created: ${created}/100`);
if (failed > 0) {
  console.log(`   ❌ Failed: ${failed}/100`);
}
console.log(`   ⏱️  Duration: ${duration}s`);
console.log(`   📊 Average: ${(created / parseFloat(duration)).toFixed(1)} Pokemon/second`);
