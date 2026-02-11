/**
 * Batch generate Pokemon images using Cloudflare Worker
 * This script generates images for all Pokemon using the Workers AI worker
 */

import { createClient } from "@base44/sdk";
import fs from "fs";

// Configuration
const WORKER_URL = process.env.WORKER_URL || 'https://pokemon-image-generator.offloadmy.workers.dev';
const BATCH_SIZE = 10; // Process 10 Pokemon at a time
const DELAY_BETWEEN_BATCHES = 2000; // 2 seconds between batches

// Read app ID from config
const configContent = fs.readFileSync("./base44/.app.jsonc", "utf8");
const jsonContent = configContent.split('\n').filter(line => !line.trim().startsWith('//')).join('\n');
const appConfig = JSON.parse(jsonContent);
const base44 = createClient({ appId: appConfig.id });

async function batchGeneratePokemonImages() {
  console.log('🎨 Batch Pokemon Image Generation using Cloudflare Worker\n');
  console.log(`📍 Worker URL: ${WORKER_URL}\n`);

  try {
    // Test worker health first
    console.log('🏥 Checking worker health...');
    const healthResponse = await fetch(`${WORKER_URL}/health`);
    if (!healthResponse.ok) {
      throw new Error('Worker health check failed');
    }
    const healthData = await healthResponse.json();
    console.log(`   ✅ Worker is healthy: ${healthData.model}\n`);

    // Get all Pokemon from Base44
    console.log('📦 Fetching Pokemon from Base44...');
    const pokemons = await base44.entities.Pokemon.list();
    console.log(`   Found ${pokemons.length} Pokemon to process\n`);

    if (pokemons.length === 0) {
      console.log("⚠️  No Pokémon found in database. Run seed-pokemon.js first!");
      return;
    }

    // Filter Pokemon that don't have AI-generated images yet (or regenerate all)
    const pokemonsToGenerate = process.argv.includes('--regenerate') 
      ? pokemons 
      : pokemons.filter(p => !p.image_url || !p.image_url.startsWith('data:image'));
    console.log(`🎯 Will generate images for ${pokemonsToGenerate.length} Pokemon\n`);

    if (pokemonsToGenerate.length === 0) {
      console.log('✨ All Pokemon already have images! Use --regenerate to regenerate them.');
      return;
    }

    // Process in batches
    let totalGenerated = 0;
    let totalFailed = 0;

    for (let i = 0; i < pokemonsToGenerate.length; i += BATCH_SIZE) {
      const batch = pokemonsToGenerate.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(pokemonsToGenerate.length / BATCH_SIZE);

      console.log(`\n📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} Pokemon)...`);

      try {
        // Call worker batch endpoint
        const response = await fetch(`${WORKER_URL}/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pokemons: batch.map(p => ({
              name: p.name,
              type: p.type,
              rarity: p.rarity || 'common'
            }))
          })
        });

        if (!response.ok) {
          throw new Error(`Worker returned ${response.status}: ${await response.text()}`);
        }

        const result = await response.json();
        
        console.log(`   📊 Batch complete: ${result.generated} generated, ${result.failed} failed`);

        // Update Pokemon entities with generated images via backend function
        for (const generated of result.results) {
          if (generated.success) {
            const pokemon = batch.find(p => p.name === generated.name);
            
            try {
              // Update via service-role function (bypasses auth)
              await base44.functions.invoke("update-pokemon-image", {
                id: pokemon.id,
                image_url: generated.imageUrl
              });

              console.log(`      ✅ ${generated.name} - Image updated`);
              totalGenerated++;
            } catch (error) {
              console.error(`      ❌ ${generated.name} - Failed to update: ${error.message}`);
              totalFailed++;
            }
          } else {
            console.error(`      ❌ ${generated.name} - Generation failed`);
            totalFailed++;
          }
        }

        // Report errors from worker
        for (const error of result.errors || []) {
          console.error(`      ❌ ${error.name} - Worker error: ${error.error}`);
        }

      } catch (error) {
        console.error(`   ❌ Batch ${batchNum} failed:`, error.message);
        totalFailed += batch.length;
      }

      // Delay between batches to respect rate limits
      if (i + BATCH_SIZE < pokemonsToGenerate.length) {
        console.log(`   ⏳ Waiting ${DELAY_BETWEEN_BATCHES/1000}s before next batch...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    console.log('\n🎉 Batch generation complete!');
    console.log(`   ✅ Successfully generated: ${totalGenerated}`);
    console.log(`   ❌ Failed: ${totalFailed}`);
    console.log(`   📊 Total processed: ${totalGenerated + totalFailed}/${pokemonsToGenerate.length}`);

    if (totalGenerated > 0) {
      console.log('\n🚀 Ready to deploy with: npx base44 deploy -y');
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
batchGeneratePokemonImages();
