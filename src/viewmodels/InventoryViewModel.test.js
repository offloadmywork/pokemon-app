import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InventoryViewModel } from './InventoryViewModel';
import { ITEM_TYPES } from '@/game/items';

// Mock API client
const mockApiClient = {
  getItems: vi.fn(),
  addItem: vi.fn(),
  useItem: vi.fn(),
  setItemQuantity: vi.fn(),
};

describe('InventoryViewModel', () => {
  let vm;

  beforeEach(() => {
    vi.clearAllMocks();
    vm = new InventoryViewModel(mockApiClient);
  });

  // ═══════════════════════════════════════════════════
  // Initial State
  // ═══════════════════════════════════════════════════

  describe('Initial State', () => {
    it('starts with empty items', () => {
      expect(vm.items).toEqual({});
      expect(vm.isLoading).toBe(true);
      expect(vm.error).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════
  // Loading Inventory
  // ═══════════════════════════════════════════════════

  describe('loadInventory', () => {
    it('loads items from API', async () => {
      mockApiClient.getItems.mockResolvedValue([
        { item_id: 'potion', quantity: 5 },
        { item_id: 'pokeball', quantity: 10 },
      ]);

      await vm.loadInventory();

      expect(vm.items).toEqual({ potion: 5, pokeball: 10 });
      expect(vm.isLoading).toBe(false);
    });

    it('gives starter items for empty inventory', async () => {
      mockApiClient.getItems.mockResolvedValue([]);
      mockApiClient.addItem.mockResolvedValue({ success: true });

      await vm.loadInventory();

      expect(mockApiClient.addItem).toHaveBeenCalledWith('potion', 5);
      expect(mockApiClient.addItem).toHaveBeenCalledWith('pokeball', 10);
    });

    it('handles API errors gracefully', async () => {
      mockApiClient.getItems.mockRejectedValue(new Error('Network error'));

      await vm.loadInventory();

      expect(vm.error).toBe('Network error');
      expect(vm.isLoading).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════
  // Item Queries
  // ═══════════════════════════════════════════════════

  describe('getItemQuantity', () => {
    beforeEach(() => {
      vm.items = { potion: 5, pokeball: 0 };
    });

    it('returns quantity for existing items', () => {
      expect(vm.getItemQuantity('potion')).toBe(5);
    });

    it('returns 0 for missing items', () => {
      expect(vm.getItemQuantity('revive')).toBe(0);
    });

    it('returns 0 for items with zero quantity', () => {
      expect(vm.getItemQuantity('pokeball')).toBe(0);
    });
  });

  describe('hasItem', () => {
    beforeEach(() => {
      vm.items = { potion: 5, pokeball: 0 };
    });

    it('returns true for items with quantity > 0', () => {
      expect(vm.hasItem('potion')).toBe(true);
    });

    it('returns false for missing items', () => {
      expect(vm.hasItem('revive')).toBe(false);
    });

    it('returns false for items with zero quantity', () => {
      expect(vm.hasItem('pokeball')).toBe(false);
    });
  });

  describe('getAllItems', () => {
    it('returns all items with their definitions', () => {
      vm.items = { potion: 5, pokeball: 10 };

      const items = vm.getAllItems();

      expect(items).toHaveLength(2);
      expect(items.find(i => i.item.id === 'potion')?.quantity).toBe(5);
      expect(items.find(i => i.item.id === 'pokeball')?.quantity).toBe(10);
    });

    it('excludes items with zero quantity', () => {
      vm.items = { potion: 5, pokeball: 0 };

      const items = vm.getAllItems();

      expect(items).toHaveLength(1);
      expect(items[0].item.id).toBe('potion');
    });

    it('excludes unknown items', () => {
      vm.items = { potion: 5, unknown_item: 10 };

      const items = vm.getAllItems();

      expect(items).toHaveLength(1);
      expect(items[0].item.id).toBe('potion');
    });
  });

  describe('getHealingItems', () => {
    it('returns only healing items', () => {
      vm.items = { potion: 5, super_potion: 2, pokeball: 10, revive: 1 };

      const items = vm.getHealingItems();

      expect(items).toHaveLength(3); // potion, super_potion, revive
      expect(items.every(i => i.item.healAmount > 0 || i.item.canRevive)).toBe(true);
    });
  });

  describe('getPokeballs', () => {
    it('returns only pokeballs', () => {
      vm.items = { potion: 5, pokeball: 10, great_ball: 3 };

      const items = vm.getPokeballs();

      expect(items).toHaveLength(2);
      expect(items.every(i => i.item.category === 'ball')).toBe(true);
    });
  });

  describe('hasUsableItems', () => {
    it('returns true when has healing items or pokeballs', () => {
      vm.items = { potion: 5 };
      expect(vm.hasUsableItems).toBe(true);
    });

    it('returns true when has pokeballs', () => {
      vm.items = { pokeball: 1 };
      expect(vm.hasUsableItems).toBe(true);
    });

    it('returns false when no usable items', () => {
      vm.items = {};
      expect(vm.hasUsableItems).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════
  // Using Items
  // ═══════════════════════════════════════════════════

  describe('useItem', () => {
    const pokemon = { name: 'Pikachu', currentHP: 30, maxHP: 100 };

    beforeEach(() => {
      vm.items = { potion: 5 };
      mockApiClient.useItem.mockResolvedValue({ success: true });
    });

    it('heals Pokemon with Potion', async () => {
      const result = await vm.useItem('potion', pokemon);

      expect(result.success).toBe(true);
      expect(result.pokemon.currentHP).toBe(80);
      expect(result.healAmount).toBe(50);
    });

    it('decrements item quantity', async () => {
      await vm.useItem('potion', pokemon);

      expect(vm.items.potion).toBe(4);
      expect(mockApiClient.useItem).toHaveBeenCalledWith('potion');
    });

    it('fails when item not found', async () => {
      const result = await vm.useItem('unknown_item', pokemon);

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    it('fails when no items available', async () => {
      vm.items = { potion: 0 };

      const result = await vm.useItem('potion', pokemon);

      expect(result.success).toBe(false);
      expect(result.message).toContain('No');
      expect(result.message).toContain('available');
    });

    it('fails when cannot use on Pokemon', async () => {
      const fullHP = { name: 'Pikachu', currentHP: 100, maxHP: 100 };

      const result = await vm.useItem('potion', fullHP);

      expect(result.success).toBe(false);
      expect(result.message).toContain('full HP');
    });

    it('uses Revive on fainted Pokemon', async () => {
      vm.items = { revive: 1 };
      const fainted = { name: 'Pikachu', currentHP: 0, maxHP: 100 };

      const result = await vm.useItem('revive', fainted);

      expect(result.success).toBe(true);
      expect(result.pokemon.currentHP).toBe(50);
    });

    it('cannot use Revive on non-fainted Pokemon', async () => {
      vm.items = { revive: 1 };

      const result = await vm.useItem('revive', pokemon);

      expect(result.success).toBe(false);
      expect(result.message).toContain('fainted');
    });
  });

  describe('usePokeball', () => {
    beforeEach(() => {
      vm.items = { pokeball: 10, great_ball: 5, ultra_ball: 2 };
      mockApiClient.useItem.mockResolvedValue({ success: true });
    });

    it('uses Pokeball and returns catch multiplier', async () => {
      const result = await vm.usePokeball('pokeball');

      expect(result.success).toBe(true);
      expect(result.catchMultiplier).toBe(1.0);
      expect(result.itemName).toBe('Pokeball');
    });

    it('uses Great Ball with 1.5x multiplier', async () => {
      const result = await vm.usePokeball('great_ball');

      expect(result.success).toBe(true);
      expect(result.catchMultiplier).toBe(1.5);
    });

    it('uses Ultra Ball with 2x multiplier', async () => {
      const result = await vm.usePokeball('ultra_ball');

      expect(result.success).toBe(true);
      expect(result.catchMultiplier).toBe(2.0);
    });

    it('decrements pokeball quantity', async () => {
      await vm.usePokeball('pokeball');

      expect(vm.items.pokeball).toBe(9);
    });

    it('fails when not a pokeball', async () => {
      vm.items = { potion: 5 };

      const result = await vm.usePokeball('potion');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Not a pokeball');
    });

    it('fails when no pokeballs available', async () => {
      vm.items = { pokeball: 0 };

      const result = await vm.usePokeball('pokeball');

      expect(result.success).toBe(false);
      expect(result.message).toContain('No');
    });
  });

  // ═══════════════════════════════════════════════════
  // Item Management
  // ═══════════════════════════════════════════════════

  describe('addItem', () => {
    it('adds items via API', async () => {
      mockApiClient.addItem.mockResolvedValue({ success: true });

      const result = await vm.addItem('potion', 3);

      expect(result.success).toBe(true);
      expect(vm.items.potion).toBe(3);
    });

    it('increments existing quantity', async () => {
      vm.items = { potion: 5 };
      mockApiClient.addItem.mockResolvedValue({ success: true });

      await vm.addItem('potion', 3);

      expect(vm.items.potion).toBe(8);
    });
  });

  describe('setItemQuantity', () => {
    it('sets item quantity via API', async () => {
      mockApiClient.setItemQuantity.mockResolvedValue({ success: true });

      const result = await vm.setItemQuantity('potion', 10);

      expect(result.success).toBe(true);
      expect(vm.items.potion).toBe(10);
    });
  });
});
