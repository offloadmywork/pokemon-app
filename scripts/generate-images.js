#!/usr/bin/env node
import { createClient } from "@base44/sdk";
import fs from "fs";

const WORKER_URL = process.env.WORKER_URL || 'https://pokemon-image-generator.nev-9f1.workers.dev';
const CONCURRENCY = 3; // 3 = sweet spot, no 503s
const MAX_RETRIES = 3;

const cfg = JSON.parse(fs.readFileSync("./base44/.app.jsonc", "utf8").split('\n').filter(l => !l.trim().startsWith('//')).join('\n'));
const base44 = createClient({ appId: cfg.id });

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
          await new Promise(r => setTimeout(r, 2000 * attempt));
          continue;
        }
        throw new Error('Worker 503 after retries');
      }
      if (!resp.ok) throw new Error(`Worker ${resp.status}`);
      const data = await resp.json();
      if (!data.success || !data.imageUrl || data.imageUrl.length < 100) throw new Error('No image data');
      
      // Reject tiny images (likely black/empty) - real images are >50KB base64
      if (data.imageUrl.length < 50000) throw new Error('Image too small (likely black)');
      
      const upd = await base44.functions.invoke('update-pokemon-image', { id: pokemon.id, image_url: data.imageUrl });
      if (upd.status !== 200) throw new Error(`Update failed: ${upd.status}`);
      return true;
    } catch (e) {
      if (attempt === MAX_RETRIES) throw e;
      await new Promise(r => setTimeout(r, 2000 * attempt));
    }
  }
}

async function main() {
  console.log('🎨 Pokemon Image Generator');
  console.log(`📍 Worker: ${WORKER_URL}`);
  console.log(`⚡ Concurrency: ${CONCURRENCY}\n`);

  const all = await base44.entities.Pokemon.list();
  // Filter: no image, not AI-generated, or empty base64 (from earlier bug)
  const todo = all.filter(p => !p.image_url || !p.image_url.startsWith('data:image') || p.image_url.length < 100);
  console.log(`📦 Total: ${all.length} | Need images: ${todo.length}\n`);

  let done = 0, failed = 0;
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
        console.log(`❌ [${done + failed}/${todo.length}] ${chunk[j].name}: ${results[j].reason.message}`);
      }
    }
    
    // Brief pause between chunks
    if (i + CONCURRENCY < todo.length) await new Promise(r => setTimeout(r, 500));
    
    // Progress every 30
    if ((done + failed) % 30 === 0) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(0);
      const rate = (done / elapsed * 60).toFixed(1);
      console.log(`\n📊 Progress: ${done} done, ${failed} failed, ${elapsed}s elapsed, ~${rate}/min\n`);
    }
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(0);
  console.log(`\n🎉 Done! ${done} generated, ${failed} failed, ${elapsed}s total`);
  process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
