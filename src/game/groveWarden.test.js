import { describe, expect, it } from 'vitest';
import { GROVE_WARDEN, getWardenBattleId, isWardenVictory } from './groveWarden';

describe('Grove Warden boss rules', () => {
  it('names the warden battle using the legacy boss id convention', () => {
    expect(getWardenBattleId()).toBe('boss-grove-warden');
    expect(GROVE_WARDEN.isBoss).toBe(true);
  });

  it('opens the reward cache only on a confirmed warden victory', () => {
    expect(isWardenVictory({ battleWon: true, pokemon: { id: getWardenBattleId(), isBoss: true } })).toBe(true);
    expect(isWardenVictory({ battleWon: false, pokemon: { id: getWardenBattleId(), isBoss: true } })).toBe(false);
    expect(isWardenVictory({ battleWon: true, pokemon: { id: 'wild-thing', isBoss: false } })).toBe(false);
    expect(isWardenVictory(null)).toBe(false);
  });
});
