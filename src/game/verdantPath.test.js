import { describe, expect, it } from 'vitest';
import { VERDANT_PATH, getVerdantFacing, getVerdantGuidanceStep, getVerdantMovementIntent, getVerdantObjective, getVerdantSlideVelocity, getVerdantTileEvent, getVerdantTileVariant, isVerdantEncounterTile, isVerdantWalkable } from './verdantPath';

describe('Verdant Path world rules', () => {
  it('keeps the player spawn inside a walkable route', () => {
    expect(isVerdantWalkable(VERDANT_PATH.spawn.x, VERDANT_PATH.spawn.y)).toBe(true);
  });

  it('creates authored encounter glades without making the world border walkable', () => {
    expect(isVerdantEncounterTile(10, 7)).toBe(true);
    expect(isVerdantEncounterTile(2, 2)).toBe(false);
    expect(isVerdantWalkable(0, 7)).toBe(false);
  });

  it('requires the intentional bridge crossing through the stream bank', () => {
    expect(isVerdantWalkable(15, 9)).toBe(false);
    expect(isVerdantWalkable(15, 10)).toBe(true);
  });

  it('gives a held touch direction the same deterministic movement intent as keyboard input', () => {
    expect(getVerdantMovementIntent({ right: true })).toEqual({ x: 1, y: 0 });
    expect(getVerdantMovementIntent({ touchDirection: 'up', right: true })).toEqual({ x: 0, y: -1 });
    expect(getVerdantMovementIntent({ touchDirection: null })).toEqual({ x: 0, y: 0 });
  });
});

describe('Verdant Path boss gate', () => {
  it('places the warden arena and reward cache on walkable ground', () => {
    const { bossArena, rewardCache } = VERDANT_PATH;
    expect(isVerdantWalkable(bossArena.x + 1, bossArena.y + 1)).toBe(true);
    expect(isVerdantWalkable(rewardCache.x, rewardCache.y)).toBe(true);
  });

  it('triggers the warden inside the arena and nowhere else', () => {
    const { bossArena } = VERDANT_PATH;
    expect(getVerdantTileEvent(bossArena.x + 1, bossArena.y + 1)).toBe('boss');
    expect(getVerdantTileEvent(VERDANT_PATH.spawn.x, VERDANT_PATH.spawn.y)).toBe(null);
  });

  it('closes the boss gate once the warden is defeated', () => {
    const { bossArena } = VERDANT_PATH;
    expect(getVerdantTileEvent(bossArena.x + 1, bossArena.y + 1, { bossDefeated: true })).toBe(null);
  });

  it('keeps the reward sealed until the warden falls', () => {
    const { rewardCache } = VERDANT_PATH;
    expect(getVerdantTileEvent(rewardCache.x, rewardCache.y, { bossDefeated: false })).toBe(null);
    expect(getVerdantTileEvent(rewardCache.x, rewardCache.y, { bossDefeated: true })).toBe('reward');
  });
});

describe('Verdant Path authored pacing', () => {
  it('guides players through warden first, cache second, peace last', () => {
    expect(getVerdantObjective({}).label).toMatch(/Warden/);
    expect(getVerdantObjective({ bossDefeated: true }).label).toMatch(/cache/);
    expect(getVerdantObjective({ bossDefeated: true, cacheOpened: true }).label).toMatch(/peace/);
  });

  it('points one cardinal step toward the current objective', () => {
    const warden = getVerdantObjective({});
    expect(getVerdantGuidanceStep(VERDANT_PATH.spawn.x, VERDANT_PATH.spawn.y, warden)).toBe('east');
    expect(getVerdantGuidanceStep(warden.x, warden.y, warden)).toBe(null);
    const cache = getVerdantObjective({ bossDefeated: true });
    expect(getVerdantGuidanceStep(cache.x + 1, cache.y, cache)).toBe('west');
    expect(getVerdantGuidanceStep(cache.x, cache.y - 1, cache)).toBe('south');
  });
});

describe('Verdant Path art variation rules', () => {
  it('assigns stable decorative variants per tile', () => {
    expect(getVerdantTileVariant(3, 4)).toBe(getVerdantTileVariant(3, 4));
    expect(getVerdantTileVariant(5, 9)).not.toBe(getVerdantTileVariant(6, 9));
  });

  it('keeps every variant inside the authored palette range', () => {
    for (let y = 0; y < VERDANT_PATH.height; y += 3) {
      for (let x = 0; x < VERDANT_PATH.width; x += 3) {
        const variant = getVerdantTileVariant(x, y);
        expect(variant).toBeGreaterThanOrEqual(0);
        expect(variant).toBeLessThan(4);
      }
    }
  });
});

describe('Verdant Path character facing rules', () => {
  it('faces the direction of travel and keeps the last facing when idle', () => {
    expect(getVerdantFacing({ x: 1, y: 0 }, 'up')).toBe('right');
    expect(getVerdantFacing({ x: -1, y: 1 }, 'up')).toBe('left');
    expect(getVerdantFacing({ x: 0, y: -1 }, 'left')).toBe('up');
    expect(getVerdantFacing({ x: 0, y: 0 }, 'north-by-northwest')).toBe('north-by-northwest');
    expect(getVerdantFacing({}, 'down')).toBe('down');
  });
});

describe('Verdant Path wall-slide rules', () => {
  it('slides along a wall instead of sticking: blocked axis drops, free axis keeps moving', () => {
    // Spawn (4, 17); walk left into the border at x=1 while drifting up.
    const px = VERDANT_PATH.tileSize * 1.5;
    const py = VERDANT_PATH.tileSize * 17.5;
    const result = getVerdantSlideVelocity(px, py, -125, -60);
    expect(result.x).toBe(0);
    expect(result.y).toBe(-60);
  });

  it('keeps full motion on open ground', () => {
    const px = VERDANT_PATH.spawn.x * VERDANT_PATH.tileSize + 16;
    const py = VERDANT_PATH.spawn.y * VERDANT_PATH.tileSize + 16;
    expect(getVerdantSlideVelocity(px, py, 100, -50)).toEqual({ x: 100, y: -50 });
  });

  it('stops fully when cornered', () => {
    const result = getVerdantSlideVelocity(VERDANT_PATH.tileSize * 1.5, VERDANT_PATH.tileSize * 1.5, -125, -125);
    expect(result).toEqual({ x: 0, y: 0 });
  });
});
