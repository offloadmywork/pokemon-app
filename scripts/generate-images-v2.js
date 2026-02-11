#!/usr/bin/env node
// v2: Paginated fetch, skip blank images, retry failed ones
import fs from "fs";

const APP_ID = "698229512d043bbaba7d7e25";
const BASE_URL = `https://base44.app/api/apps/${APP_ID}`;
const WORKER_URL = process.env.WORKER_URL || 'https://pokemon-image-generator.nev-9f1.workers.dev';
const CONCURRENCY = 3;
const MAX_RETRIES = 3;
const BLANK_THRESHOLD = 50000; // base64 chars - real images are >50K, blanks are ~10K

// Fetch Pokemon page by page (lightweight - only id, name, type, rarity, image_url length)
async function fetchAllPokemon() {
  console.log('📦 Fetching Pokemon list (paginated)...');
  let all = [];
  let page = 0;
  const limit = 50;
  
  while (true) {
    const url = `${BASE_URL}/entities/Pokemon?limit=${limit}&skip=${page * limit}`;
    const resp = await fetch(url, {
      headers: { 'X-App-Id': APP_ID }
    });
    
    if (!resp.ok) {
      console.error(`❌ Fetch page ${page} failed: ${resp.status}`);
      // Retry once
      await new Promise(r => setTimeout(r, 3000));
      const retry = await fetch(url, { headers: { 'X-App-Id': APP_ID } });
      if (!retry.ok) throw new Error(`Failed to fetch page ${page}: ${retry.status}`);
      const data = await retry.json();
      if (!data.length) break;
      all = all.concat(data);
    } else {
      const data = await resp.json();
      if (!data.length) break;
      all = all.concat(data);
    }
    
    console.log(`  Page ${page}: got ${all.length} total`);
    page++;
    await new Promise(r => setTimeout(r, 500)); // Be nice to API
  }
  
  return all;
}

// Check if a Pokemon needs a new image
function needsImage(p) {
  if (!p.image_url) return true;
  if (!p.image_url.startsWith('data:image')) return true;
  if (p.image_url.length < BLANK_THRESHOLD) return true; // blank/failed images
  return false;
}

async function generateOne(pokemon) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const resp = await fetch(`${WORKER_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: pokemon.name, type: pokemon.type, rarity: pokemon.rarity })
      });
      if (resp.status === 503) {
        if (attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, 3000 * attempt));
          continue;
        }
        throw new Error('Worker 503 after retries');
      }
      if (!resp.ok) throw new Error(`Worker ${resp.status}`);
      const data = await resp.json();
      if (!data.success || !data.imageUrl || data.imageUrl.length < 100) throw new Error('No image data');
      
      // Reject tiny images (likely black/empty)
      if (data.imageUrl.length < BLANK_THRESHOLD) throw new Error('Image too small (likely blank)');
      
      // Update via Base44 function
      const upResp = await fetch(`${BASE_URL}/functions/update-pokemon-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-App-Id': APP_ID },
        body: JSON.stringify({ id: pokemon.id, image_url: data.imageUrl })
      });
      if (upResp.status !== 200) throw new Error(`Update failed: ${upResp.status}`);
      return true;
    } catch (e) {
      if (attempt === MAX_RETRIES) throw e;
      await new Promise(r => setTimeout(r, 3000 * attempt));
    }
  }
}

async function main() {
  console.log('🎨 Pokemon Image Generator v2');
  console.log(`📍 Worker: ${WORKER_URL}`);
  console.log(`⚡ Concurrency: ${CONCURRENCY}\n`);

  const all = await fetchAllPokemon();
  const todo = all.filter(needsImage);
  console.log(`\n📦 Total: ${all.length} | Have images: ${all.length - todo.length} | Need images: ${todo.length}\n`);

  if (todo.length === 0) {
    console.log('✅ All Pokemon have images!');
    process.exit(0);
  }

  let done = 0, failed = 0;
  const failures = [];
  const start = Date.now();

  // Process in parallel chunks
  for (let i = 0; i < todo.length; i += CONCURRENCY) {
    const chunk = todo.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(chunk.map(p => generateOne(p)));
    
    for (let j = 0; j < results.length; j++) {
      if (results[j].status === 'fulfilled') {
        done++;
        console.log(`✅ [${done + failed}/${todo.length}] ${chunk[j].name}`);
      } else {
        failed++;
        failures.push(chunk[j].name);
        console.log(`❌ [${done + failed}/${todo.length}] ${chunk[j].name}: ${results[j].reason.message}`);
      }
    }
    
    // Brief pause between chunks
    if (i + CONCURRENCY < todo.length) await new Promise(r => setTimeout(r, 1000));
    
    // Progress every 30
    if ((done + failed) % 30 === 0 && done + failed > 0) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(0);
      const rate = (done / elapsed * 60).toFixed(1);
      console.log(`\n📊 Progress: ${done} done, ${failed} failed, ${elapsed}s elapsed, ~${rate}/min\n`);
    }
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(0);
  console.log(`\n🎉 Done! ${done} generated, ${failed} failed, ${elapsed}s total`);
  if (failures.length) {
    console.log(`\n❌ Failed Pokemon: ${failures.join(', ')}`);
  }
  process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
