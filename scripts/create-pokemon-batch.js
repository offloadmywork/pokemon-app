#!/usr/bin/env node

import { createClient } from "@base44/sdk";
import fs from "fs";

// Get batch number from command line
const batchNumber = parseInt(process.argv[2] || "1");
if (isNaN(batchNumber) || batchNumber < 1 || batchNumber > 10) {
  console.error("❌ Usage: node scripts/create-pokemon-batch.js <batch-number>");
  console.error("   Batch number must be between 1 and 10");
  process.exit(1);
}

console.log(`🚀 Starting Pokemon batch ${batchNumber} generation...`);

// Read app ID from config
const configContent = fs.readFileSync("./base44/.app.jsonc", "utf8");
const jsonContent = configContent.split('\n').filter(line => !line.trim().startsWith('//')).join('\n');
const appConfig = JSON.parse(jsonContent);

// Initialize Base44 client
const base44 = createClient({ appId: appConfig.id });

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
  (name, type) => `${name} is a legendary ${type}-type creature known for its incredible power. Ancient texts speak of its devastating abilities.`,
  (name, type) => `Born from pure ${type} energy, ${name} roams the wild lands seeking worthy trainers. Its presence electrifies the atmosphere.`,
  (name, type) => `This rare ${type}-type Pokemon has adapted to extreme environments. ${name}'s unique abilities make it a prized companion.`,
  (name, type) => `${name} emerged from the depths of an ancient ${type} temple. Legends say it can sense emotions and bonds deeply with its trainer.`,
  (name, type) => `A mysterious ${type}-type Pokemon that appears only under specific celestial alignments. ${name} possesses otherworldly powers.`,
  (name, type) => `Discovered in a remote region, ${name} demonstrates extraordinary ${type} abilities. Scientists are still studying its unique biology.`,
  (name, type) => `${name} is beloved for its loyal nature and fierce protective instincts. This ${type}-type Pokemon never abandons its friends.`,
  (name, type) => `Ancient murals depict ${name} as a guardian of ${type} energy. It awakens when the natural balance is threatened.`,
  (name, type) => `This playful yet powerful ${type}-type Pokemon brings joy wherever it goes. ${name}'s cheerful nature hides formidable strength.`,
  (name, type) => `${name} channels raw ${type} power through crystalline structures on its body. Its attacks can alter the battlefield itself.`,
];

function randomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateUniqueName(index, batchNum) {
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

function generatePokemon(index, batchNum) {
  const name = generateUniqueName(index, batchNum);
  const type = randomElement(TYPES);
  const rarity = randomElement(RARITIES);
  const [minPower, maxPower] = POWER_RANGES[rarity];
  const powerLevel = randomInt(minPower, maxPower);
  const description = randomElement(DESCRIPTION_TEMPLATES)(name, type);
  
  // Enhanced Pollinations.ai image generation with rich prompts
  const rarityStyles = {
    Common: "simple design, friendly, approachable",
    Uncommon: "interesting features, unique design, detailed",
    Rare: "majestic, powerful stance, impressive details, glowing aura",
    Epic: "epic legendary creature, dramatic lighting, highly detailed, mystical energy",
    Legendary: "godlike legendary pokemon, mythical, ultra detailed, divine glowing effects, cosmic aura, masterpiece"
  };
  
  const typeVisuals = {
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
async function createBatch() {
  console.log(`🚀 Starting Pokemon batch ${batchNumber}...`);

  const startTime = Date.now();
  
  // Generate all 100 Pokemon first
  console.log(`📦 Generating 100 Pokemon data...`);
  const pokemons = [];
  for (let i = 0; i < 100; i++) {
    pokemons.push(generatePokemon(i, batchNumber));
  }
  console.log(`   ✓ Generated ${pokemons.length} Pokemon`);
  
  // Send all Pokemon in one batch request
  console.log(`📤 Sending batch to create-pokemon function...`);
  try {
    const result = await base44.functions.invoke("create-pokemon", pokemons);
    const data = result.data;
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`\n🎉 Batch ${batchNumber} complete!`);
    console.log(`   ✅ Successfully created: ${data.created}/100`);
    if (data.errors > 0) {
      console.log(`   ❌ Failed: ${data.errors}/100`);
      if (data.errorDetails) {
        data.errorDetails.forEach(e => console.log(`      - ${e.pokemon}: ${e.error}`));
      }
    }
    console.log(`   ⏱️  Duration: ${duration}s`);
    console.log(`   📊 Rate: ${(data.created / parseFloat(duration)).toFixed(1)} Pokemon/second`);
  } catch (error) {
    console.error(`❌ Batch ${batchNumber} failed:`, error.message);
    process.exit(1);
  }
}

createBatch().catch(error => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
