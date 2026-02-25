// ═══════════════════════════════════════════
// ITEMS SYSTEM — Item definitions and effects
// ═══════════════════════════════════════════

/**
 * Item types and their properties
 */
export const ITEM_TYPES = {
  // Healing items
  POTION: {
    id: 'potion',
    name: 'Potion',
    description: 'Restores 50 HP',
    healAmount: 50,
    catchMultiplier: 1.0,
    canRevive: false,
    category: 'healing',
    emoji: '🧪',
  },
  SUPER_POTION: {
    id: 'super_potion',
    name: 'Super Potion',
    description: 'Restores 100 HP',
    healAmount: 100,
    catchMultiplier: 1.0,
    canRevive: false,
    category: 'healing',
    emoji: '💊',
  },
  REVIVE: {
    id: 'revive',
    name: 'Revive',
    description: 'Revives fainted Pokemon to 50% HP',
    healAmount: 0, // Revive has special logic
    catchMultiplier: 1.0,
    canRevive: true,
    category: 'revival',
    emoji: '✨',
  },

  // Pokeballs
  POKEBALL: {
    id: 'pokeball',
    name: 'Pokeball',
    description: 'Standard catch rate',
    healAmount: 0,
    catchMultiplier: 1.0,
    canRevive: false,
    category: 'ball',
    emoji: '🔴',
  },
  GREAT_BALL: {
    id: 'great_ball',
    name: 'Great Ball',
    description: '1.5x catch rate',
    healAmount: 0,
    catchMultiplier: 1.5,
    canRevive: false,
    category: 'ball',
    emoji: '🔵',
  },
  ULTRA_BALL: {
    id: 'ultra_ball',
    name: 'Ultra Ball',
    description: '2x catch rate',
    healAmount: 0,
    catchMultiplier: 2.0,
    canRevive: false,
    category: 'ball',
    emoji: '🟡',
  },
};

/**
 * Get item definition by ID
 */
export function getItemById(itemId) {
  return Object.values(ITEM_TYPES).find(item => item.id === itemId) || null;
}

/**
 * Get all items of a specific category
 */
export function getItemsByCategory(category) {
  return Object.values(ITEM_TYPES).filter(item => item.category === category);
}

/**
 * Get all healing items
 */
export function getHealingItems() {
  return getItemsByCategory('healing');
}

/**
 * Get all pokeballs
 */
export function getPokeballs() {
  return getItemsByCategory('ball');
}

/**
 * Calculate healing amount for a Pokemon
 * Returns the actual HP restored (capped at maxHP)
 */
export function calculateHealAmount(item, pokemon) {
  if (item.canRevive && pokemon.currentHP === 0) {
    // Revive: 50% of max HP
    return Math.floor(pokemon.maxHP * 0.5);
  }

  if (item.healAmount > 0) {
    // Regular healing item
    const missingHP = pokemon.maxHP - pokemon.currentHP;
    return Math.min(item.healAmount, missingHP);
  }

  return 0;
}

/**
 * Check if an item can be used on a Pokemon
 */
export function canUseItemOnPokemon(item, pokemon) {
  // Revive can only be used on fainted Pokemon
  if (item.canRevive) {
    return pokemon.currentHP === 0;
  }

  // Healing items can only be used on non-fainted, damaged Pokemon
  if (item.healAmount > 0) {
    return pokemon.currentHP > 0 && pokemon.currentHP < pokemon.maxHP;
  }

  // Pokeballs are used during battle, not on Pokemon directly
  if (item.category === 'ball') {
    return false;
  }

  return false;
}

/**
 * Get error message for why an item can't be used
 */
export function getUsageError(item, pokemon) {
  if (item.canRevive && pokemon.currentHP > 0) {
    return 'Can only use Revive on fainted Pokemon';
  }

  if (item.healAmount > 0 && pokemon.currentHP === 0) {
    return 'Cannot heal a fainted Pokemon';
  }

  if (item.healAmount > 0 && pokemon.currentHP >= pokemon.maxHP) {
    return 'Pokemon is already at full HP';
  }

  return 'Cannot use this item here';
}

/**
 * Apply item effect to a Pokemon
 * Returns the updated Pokemon object
 */
export function applyItemEffect(item, pokemon) {
  if (!canUseItemOnPokemon(item, pokemon)) {
    throw new Error(getUsageError(item, pokemon));
  }

  const healAmount = calculateHealAmount(item, pokemon);

  return {
    ...pokemon,
    currentHP: Math.min(pokemon.currentHP + healAmount, pokemon.maxHP),
  };
}

/**
 * Default starter inventory for new players
 */
export const STARTER_INVENTORY = {
  potion: 5,
  pokeball: 10,
};

/**
 * Check if an item is a pokeball
 */
export function isPokeball(item) {
  return item?.category === 'ball';
}

/**
 * Check if an item is a healing item
 */
export function isHealingItem(item) {
  return item?.category === 'healing' || item?.canRevive;
}
