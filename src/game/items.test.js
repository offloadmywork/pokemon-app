import { describe, it, expect } from 'vitest';
import {
  ITEM_TYPES,
  getItemById,
  getItemsByCategory,
  getHealingItems,
  getPokeballs,
  calculateHealAmount,
  canUseItemOnPokemon,
  getUsageError,
  applyItemEffect,
  STARTER_INVENTORY,
  isPokeball,
  isHealingItem,
} from './items';

describe('Items System', () => {
  // ═══════════════════════════════════════════
  // Item Definitions
  // ═══════════════════════════════════════════

  describe('Item Definitions', () => {
    it('defines all required item types', () => {
      expect(ITEM_TYPES.POTION).toBeDefined();
      expect(ITEM_TYPES.SUPER_POTION).toBeDefined();
      expect(ITEM_TYPES.REVIVE).toBeDefined();
      expect(ITEM_TYPES.POKEBALL).toBeDefined();
      expect(ITEM_TYPES.GREAT_BALL).toBeDefined();
      expect(ITEM_TYPES.ULTRA_BALL).toBeDefined();
    });

    it('Potion has correct properties', () => {
      const potion = ITEM_TYPES.POTION;
      expect(potion.id).toBe('potion');
      expect(potion.name).toBe('Potion');
      expect(potion.healAmount).toBe(50);
      expect(potion.catchMultiplier).toBe(1.0);
      expect(potion.canRevive).toBe(false);
      expect(potion.category).toBe('healing');
      expect(potion.emoji).toBe('🧪');
    });

    it('Super Potion has correct properties', () => {
      const superPotion = ITEM_TYPES.SUPER_POTION;
      expect(superPotion.id).toBe('super_potion');
      expect(superPotion.healAmount).toBe(100);
      expect(superPotion.catchMultiplier).toBe(1.0);
      expect(superPotion.canRevive).toBe(false);
    });

    it('Revive has correct properties', () => {
      const revive = ITEM_TYPES.REVIVE;
      expect(revive.id).toBe('revive');
      expect(revive.healAmount).toBe(0);
      expect(revive.canRevive).toBe(true);
      expect(revive.category).toBe('revival');
    });

    it('Pokeball variants have correct catch multipliers', () => {
      expect(ITEM_TYPES.POKEBALL.catchMultiplier).toBe(1.0);
      expect(ITEM_TYPES.GREAT_BALL.catchMultiplier).toBe(1.5);
      expect(ITEM_TYPES.ULTRA_BALL.catchMultiplier).toBe(2.0);
    });

    it('all pokeballs have ball category', () => {
      expect(ITEM_TYPES.POKEBALL.category).toBe('ball');
      expect(ITEM_TYPES.GREAT_BALL.category).toBe('ball');
      expect(ITEM_TYPES.ULTRA_BALL.category).toBe('ball');
    });
  });

  // ═══════════════════════════════════════════
  // Item Lookup Functions
  // ═══════════════════════════════════════════

  describe('getItemById', () => {
    it('returns item by id', () => {
      expect(getItemById('potion')).toBe(ITEM_TYPES.POTION);
      expect(getItemById('ultra_ball')).toBe(ITEM_TYPES.ULTRA_BALL);
    });

    it('returns null for unknown id', () => {
      expect(getItemById('unknown')).toBeNull();
    });
  });

  describe('getItemsByCategory', () => {
    it('returns healing items', () => {
      const healingItems = getItemsByCategory('healing');
      expect(healingItems).toHaveLength(2);
      expect(healingItems.map(i => i.id)).toContain('potion');
      expect(healingItems.map(i => i.id)).toContain('super_potion');
    });

    it('returns pokeballs', () => {
      const balls = getItemsByCategory('ball');
      expect(balls).toHaveLength(3);
    });

    it('returns empty array for unknown category', () => {
      expect(getItemsByCategory('unknown')).toEqual([]);
    });
  });

  describe('getHealingItems', () => {
    it('returns only healing category items', () => {
      const items = getHealingItems();
      expect(items.every(i => i.category === 'healing')).toBe(true);
    });
  });

  describe('getPokeballs', () => {
    it('returns only ball category items', () => {
      const items = getPokeballs();
      expect(items.every(i => i.category === 'ball')).toBe(true);
    });
  });

  // ═══════════════════════════════════════════
  // Healing Calculations
  // ═══════════════════════════════════════════

  describe('calculateHealAmount', () => {
    const pokemon = (currentHP, maxHP = 100) => ({ currentHP, maxHP });

    it('Potion heals 50 HP', () => {
      expect(calculateHealAmount(ITEM_TYPES.POTION, pokemon(30))).toBe(50);
    });

    it('Super Potion heals 100 HP when enough missing HP', () => {
      // With 20/150 HP, missing is 130, Super Potion can heal full 100
      expect(calculateHealAmount(ITEM_TYPES.SUPER_POTION, pokemon(20, 150))).toBe(100);
    });

    it('Super Potion healing is capped at missing HP', () => {
      // With 20/100 HP, missing is 80, so Super Potion (100 heal) is capped to 80
      expect(calculateHealAmount(ITEM_TYPES.SUPER_POTION, pokemon(20, 100))).toBe(80);
    });

    it('healing is capped at max HP', () => {
      // Pokemon with 80/100 HP, potion would heal 50, but only 20 needed
      expect(calculateHealAmount(ITEM_TYPES.POTION, pokemon(80))).toBe(20);
    });

    it('no healing if at full HP', () => {
      expect(calculateHealAmount(ITEM_TYPES.POTION, pokemon(100))).toBe(0);
    });

    it('Revive heals to 50% of max HP', () => {
      const fainted = pokemon(0, 100);
      expect(calculateHealAmount(ITEM_TYPES.REVIVE, fainted)).toBe(50);
    });

    it('Revive with different max HP values', () => {
      expect(calculateHealAmount(ITEM_TYPES.REVIVE, pokemon(0, 80))).toBe(40);
      expect(calculateHealAmount(ITEM_TYPES.REVIVE, pokemon(0, 150))).toBe(75);
    });

    it('Pokeballs do not heal', () => {
      expect(calculateHealAmount(ITEM_TYPES.POKEBALL, pokemon(30))).toBe(0);
    });
  });

  // ═══════════════════════════════════════════
  // Item Usage Validation
  // ═══════════════════════════════════════════

  describe('canUseItemOnPokemon', () => {
    const pokemon = (currentHP, maxHP = 100) => ({ currentHP, maxHP });

    it('can use Potion on damaged Pokemon', () => {
      expect(canUseItemOnPokemon(ITEM_TYPES.POTION, pokemon(50))).toBe(true);
    });

    it('cannot use Potion on full HP Pokemon', () => {
      expect(canUseItemOnPokemon(ITEM_TYPES.POTION, pokemon(100))).toBe(false);
    });

    it('cannot use Potion on fainted Pokemon', () => {
      expect(canUseItemOnPokemon(ITEM_TYPES.POTION, pokemon(0))).toBe(false);
    });

    it('can use Revive on fainted Pokemon', () => {
      expect(canUseItemOnPokemon(ITEM_TYPES.REVIVE, pokemon(0))).toBe(true);
    });

    it('cannot use Revive on non-fainted Pokemon', () => {
      expect(canUseItemOnPokemon(ITEM_TYPES.REVIVE, pokemon(50))).toBe(false);
    });

    it('cannot use Pokeball directly on Pokemon', () => {
      expect(canUseItemOnPokemon(ITEM_TYPES.POKEBALL, pokemon(50))).toBe(false);
    });
  });

  describe('getUsageError', () => {
    const pokemon = (currentHP, maxHP = 100) => ({ currentHP, maxHP });

    it('returns correct error for Revive on non-fainted', () => {
      const error = getUsageError(ITEM_TYPES.REVIVE, pokemon(50));
      expect(error).toContain('fainted');
    });

    it('returns correct error for healing fainted Pokemon', () => {
      const error = getUsageError(ITEM_TYPES.POTION, pokemon(0));
      expect(error).toContain('fainted');
    });

    it('returns correct error for healing full HP', () => {
      const error = getUsageError(ITEM_TYPES.POTION, pokemon(100));
      expect(error).toContain('full HP');
    });
  });

  // ═══════════════════════════════════════════
  // Item Effects
  // ═══════════════════════════════════════════

  describe('applyItemEffect', () => {
    const pokemon = (currentHP, maxHP = 100) => ({ currentHP, maxHP, name: 'TestPokemon' });

    it('heals Pokemon with Potion', () => {
      const result = applyItemEffect(ITEM_TYPES.POTION, pokemon(30));
      expect(result.currentHP).toBe(80);
    });

    it('heals Pokemon with Super Potion', () => {
      const result = applyItemEffect(ITEM_TYPES.SUPER_POTION, pokemon(20));
      expect(result.currentHP).toBe(100);
    });

    it('caps healing at max HP', () => {
      const result = applyItemEffect(ITEM_TYPES.POTION, pokemon(80));
      expect(result.currentHP).toBe(100);
    });

    it('revives fainted Pokemon to 50%', () => {
      const result = applyItemEffect(ITEM_TYPES.REVIVE, pokemon(0));
      expect(result.currentHP).toBe(50);
    });

    it('throws error for invalid use', () => {
      expect(() => applyItemEffect(ITEM_TYPES.POTION, pokemon(100))).toThrow();
      expect(() => applyItemEffect(ITEM_TYPES.REVIVE, pokemon(50))).toThrow();
    });

    it('preserves other Pokemon properties', () => {
      const original = { currentHP: 30, maxHP: 100, name: 'Pikachu', type: 'Electric' };
      const result = applyItemEffect(ITEM_TYPES.POTION, original);
      expect(result.name).toBe('Pikachu');
      expect(result.type).toBe('Electric');
      expect(result.maxHP).toBe(100);
    });
  });

  // ═══════════════════════════════════════════
  // Helper Functions
  // ═══════════════════════════════════════════

  describe('isPokeball', () => {
    it('returns true for pokeballs', () => {
      expect(isPokeball(ITEM_TYPES.POKEBALL)).toBe(true);
      expect(isPokeball(ITEM_TYPES.GREAT_BALL)).toBe(true);
      expect(isPokeball(ITEM_TYPES.ULTRA_BALL)).toBe(true);
    });

    it('returns false for other items', () => {
      expect(isPokeball(ITEM_TYPES.POTION)).toBe(false);
      expect(isPokeball(ITEM_TYPES.REVIVE)).toBe(false);
    });
  });

  describe('isHealingItem', () => {
    it('returns true for healing items', () => {
      expect(isHealingItem(ITEM_TYPES.POTION)).toBe(true);
      expect(isHealingItem(ITEM_TYPES.SUPER_POTION)).toBe(true);
    });

    it('returns true for Revive', () => {
      expect(isHealingItem(ITEM_TYPES.REVIVE)).toBe(true);
    });

    it('returns false for pokeballs', () => {
      expect(isHealingItem(ITEM_TYPES.POKEBALL)).toBe(false);
    });
  });

  // ═══════════════════════════════════════════
  // Starter Inventory
  // ═══════════════════════════════════════════

  describe('STARTER_INVENTORY', () => {
    it('has potions and pokeballs', () => {
      expect(STARTER_INVENTORY.potion).toBe(5);
      expect(STARTER_INVENTORY.pokeball).toBe(10);
    });
  });
});
