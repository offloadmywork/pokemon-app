#!/usr/bin/env node

// Quick test to verify Pollinations.ai image generation
// Creates 3 sample Pokemon and displays their image URLs

import { createClient } from "@base44/sdk";
import fs from "fs";

const configContent = fs.readFileSync("./base44/.app.jsonc", "utf8");
const jsonContent = configContent.split('\n').filter(line => !line.trim().startsWith('//')).join('\n');
const appConfig = JSON.parse(jsonContent);
const base44 = createClient({ appId: appConfig.id });

// Test types and rarities
const tests = [
  { name: "TestBlazefang", type: "Fire", rarity: "Legendary", power: 95 },
  { name: "TestBubblechu", type: "Water", rarity: "Common", power: 25 },
  { name: "TestPhantomwing", type: "Ghost", rarity: "Epic", power: 85 }
];

async function testImageGeneration() {
  console.log("🧪 Testing Pollinations.ai Image Generation\n");
  console.log("=" .repeat(80) + "\n");
  
  for (const test of tests) {
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
      Ghost: "ethereal, spectral, transparent, purple glow, spooky"
    };
    
    const description = `A powerful ${test.type}-type Pokemon with incredible abilities.`;
    const imagePrompt = `epic pokemon creature ${test.name}, ${test.type} type pokemon, ${typeVisuals[test.type]}, ${rarityStyles[test.rarity]}, pokemon card art style, official pokemon artwork, vibrant colors, professional digital art, trending on artstation, high quality illustration, game character design`;
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=512&height=512&nologo=true&seed=${Math.floor(Math.random() * 10000)}`;
    
    console.log(`Pokemon: ${test.name}`);
    console.log(`Type: ${test.type} | Rarity: ${test.rarity} | Power: ${test.power}`);
    console.log(`Description: ${description}`);
    console.log(`\n📷 Image URL (copy and paste into browser to view):`);
    console.log(imageUrl);
    console.log("\n" + "=".repeat(80) + "\n");
  }
  
  console.log("✅ Test complete!");
  console.log("\n💡 Tips:");
  console.log("   1. Copy any image URL above and paste into your browser");
  console.log("   2. The image should show a unique Pokemon matching the description");
  console.log("   3. Fire types should look fiery, Water types aquatic, Ghost types spooky");
  console.log("   4. Legendary should look more epic than Common");
  console.log("\n🎉 If images look good, you're ready to generate all 1000 Pokemon!");
}

testImageGeneration();
