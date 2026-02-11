#!/usr/bin/env node

import { createClient } from "@base44/sdk";
import fs from "fs";

// Read app ID from config
const configContent = fs.readFileSync("./base44/.app.jsonc", "utf8");
const jsonContent = configContent.split('\n').filter(line => !line.trim().startsWith('//')).join('\n');
const appConfig = JSON.parse(jsonContent);

const base44 = createClient({ appId: appConfig.id });

async function checkCount() {
  try {
    const pokemon = await base44.entities.Pokemon.list();
    console.log(`📊 Total Pokémon in database: ${pokemon.length}`);
    
    // Count by rarity
    const byRarity = pokemon.reduce((acc, p) => {
      acc[p.rarity] = (acc[p.rarity] || 0) + 1;
      return acc;
    }, {});
    
    console.log("\n📈 Breakdown by rarity:");
    Object.entries(byRarity).forEach(([rarity, count]) => {
      console.log(`   ${rarity}: ${count}`);
    });
    
    // Count by type
    const byType = pokemon.reduce((acc, p) => {
      acc[p.type] = (acc[p.type] || 0) + 1;
      return acc;
    }, {});
    
    console.log("\n🎨 Breakdown by type:");
    Object.entries(byType).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });
    
    // Show some sample names
    console.log("\n🎯 Sample Pokémon names:");
    pokemon.slice(0, 10).forEach(p => {
      console.log(`   ${p.name} (${p.type}, ${p.rarity}, Power: ${p.power_level})`);
    });
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

checkCount();
