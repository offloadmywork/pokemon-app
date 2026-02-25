// InventoryViewModel - Business logic for Items/Inventory
// Testable without browser - pure state management

import { getItemById, applyItemEffect, canUseItemOnPokemon, getUsageError, STARTER_INVENTORY } from '@/game/items';

export class InventoryViewModel {
  constructor(apiClient) {
    this.api = apiClient;

    // State
    this.items = {}; // { itemId: quantity }
    this.isLoading = true;
    this.error = null;
  }

  // ═══════════════════════════════════════════════════
  // Inventory Loading
  // ═══════════════════════════════════════════════════

  async loadInventory() {
    this.isLoading = true;
    this.error = null;

    try {
      const items = await this.api.getItems();
      // Convert array to map: { itemId: quantity }
      this.items = items.reduce((acc, item) => {
        acc[item.item_id] = item.quantity;
        return acc;
      }, {});

      // Give starter items if inventory is empty
      if (Object.keys(this.items).length === 0) {
        await this.giveStarterItems();
      }
    } catch (err) {
      this.error = err.message;
      console.error('Failed to load inventory:', err);
    } finally {
      this.isLoading = false;
    }
  }

  async giveStarterItems() {
    for (const [itemId, quantity] of Object.entries(STARTER_INVENTORY)) {
      try {
        await this.api.addItem(itemId, quantity);
        this.items[itemId] = quantity;
      } catch (err) {
        console.error(`Failed to add starter item ${itemId}:`, err);
      }
    }
  }

  // ═══════════════════════════════════════════════════
  // Item Queries
  // ═══════════════════════════════════════════════════

  getItemQuantity(itemId) {
    return this.items[itemId] || 0;
  }

  hasItem(itemId) {
    return this.getItemQuantity(itemId) > 0;
  }

  getAllItems() {
    return Object.entries(this.items)
      .filter(([_, quantity]) => quantity > 0)
      .map(([itemId, quantity]) => ({
        item: getItemById(itemId),
        quantity,
      }))
      .filter(({ item }) => item !== null);
  }

  getHealingItems() {
    return this.getAllItems().filter(({ item }) => item.healAmount > 0 || item.canRevive);
  }

  getPokeballs() {
    return this.getAllItems().filter(({ item }) => item.category === 'ball');
  }

  get hasUsableItems() {
    return this.getHealingItems().length > 0 || this.getPokeballs().length > 0;
  }

  // ═══════════════════════════════════════════════════
  // Item Usage
  // ═══════════════════════════════════════════════════

  async useItem(itemId, pokemon) {
    const item = getItemById(itemId);
    if (!item) {
      return { success: false, message: 'Item not found' };
    }

    // Check quantity
    if (!this.hasItem(itemId)) {
      return { success: false, message: `No ${item.name}s available` };
    }

    // Check if can use on Pokemon
    if (!canUseItemOnPokemon(item, pokemon)) {
      return { success: false, message: getUsageError(item, pokemon) };
    }

    try {
      // Apply effect
      const updatedPokemon = applyItemEffect(item, pokemon);

      // Decrement quantity via API
      await this.api.useItem(itemId);

      // Update local state
      this.items[itemId] = Math.max(0, (this.items[itemId] || 0) - 1);

      return {
        success: true,
        pokemon: updatedPokemon,
        healAmount: updatedPokemon.currentHP - pokemon.currentHP,
        message: this._getUseMessage(item, updatedPokemon),
      };
    } catch (err) {
      console.error('Failed to use item:', err);
      return { success: false, message: 'Failed to use item' };
    }
  }

  async usePokeball(itemId) {
    const item = getItemById(itemId);
    if (!item || item.category !== 'ball') {
      return { success: false, message: 'Not a pokeball' };
    }

    if (!this.hasItem(itemId)) {
      return { success: false, message: `No ${item.name}s available` };
    }

    try {
      await this.api.useItem(itemId);
      this.items[itemId] = Math.max(0, (this.items[itemId] || 0) - 1);

      return {
        success: true,
        catchMultiplier: item.catchMultiplier,
        itemName: item.name,
      };
    } catch (err) {
      console.error('Failed to use pokeball:', err);
      return { success: false, message: 'Failed to use pokeball' };
    }
  }

  // ═══════════════════════════════════════════════════
  // Item Management (Admin/Debug)
  // ═══════════════════════════════════════════════════

  async addItem(itemId, quantity = 1) {
    try {
      await this.api.addItem(itemId, quantity);
      this.items[itemId] = (this.items[itemId] || 0) + quantity;
      return { success: true };
    } catch (err) {
      console.error('Failed to add item:', err);
      return { success: false, message: 'Failed to add item' };
    }
  }

  async setItemQuantity(itemId, quantity) {
    try {
      await this.api.setItemQuantity(itemId, quantity);
      this.items[itemId] = quantity;
      return { success: true };
    } catch (err) {
      console.error('Failed to set item quantity:', err);
      return { success: false, message: 'Failed to set item quantity' };
    }
  }

  // ═══════════════════════════════════════════════════
  // Private Helpers
  // ═══════════════════════════════════════════════════

  _getUseMessage(item, pokemon) {
    if (item.canRevive) {
      return `${pokemon.name || 'Pokemon'} was revived!`;
    }
    return `Used ${item.name} on ${pokemon.name || 'Pokemon'}!`;
  }
}

// Factory function
export function createInventoryViewModel(apiClient) {
  return new InventoryViewModel(apiClient);
}
