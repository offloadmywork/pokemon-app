#!/usr/bin/env node
// Bypasses Base44 SDK, uses fetch directly, paginates to avoid memory issues
// with huge base64 image_url fields

import fs from "fs";

const WORKER_URL = process.env.WORKER_URL || 'https://pokemon-image-generator.nev-9f1.workers.dev';
const CONCURRENCY = 3;
const MAX_RETRIES = 3;
const PAGE_SIZE = 50;
const WORKER_TIMEOUT = 120000; // 120s for image gen

const cfg = JSON.parse(
  fs.readFileSync("./base44/.app.jsonc", "utf8")
    .split('\n')
    .filter(l => !l.trim().startsWith('//'))
    .join('\n')
);
const APP_ID = cfg.id;
const BASE_URL = `https://base44.app/api/apps/${APP_ID}`;

function needsImage(p) {
  return !p.image_url || !p.image_url.startsWith('data:image') || p.image_url.length < 100;
}

async function fetchPage(skip) {
  const url = `${BASE_URL}/entities/Pokemon?limit=${PAGE_SIZE}&skip=${skip}`;
  const resp = await fetch(url, {
    headers: { 'X-App-Id': APP_ID, 'Accept': 'application/json' }
  });
  if (!resp.ok) throw new Error(`List failed: ${resp.status}`);
  // Use text() first, then parse - more reliable for large responses
  const text = await resp.text();
  return JSON.parse(text);
}

async function updatePokemonImage(id, imageUrl) {
  const resp = await fetch(`${BASE_URL}/functions/update-pokemon-image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-App-Id': APP_ID,
    },
    body: JSON.stringify({ id, image_url: imageUrl })
  });
  if (!resp.ok) throw new Error(`Update function failed: ${resp.status}`);
  return resp;
}

async function generateOne(pokemon) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), WORKER_TIMEOUT);
      
      const resp = await fetch(`${WORKER_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: pokemon.name, type: pokemon.type, rarity: pokemon.rarity }),
        signal: controller.signal
      });
      clearTimeout(timer);

      if (resp.status === 503) {
        if (attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, 2000 * attempt));
          continue;
        }
        throw new Error('Worker 503 after retries');
      }
      if (!resp.ok) throw new Error(`Worker ${resp.status}`);
      const data = await resp.json();
      if (!data.success || !data.imageUrl || data.imageUrl.length < 100) throw new Error('No image data');
      if (data.imageUrl.length < 50000) throw new Error('Image too small (likely black)');

      await updatePokemonImage(pokemon.id, data.imageUrl);
      return true;
    } catch (e) {
      if (attempt === MAX_RETRIES) throw e;
      await new Promise(r => setTimeout(r, 2000 * attempt));
    }
  }
}

async function main() {
  console.log('🎨 Pokemon Image Generator v3 (paginated, SDK-free)');
  console.log(`📍 Worker: ${WORKER_URL}`);
  console.log(`⚡ Concurrency: ${CONCURRENCY}`);
  console.log(`📄 Page size: ${PAGE_SIZE}\n`);

  // Phase 1: Discover all Pokemon that need images (paginated)
  console.log('📋 Phase 1: Discovering Pokemon that need images...');
  const todo = [];
  let totalCount = 0;
  let skip = 0;
  
  while (true) {
    process.stdout.write(`  Page ${Math.floor(skip/PAGE_SIZE)+1} (skip=${skip})...`);
    const page = await fetchPage(skip);
    console.log(` got ${page.length} Pokemon`);
    
    if (!Array.isArray(page) || page.length === 0) break;
    
    totalCount += page.length;
    
    // Extract only minimal data for those needing images
    for (const p of page) {
      if (needsImage(p)) {
        todo.push({ id: p.id, name: p.name, type: p.type, rarity: p.rarity });
      }
    }
    
    if (page.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
    
    // Small delay between pages
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\n📦 Total: ${totalCount} | Already have images: ${totalCount - todo.length} | Need images: ${todo.length}\n`);

  if (todo.length === 0) {
    console.log('✨ All Pokemon already have images!');
    process.exit(0);
  }

  // Phase 2: Generate images
  console.log('🎨 Phase 2: Generating images...\n');
  let done = 0, failed = 0;
  const failures = [];
  const start = Date.now();

  for (let i = 0; i < todo.length; i += CONCURRENCY) {
    const chunk = todo.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(chunk.map(p => generateOne(p)));

    for (let j = 0; j < results.length; j++) {
      if (results[j].status === 'fulfilled') {
        done++;
        console.log(`✅ [${done + failed}/${todo.length}] ${chunk[j].name}`);
      } else {
        failed++;
        failures.push({ name: chunk[j].name, error: results[j].reason.message });
        console.log(`❌ [${done + failed}/${todo.length}] ${chunk[j].name}: ${results[j].reason.message}`);
      }
    }

    if (i + CONCURRENCY < todo.length) await new Promise(r => setTimeout(r, 500));

    if ((done + failed) % 30 === 0 && (done + failed) > 0) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(0);
      const rate = done > 0 ? (done / (elapsed || 1) * 60).toFixed(1) : '0';
      console.log(`\n📊 Progress: ${done} done, ${failed} failed, ${elapsed}s elapsed, ~${rate}/min\n`);
    }
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(0);
  console.log(`\n🎉 Done! ${done} generated, ${failed} failed, ${elapsed}s total`);

  if (failures.length > 0) {
    console.log(`\n❌ Failures:`);
    failures.forEach(f => console.log(`  - ${f.name}: ${f.error}`));
  }

  process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1);});
