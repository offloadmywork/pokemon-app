// BattleViewModel - Business logic for Battle state and item usage
// Testable without browser - pure state management

import {
  getItemById,
  applyItemEffect,
  canUseItemOnPokemon,
  getUsageError,
} from '@/game/items';
import { getMaxHP } from '@/game/battle';
import { incrementDailyQuestsForEvent } from '@/game/dailyQuestProgress';

export class BattleViewModel {
  constructor(apiClient, team, wildPokemon) {
    this.api = apiClient;

    // Battle state
    this.team = team.map(p => ({
      ...p,
      maxHP: p.maxHP || getMaxHP(p),
      currentHP: p.currentHP ?? (p.maxHP || getMaxHP(p)),
    }));
    this.wildPokemon = wildPokemon;
    this.wildHP = getMaxHP(wildPokemon);
    this.wildMaxHP = getMaxHP(wildPokemon);
    this.activeIndex = this._findFirstAlive();

    // Inventory state
    this.items = {}; // { itemId: quantity }
    this.isLoading = false;
    this.error = null;
  }

  // ═══════════════════════════════════════════════════
  // Initialization
  // ═══════════════════════════════════════════════════

  _findFirstAlive() {
    const idx = this.team.findIndex(p => p.currentHP > 0);
    return idx >= 0 ? idx : 0;
  }

  async loadInventory() {
    this.isLoading = true;
    this.error = null;

    try {
      const items = await this.api.getItems();
      this.items = items.reduce((acc, item) => {
        acc[item.item_id] = item.quantity;
        return acc;
      }, {});
    } catch (err) {
      this.error = err.message;
      console.error('Failed to load inventory:', err);
    } finally {
      this.isLoading = false;
    }
  }

  // ═══════════════════════════════════════════════════
  // Active Pokemon
  // ═══════════════════════════════════════════════════

  get activePokemon() {
    return this.team[this.activeIndex];
  }

  switchPokemon(index) {
    if (index === this.activeIndex) {
      return { success: false, message: 'Already active' };
    }

    if (this.team[index].currentHP <= 0) {
      return { success: false, message: 'Cannot switch to fainted Pokemon' };
    }

    this.activeIndex = index;
    return { success: true, pokemon: this.team[index] };
  }

  // ═══════════════════════════════════════════════════
  // HP Updates
  // ═══════════════════════════════════════════════════

  updateWildHP(newHP) {
    this.wildHP = Math.max(0, newHP);
  }

  updateTeamPokemonHP(index, newHP) {
    if (this.team[index]) {
      this.team[index].currentHP = Math.max(0, newHP);
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
    return this.getAllItems().filter(
      ({ item }) => item.healAmount > 0 || item.canRevive
    );
  }

  getPokeballs() {
    return this.getAllItems().filter(({ item }) => item.category === 'ball');
  }

  getUsableItems() {
    return this.getHealingItems();
  }

  getUsableItemsForActive() {
    const active = this.activePokemon;
    if (!active) return [];

    return this.getHealingItems().filter(({ item }) =>
      canUseItemOnPokemon(item, active)
    );
  }

  // ═══════════════════════════════════════════════════
  // Item Usage
  // ═══════════════════════════════════════════════════

  async useItemOnActive(itemId) {
    const item = getItemById(itemId);
    if (!item) {
      return { success: false, message: 'Item not found' };
    }

    if (!this.hasItem(itemId)) {
      return { success: false, message: `No ${item.name}s available` };
    }

    const active = this.activePokemon;
    if (!canUseItemOnPokemon(item, active)) {
      return { success: false, message: getUsageError(item, active) };
    }

    try {
      const previousHP = active.currentHP;
      const updatedPokemon = applyItemEffect(item, active);

      // Update team state
      this.team[this.activeIndex] = {
        ...active,
        currentHP: updatedPokemon.currentHP,
      };

      // Decrement via API
      await this.api.useItem(itemId);
      this.items[itemId] = Math.max(0, (this.items[itemId] || 0) - 1);

      // Best-effort: count towards daily quests
      incrementDailyQuestsForEvent(this.api, 'useItem', 1);

      const healAmount = updatedPokemon.currentHP - previousHP;

      return {
        success: true,
        pokemon: this.team[this.activeIndex],
        healAmount,
        message: this._getUseMessage(item, this.team[this.activeIndex], healAmount),
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
  // Private Helpers
  // ═══════════════════════════════════════════════════

  _getUseMessage(item, pokemon, healAmount) {
    if (item.canRevive) {
      return `${pokemon.name} was revived with ${healAmount} HP!`;
    }
    return `Used ${item.name}! ${pokemon.name} recovered ${healAmount} HP.`;
  }
}

// Factory function
export function createBattleViewModel(apiClient, team, wildPokemon) {
  return new BattleViewModel(apiClient, team, wildPokemon);
}
