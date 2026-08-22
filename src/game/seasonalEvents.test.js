import { describe, expect, it } from 'vitest';
import {
  getActiveSeasonalEvent,
  getSeasonalCatchRate,
  getSeasonalEncounterBonus,
  getSeasonalXpReward,
  selectSeasonalEncounterType,
  SEASONAL_EVENTS,
} from './seasonalEvents';

describe('Seasonal Events', () => {
  it('activates Summer Splash during July', () => {
    expect(getActiveSeasonalEvent('2026-07-05')).toEqual(expect.objectContaining({
      key: 'summer-splash',
      name: 'Summer Splash',
      boostedTypes: ['Water', 'Ice'],
    }));
  });

  it('returns null when no seasonal event is active', () => {
    expect(getActiveSeasonalEvent('2026-09-15')).toBeNull();
  });

  it('applies encounter bonuses only to boosted event types', () => {
    const event = SEASONAL_EVENTS.find((seasonalEvent) => seasonalEvent.key === 'summer-splash');

    expect(getSeasonalEncounterBonus(event, { type: 'Water' })).toEqual({
      catchRateMultiplier: 1.15,
      xpMultiplier: 1.1,
    });
    expect(getSeasonalEncounterBonus(event, { type: 'Fire' })).toEqual({
      catchRateMultiplier: 1,
      xpMultiplier: 1,
    });
  });

  it('boosts catch rate and XP rewards for event Pokémon only', () => {
    const event = SEASONAL_EVENTS.find((seasonalEvent) => seasonalEvent.key === 'summer-splash');

    expect(getSeasonalCatchRate(0.5, event, { type: 'Water' })).toBe(0.575);
    expect(getSeasonalCatchRate(0.94, event, { type: 'Ice' })).toBe(0.95);
    expect(getSeasonalCatchRate(0.5, event, { type: 'Fire' })).toBe(0.5);

    expect(getSeasonalXpReward(10, event, { type: 'Water' })).toBe(11);
    expect(getSeasonalXpReward(10, event, { type: 'Fire' })).toBe(10);
  });

  it('selects boosted encounter types only inside the event weighting window', () => {
    const event = SEASONAL_EVENTS.find((seasonalEvent) => seasonalEvent.key === 'summer-splash');

    expect(selectSeasonalEncounterType(event, 0.1)).toBe('Water');
    expect(selectSeasonalEncounterType(event, 0.3)).toBe('Ice');
    expect(selectSeasonalEncounterType(event, 0.8)).toBeNull();
    expect(selectSeasonalEncounterType(null, 0.1)).toBeNull();
  });
});
