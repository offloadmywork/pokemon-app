import { describe, expect, it } from 'vitest';
import { VERDANT_PATH, getVerdantGuidanceStep, getVerdantMovementIntent, getVerdantObjective, getVerdantTileEvent, isVerdantEncounterTile, isVerdantWalkable } from './verdantPath';

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
