import { describe, expect, it } from 'vitest';
import {
  applyLureDurationBonus,
  getLureByItemId,
  getLureEncounterBonus,
  selectLureEncounterType,
} from './lures';

describe('Lure encounter rules', () => {
  it('loads lure rules from item ids', () => {
    expect(getLureByItemId('basic_lure')).toEqual(expect.objectContaining({
      itemId: 'basic_lure',
      durationEncounters: 5,
      encounterChanceMultiplier: 1.25,
    }));
    expect(getLureByItemId('unknown')).toBeNull();
  });

  it('boosts encounter chance for any active lure without changing catch rewards', () => {
    expect(getLureEncounterBonus(getLureByItemId('basic_lure'), { type: 'Fire' })).toEqual({
      encounterChanceMultiplier: 1.25,
      catchRateMultiplier: 1,
      xpMultiplier: 1,
    });
    expect(getLureEncounterBonus(null, { type: 'Water' })).toEqual({
      encounterChanceMultiplier: 1,
      catchRateMultiplier: 1,
      xpMultiplier: 1,
    });
  });

  it('adds type-specific encounter weighting for elemental lures', () => {
    const lure = getLureByItemId('water_lure');

    expect(selectLureEncounterType(lure, 0.1)).toBe('Water');
    expect(selectLureEncounterType(lure, 0.5)).toBeNull();
    expect(selectLureEncounterType(getLureByItemId('basic_lure'), 0.1)).toBeNull();
  });

  it('extends lure duration by purchased Lure Slot upgrade levels', () => {
    expect(applyLureDurationBonus(getLureByItemId('water_lure'), 2)).toEqual(expect.objectContaining({
      durationEncounters: 7,
    }));
    expect(applyLureDurationBonus(getLureByItemId('water_lure'), 0)).toEqual(expect.objectContaining({
      durationEncounters: 5,
    }));
    expect(applyLureDurationBonus(null, 2)).toBeNull();
  });
});
