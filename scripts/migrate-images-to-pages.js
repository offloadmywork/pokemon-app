#!/usr/bin/env node
/**
 * Pokemon Image Migration: Base64 → Cloudflare Pages
 * 
 * Phase 1: Fetch all Pokemon with base64 images, decode, save as PNG files
 * Phase 2: Deploy the image directory to Cloudflare Pages
 * Phase 3: Update all Pokemon entities with new URLs
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const cfg = JSON.parse(
  fs.readFileSync("./base44/.app.jsonc", "utf8")
    .split('\n')
    .filter(l => !l.trim().startsWith('//'))
    .join('\n')
);
const APP_ID = cfg.id;
const BASE_URL = `https://base44.app/api/apps/${APP_ID}`;
const PAGE_SIZE = 10; // Small pages since each has ~1.5MB base64 data
const CONCURRENCY = 3;
const IMAGE_DIR = "/tmp/pokemon-images";
const PAGES_PROJECT = "pokemon-images";
const PAGES_URL = "https://pokemon-images.pages.dev";

function hasBase64Image(p) {
  return p.image_url && p.image_url.startsWith('data:image') && p.image_url.length > 100;
}

function decodeBase64Image(dataUrl) {
  // Strip the data URL prefix: "data:image/png;base64," or "data:image/jpeg;base64,"
  const match = dataUrl.match(/^data:image\/\w+;base64,(.+)$/);
  if (!match) throw new Error('Invalid data URL format');
  return Buffer.from(match[1], 'base64');
}

async function fetchPage(skip) {
  const url = `${BASE_URL}/entities/Pokemon?limit=${PAGE_SIZE}&skip=${skip}`;
  const resp = await fetch(url, {
    headers: { 'X-App-Id': APP_ID, 'Accept': 'application/json' }
  });
  if (!resp.ok) throw new Error(`List failed: ${resp.status} ${resp.statusText}`);
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
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Update failed: ${resp.status} ${text}`);
  }
  return resp;
}

async function phase1_extractImages() {
  console.log('📦 Phase 1: Extracting base64 images to disk\n');
  
  // Create image directory
  if (fs.existsSync(IMAGE_DIR)) {
    fs.rmSync(IMAGE_DIR, { recursive: true });
  }
  fs.mkdirSync(path.join(IMAGE_DIR, 'pokemon'), { recursive: true });
  
  const pokemonWithImages = []; // {id, name} for tracking
  let totalCount = 0;
  let skippedCount = 0;
  let extractedCount = 0;
  let skip = 0;
  let totalBytes = 0;
  
  while (true) {
    process.stdout.write(`  Fetching page (skip=${skip})...`);
    let page;
    try {
      page = await fetchPage(skip);
    } catch (e) {
      console.log(` ERROR: ${e.message}`);
      break;
    }
    console.log(` got ${page.length} Pokemon`);
    
    if (!Array.isArray(page) || page.length === 0) break;
    totalCount += page.length;
    
    for (const p of page) {
      if (hasBase64Image(p)) {
        try {
          const imageBuffer = decodeBase64Image(p.image_url);
          const filename = `pokemon/${p.id}.png`;
          fs.writeFileSync(path.join(IMAGE_DIR, filename), imageBuffer);
          pokemonWithImages.push({ id: p.id, name: p.name });
          extractedCount++;
          totalBytes += imageBuffer.length;
          process.stdout.write(`    ✅ ${p.name} (${(imageBuffer.length / 1024).toFixed(0)}KB)\n`);
        } catch (e) {
          console.log(`    ❌ ${p.name}: ${e.message}`);
        }
      } else {
        skippedCount++;
      }
    }
    
    if (page.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
    
    // Small delay between pages to avoid rate limits
    await new Promise(r => setTimeout(r, 300));
  }
  
  console.log(`\n📊 Phase 1 Summary:`);
  console.log(`   Total Pokemon: ${totalCount}`);
  console.log(`   Extracted: ${extractedCount} (${(totalBytes / 1024 / 1024).toFixed(1)}MB)`);
  console.log(`   Skipped (no base64 image): ${skippedCount}`);
  
  // Save manifest for Phase 3
  fs.writeFileSync(path.join(IMAGE_DIR, 'manifest.json'), JSON.stringify(pokemonWithImages, null, 2));
  
  return { pokemonWithImages, totalCount, extractedCount, skippedCount, totalBytes };
}

function phase2_deploy() {
  console.log('\n🚀 Phase 2: Deploying to Cloudflare Pages\n');
  
  try {
    const output = execSync(
      `wrangler pages deploy "${IMAGE_DIR}" --project-name ${PAGES_PROJECT} --branch main --commit-message "Pokemon images migration"`,
      { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }
    );
    console.log(output);
    
    // Extract the deployment URL from output
    const urlMatch = output.match(/https:\/\/[^\s]+\.pokemon-images\.pages\.dev/);
    const deployUrl = urlMatch ? urlMatch[0] : PAGES_URL;
    console.log(`   Deploy URL: ${deployUrl}`);
    return deployUrl;
  } catch (e) {
    console.error(`❌ Deploy failed: ${e.message}`);
    if (e.stdout) console.log(e.stdout);
    if (e.stderr) console.log(e.stderr);
    throw e;
  }
}

async function phase3_updateEntities(pokemonWithImages, baseUrl) {
  console.log(`\n🔄 Phase 3: Updating ${pokemonWithImages.length} Pokemon entities\n`);
  console.log(`   Base URL: ${baseUrl}\n`);
  
  let updated = 0;
  let failed = 0;
  const failures = [];
  
  for (let i = 0; i < pokemonWithImages.length; i += CONCURRENCY) {
    const chunk = pokemonWithImages.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      chunk.map(p => {
        const newUrl = `${baseUrl}/pokemon/${p.id}.png`;
        return updatePokemonImage(p.id, newUrl);
      })
    );
    
    for (let j = 0; j < results.length; j++) {
      if (results[j].status === 'fulfilled') {
        updated++;
        console.log(`  ✅ [${updated + failed}/${pokemonWithImages.length}] ${chunk[j].name}`);
      } else {
        failed++;
        failures.push({ name: chunk[j].name, error: results[j].reason.message });
        console.log(`  ❌ [${updated + failed}/${pokemonWithImages.length}] ${chunk[j].name}: ${results[j].reason.message}`);
      }
    }
    
    // Rate limit protection
    if (i + CONCURRENCY < pokemonWithImages.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }
  
  console.log(`\n📊 Phase 3 Summary:`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Failed: ${failed}`);
  
  if (failures.length > 0) {
    console.log(`\n   Failures:`);
    failures.forEach(f => console.log(`     - ${f.name}: ${f.error}`));
  }
  
  return { updated, failed, failures };
}

async function main() {
  console.log('🎮 Pokemon Image Migration: Base64 → Cloudflare Pages');
  console.log(`📍 Base44 App: ${APP_ID}`);
  console.log(`📍 Pages Project: ${PAGES_PROJECT}`);
  console.log(`📍 Image Dir: ${IMAGE_DIR}\n`);
  
  const start = Date.now();
  
  // Phase 1: Extract images
  const { pokemonWithImages, totalCount, extractedCount, totalBytes } = await phase1_extractImages();
  
  if (extractedCount === 0) {
    console.log('\n⚠️  No images to migrate!');
    process.exit(0);
  }
  
  // Phase 2: Deploy to Pages
  const deployUrl = phase2_deploy();
  
  // Phase 3: Update entities
  const { updated, failed } = await phase3_updateEntities(pokemonWithImages, PAGES_URL);
  
  const elapsed = ((Date.now() - start) / 1000).toFixed(0);
  console.log(`\n🎉 Migration Complete!`);
  console.log(`   Total Pokemon: ${totalCount}`);
  console.log(`   Images migrated: ${extractedCount} (${(totalBytes / 1024 / 1024).toFixed(1)}MB)`);
  console.log(`   Entities updated: ${updated}`);
  console.log(`   Failures: ${failed}`);
  console.log(`   Time: ${elapsed}s`);
  console.log(`   Images URL: ${PAGES_URL}/pokemon/{id}.png`);
  
  // Cleanup
  // fs.rmSync(IMAGE_DIR, { recursive: true });
  // console.log('   Cleaned up temp directory');
  
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
