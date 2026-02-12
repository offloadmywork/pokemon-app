// ═══════════════════════════════════════════
// GAME CONSTANTS TESTS
// ═══════════════════════════════════════════
import { describe, it, expect } from 'vitest';
import {
  CATCH_RATES,
  TOTAL_POKEMON,
  STORAGE_KEY,
  RARITY_WEIGHTS,
  XP_REWARDS,
  CRITICAL_CHANCE,
  getPokemonImage,
  rollRarity,
  getLevelFromXP,
  getLevelConfig,
  getNextLevelXP,
} from './constants';

describe('Game Constants', () => {
  describe('CATCH_RATES', () => {
    it('should have catch rates for all rarities', () => {
      expect(CATCH_RATES.Common).toBeGreaterThan(0);
      expect(CATCH_RATES.Uncommon).toBeGreaterThan(0);
      expect(CATCH_RATES.Rare).toBeGreaterThan(0);
      expect(CATCH_RATES.Epic).toBeGreaterThan(0);
      expect(CATCH_RATES.Legendary).toBeGreaterThan(0);
    });

    it('should have decreasing catch rates for higher rarities', () => {
      expect(CATCH_RATES.Common).toBeGreaterThan(CATCH_RATES.Uncommon);
      expect(CATCH_RATES.Uncommon).toBeGreaterThan(CATCH_RATES.Rare);
      expect(CATCH_RATES.Rare).toBeGreaterThan(CATCH_RATES.Epic);
      expect(CATCH_RATES.Epic).toBeGreaterThan(CATCH_RATES.Legendary);
    });
  });

  describe('RARITY_WEIGHTS', () => {
    it('should be organized by level (1-5)', () => {
      expect(RARITY_WEIGHTS[1]).toBeDefined();
      expect(RARITY_WEIGHTS[2]).toBeDefined();
      expect(RARITY_WEIGHTS[3]).toBeDefined();
      expect(RARITY_WEIGHTS[4]).toBeDefined();
      expect(RARITY_WEIGHTS[5]).toBeDefined();
    });

    it('should have level 1 weights summing to 100', () => {
      const total = Object.values(RARITY_WEIGHTS[1]).reduce((a, b) => a + b, 0);
      expect(total).toBe(100);
    });

    it('should have legendary at level 3+', () => {
      expect(RARITY_WEIGHTS[3].Legendary).toBeGreaterThan(0);
      expect(RARITY_WEIGHTS[4].Legendary).toBeGreaterThan(RARITY_WEIGHTS[3].Legendary);
      expect(RARITY_WEIGHTS[5].Legendary).toBeGreaterThan(RARITY_WEIGHTS[4].Legendary);
    });

    it('should have rollRarity function', () => {
      expect(typeof rollRarity).toBe('function');
      const result = rollRarity(1);
      expect(['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary']).toContain(result);
    });
  });

  describe('XP_REWARDS', () => {
    it('should have XP values for all rarities', () => {
      expect(XP_REWARDS.Common).toBeGreaterThan(0);
      expect(XP_REWARDS.Uncommon).toBeGreaterThan(XP_REWARDS.Common);
      expect(XP_REWARDS.Rare).toBeGreaterThan(XP_REWARDS.Uncommon);
      expect(XP_REWARDS.Epic).toBeGreaterThan(XP_REWARDS.Rare);
      expect(XP_REWARDS.Legendary).toBeGreaterThan(XP_REWARDS.Epic);
    });
  });

  describe('Level System', () => {
    it('should have getLevelFromXP function', () => {
      expect(typeof getLevelFromXP).toBe('function');
      expect(getLevelFromXP(0)).toBe(1);
      expect(getLevelFromXP(100)).toBe(2);
      expect(getLevelFromXP(300)).toBe(3);
    });

    it('should have getLevelConfig function', () => {
      expect(typeof getLevelConfig).toBe('function');
      const config = getLevelConfig(1);
      expect(config.name).toBeDefined();
      expect(config.xpRequired).toBeDefined();
    });

    it('should have getNextLevelXP function', () => {
      expect(typeof getNextLevelXP).toBe('function');
      expect(getNextLevelXP(1)).toBe(100);
      expect(getNextLevelXP(5)).toBeNull();
    });
  });

  describe('Game Balance', () => {
    it('should have valid critical chance', () => {
      expect(CRITICAL_CHANCE).toBeGreaterThan(0);
      expect(CRITICAL_CHANCE).toBeLessThanOrEqual(0.5);
    });

    it('should have reasonable total pokemon count', () => {
      expect(TOTAL_POKEMON).toBeGreaterThan(0);
      expect(TOTAL_POKEMON).toBeLessThan(10000);
    });
  });

  describe('Storage', () => {
    it('should have storage key defined', () => {
      expect(STORAGE_KEY).toBeDefined();
      expect(typeof STORAGE_KEY).toBe('string');
      expect(STORAGE_KEY.length).toBeGreaterThan(0);
    });
  });

  describe('getPokemonImage', () => {
    it('should generate image URL for pokemon', () => {
      const pokemon = { name: 'TestMon', type: 'Fire' };
      const url = getPokemonImage(pokemon);
      expect(url).toContain('dicebear');
      expect(url).toContain('TestMonFire');
    });

    it('should handle pokemon without type', () => {
      const pokemon = { name: 'TestMon' };
      const url = getPokemonImage(pokemon);
      expect(url).toBeDefined();
      expect(url.length).toBeGreaterThan(0);
    });
  });
});
