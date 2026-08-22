import { describe, expect, it } from 'vitest';
import {
  calculateEconomyReward,
  previewShopPurchase,
  applyShopPurchase,
  SHOP_CATALOG,
  UPGRADE_CATALOG,
  calculateUpgradeCost,
  previewUpgradePurchase,
  applyUpgradePurchase,
} from './economy';

describe('Economy rules', () => {
  describe('reward sources', () => {
    it('scales battle, daily, and achievement rewards by trainer level', () => {
      expect(calculateEconomyReward('battle_win', { trainerLevel: 4 })).toEqual({
        coins: 18,
        shards: 0,
      });
      expect(calculateEconomyReward('daily_bonus', { trainerLevel: 4 })).toEqual({
        coins: 32,
        shards: 0,
      });
      expect(calculateEconomyReward('achievement', { trainerLevel: 12 })).toEqual({
        coins: 110,
        shards: 1,
      });
    });

    it('returns an empty reward for unknown sources', () => {
      expect(calculateEconomyReward('mystery', { trainerLevel: 99 })).toEqual({
        coins: 0,
        shards: 0,
      });
    });
  });

  describe('shop sinks', () => {
    it('defines coin prices for core consumables', () => {
      expect(SHOP_CATALOG.pokeball.cost).toBe(10);
      expect(SHOP_CATALOG.great_ball.cost).toBe(35);
      expect(SHOP_CATALOG.ultra_ball.cost).toBe(80);
      expect(SHOP_CATALOG.potion.cost).toBe(15);
      expect(SHOP_CATALOG.revive.cost).toBe(90);
    });

    it('previews affordable purchases without mutating wallet or inventory', () => {
      const wallet = { coins: 100, shards: 2 };
      const inventory = { pokeball: 1 };

      const preview = previewShopPurchase({
        wallet,
        inventory,
        itemId: 'great_ball',
        quantity: 2,
      });

      expect(preview).toEqual({
        ok: true,
        item_id: 'great_ball',
        quantity: 2,
        unit_cost: 35,
        total_cost: 70,
        wallet: { coins: 30, shards: 2 },
        inventory: { pokeball: 1, great_ball: 2 },
        reason: null,
      });
      expect(wallet).toEqual({ coins: 100, shards: 2 });
      expect(inventory).toEqual({ pokeball: 1 });
    });

    it('rejects unknown, invalid, and unaffordable purchases', () => {
      expect(previewShopPurchase({ wallet: { coins: 100 }, itemId: 'missing', quantity: 1 })).toMatchObject({
        ok: false,
        reason: 'Unknown shop item.',
      });
      expect(previewShopPurchase({ wallet: { coins: 100 }, itemId: 'pokeball', quantity: 0 })).toMatchObject({
        ok: false,
        reason: 'Choose at least one item.',
      });
      expect(previewShopPurchase({ wallet: { coins: 20 }, itemId: 'ultra_ball', quantity: 1 })).toMatchObject({
        ok: false,
        reason: 'Not enough coins.',
      });
    });

    it('applies affordable purchases to wallet and inventory', () => {
      const result = applyShopPurchase({
        wallet: { coins: 45, shards: 0 },
        inventory: { potion: 1 },
        itemId: 'potion',
        quantity: 2,
      });

      expect(result.wallet).toEqual({ coins: 15, shards: 0 });
      expect(result.inventory).toEqual({ potion: 3 });
    });
  });

  describe('upgrade sinks', () => {
    it('defines escalating coin costs for permanent trainer upgrades', () => {
      expect(UPGRADE_CATALOG.bag_slots).toMatchObject({
        upgrade_id: 'bag_slots',
        base_cost: 120,
        cost_growth: 60,
        max_level: 5,
      });
      expect(calculateUpgradeCost('bag_slots', 0)).toBe(120);
      expect(calculateUpgradeCost('bag_slots', 2)).toBe(240);
      expect(calculateUpgradeCost('daily_task_slot', 2)).toBe(360);
    });

    it('previews affordable upgrades without mutating wallet or upgrade state', () => {
      const wallet = { coins: 300, shards: 1 };
      const upgrades = { bag_slots: 1 };

      const preview = previewUpgradePurchase({
        wallet,
        upgrades,
        upgradeId: 'bag_slots',
      });

      expect(preview).toEqual({
        ok: true,
        upgrade_id: 'bag_slots',
        current_level: 1,
        next_level: 2,
        total_cost: 180,
        wallet: { coins: 120, shards: 1 },
        upgrades: { bag_slots: 2 },
        reason: null,
      });
      expect(wallet).toEqual({ coins: 300, shards: 1 });
      expect(upgrades).toEqual({ bag_slots: 1 });
    });

    it('rejects unknown, maxed, and unaffordable upgrades', () => {
      expect(previewUpgradePurchase({ wallet: { coins: 500 }, upgradeId: 'missing' })).toMatchObject({
        ok: false,
        reason: 'Unknown upgrade.',
      });
      expect(previewUpgradePurchase({
        wallet: { coins: 1000 },
        upgrades: { bag_slots: 5 },
        upgradeId: 'bag_slots',
      })).toMatchObject({
        ok: false,
        reason: 'Upgrade already maxed.',
      });
      expect(previewUpgradePurchase({
        wallet: { coins: 100 },
        upgrades: { daily_task_slot: 0 },
        upgradeId: 'daily_task_slot',
      })).toMatchObject({
        ok: false,
        reason: 'Not enough coins.',
      });
    });

    it('applies affordable upgrades to wallet and upgrade levels', () => {
      const result = applyUpgradePurchase({
        wallet: { coins: 250, shards: 0 },
        upgrades: { encounter_lure_slot: 0 },
        upgradeId: 'encounter_lure_slot',
      });

      expect(result.wallet).toEqual({ coins: 100, shards: 0 });
      expect(result.upgrades).toEqual({ encounter_lure_slot: 1 });
    });
  });
});
