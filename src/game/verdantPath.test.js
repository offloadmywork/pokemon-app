import { describe, expect, it } from 'vitest';
import { VERDANT_PATH, getVerdantMovementIntent, isVerdantEncounterTile, isVerdantWalkable } from './verdantPath';

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
