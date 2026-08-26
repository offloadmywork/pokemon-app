# Art Budget Decision Brief

**For:** Netanel · **From:** Sprite · **Date:** 2026-08-26
**Decision needed by:** next art milestone (blocks all visual-quality work)

## Where we are

The Verdant Path vertical slice uses handcrafted **procedural art** (code-drawn
textures): 4 ground variants, authored tree canopies, 4-direction hero sprites,
two-frame animations, a shared palette. The independent judge scored feel 7 /
readability 8 / pacing 8 on this look — it is cohesive and fully license-safe.

**Procedural is now maxed out.** All planned upgrades shipped (tree sway, boss
pulse, grass rustle, ground dithering, walk cycle). The next visible quality
jump requires real sprite/asset production.

## Current budgets (enforced by `verify:release`)

| Bucket | Budget | Notes |
|---|---|---|
| Initial shell | 140 KB gzip | React app chrome |
| Deferred engine | 350 KB gzip | Phaser, loads only on World tab |
| Total package | 500 KB gzip | Hard ceiling in CI |

Headroom is nearly zero — that constraint drove the original procedural call.

## Options

**A. Stay procedural (0 KB added)**
- Cost: visual quality plateaus; judge scores will stall.
- Keeps the release gate untouched.

**B. CC0 asset pack (recommended: +100–150 KB budget raise)**
- Buy: professional creature/world sprites, animation frames we can't draw well
  procedurally at 32px.
- License-safe (CC0/public domain), no attribution burden.
- Needs: budget raise in `web-performance-audit.js` targets + an attribution/
  source audit script + curation pass to keep the judged-cohesive look.
- Risk: style clash with existing procedural tiles — mitigate by converting one
  layer at a time (creatures first, world second).

**C. Commissioned custom art (+150–250 KB, real cost)**
- Buy: unique identity, best quality ceiling.
- Only worth it after B proves players engage with the slice.

## Recommendation

**Option B** with a +150 KB deferred-engine raise (350 → 500 KB) and total
package 500 → 650 KB. Creatures first (highest player-facing impact), world
tiles stay procedural for now.

If approved, I'll: source a vetted CC0 pack, add an asset-license audit to the
release gate, raise budgets with before/after perf numbers, and convert the
creature sprites as the first slice.

## Related blocker (also needs you)

CI deploy still fails: repo secrets `CLOUDFLARE_API_TOKEN` +
`CLOUDFLARE_ACCOUNT_ID` not set. ~50 verified commits are not live. At deploy
time also run `wrangler secret put SESSION_SECRET` (session auth fails closed
without it).
