import { describe, it, expect } from 'vitest';
import { getEffectiveness, getMaxHP, calculateDamage, getCatchRate, getFaintedCatchRate } from './battle';

describe('Battle System', () => {
  describe('Type Effectiveness', () => {
    it('should return super-effective for Fire vs Grass', () => {
      expect(getEffectiveness('Fire', 'Grass')).toBe('super-effective');
    });

    it('should return not-very-effective for Fire vs Water', () => {
      expect(getEffectiveness('Fire', 'Water')).toBe('not-very-effective');
    });

    it('should return normal for neutral matchups', () => {
      expect(getEffectiveness('Fire', 'Psychic')).toBe('normal');
    });

    it('should return super-effective for Water vs Fire', () => {
      expect(getEffectiveness('Water', 'Fire')).toBe('super-effective');
    });

    it('should return super-effective for Electric vs Water', () => {
      expect(getEffectiveness('Electric', 'Water')).toBe('super-effective');
    });
  });

  describe('HP Calculation', () => {
    it('should calculate max HP based on power level', () => {
      const pokemon = { power_level: 50 };
      expect(getMaxHP(pokemon)).toBe(170); // 50 * 3 + 20
    });

    it('should handle low power level Pokemon', () => {
      const pokemon = { power_level: 10 };
      expect(getMaxHP(pokemon)).toBe(50); // 10 * 3 + 20
    });

    it('should handle high power level Pokemon', () => {
      const pokemon = { power_level: 100 };
      expect(getMaxHP(pokemon)).toBe(320); // 100 * 3 + 20
    });
  });

  describe('Damage Calculation', () => {
    it('should calculate base damage correctly', () => {
      const attacker = { power_level: 50, type: 'Fire' };
      const defender = { power_level: 50, type: 'Water' };
      const result = calculateDamage(attacker, defender);
      
      expect(result.damage).toBeGreaterThan(0);
      expect(result.damage).toBeLessThanOrEqual(100);
      expect(result.effectiveness).toBeDefined();
      expect(result.isCritical).toBeDefined();
    });

    it('should deal more damage with super-effective attacks', () => {
      const fireAttacker = { power_level: 50, type: 'Fire' };
      const grassDefender = { power_level: 50, type: 'Grass' };
      
      const result = calculateDamage(fireAttacker, grassDefender);
      
      // Super-effective attacks should have that effectiveness label
      expect(result.effectiveness).toBe('super-effective');
      expect(result.damage).toBeGreaterThan(0);
    });

    it('should mark critical hits', () => {
      const attacker = { power_level: 50, type: 'Fire' };
      const defender = { power_level: 50, type: 'Water' };
      
      const result = calculateDamage(attacker, defender);
      
      expect(typeof result.isCritical).toBe('boolean');
    });
  });

  describe('Catch Rate Calculation', () => {
    it('should return higher catch rate for low HP Pokemon', () => {
      const pokemon = {
        power_level: 50,
        rarity: 'Common'
      };
      const lowHP = 10;
      const highHP = 150;
      
      const lowHPRate = getCatchRate(pokemon, lowHP);
      const highHPRate = getCatchRate(pokemon, highHP);
      
      expect(lowHPRate).toBeGreaterThan(highHPRate);
      expect(lowHPRate).toBeGreaterThanOrEqual(0);
      expect(lowHPRate).toBeLessThanOrEqual(1);
    });

    it('should return lower catch rate for Legendary Pokemon', () => {
      const commonPokemon = {
        power_level: 50,
        rarity: 'Common'
      };
      const legendaryPokemon = {
        power_level: 50,
        rarity: 'Legendary'
      };
      const currentHP = 50;
      
      const commonRate = getCatchRate(commonPokemon, currentHP);
      const legendaryRate = getCatchRate(legendaryPokemon, currentHP);
      
      expect(commonRate).toBeGreaterThan(legendaryRate);
    });

    it('should return high catch rate for fainted Pokemon', () => {
      const rate = getFaintedCatchRate();
      expect(rate).toBe(0.90);
    });
  });
});
