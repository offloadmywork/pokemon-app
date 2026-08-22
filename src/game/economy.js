import { getItemById } from './items.js';

export const SHOP_CATALOG = {
  pokeball: { item_id: 'pokeball', cost: 10, currency: 'coins' },
  great_ball: { item_id: 'great_ball', cost: 35, currency: 'coins' },
  ultra_ball: { item_id: 'ultra_ball', cost: 80, currency: 'coins' },
  potion: { item_id: 'potion', cost: 15, currency: 'coins' },
  super_potion: { item_id: 'super_potion', cost: 40, currency: 'coins' },
  revive: { item_id: 'revive', cost: 90, currency: 'coins' },
};

export const UPGRADE_CATALOG = {
  bag_slots: {
    upgrade_id: 'bag_slots',
    name: 'Bag Slots',
    description: 'Increase carried item capacity for longer routes.',
    base_cost: 120,
    cost_growth: 60,
    max_level: 5,
  },
  encounter_lure_slot: {
    upgrade_id: 'encounter_lure_slot',
    name: 'Lure Slot',
    description: 'Unlock space for longer-lasting encounter lures.',
    base_cost: 150,
    cost_growth: 75,
    max_level: 3,
  },
  daily_task_slot: {
    upgrade_id: 'daily_task_slot',
    name: 'Daily Task Slot',
    description: 'Prepare room for future bonus daily tasks.',
    base_cost: 180,
    cost_growth: 90,
    max_level: 3,
  },
};

const REWARD_RULES = {
  battle_win: (level) => ({ coins: 10 + (level * 2), shards: 0 }),
  daily_bonus: (level) => ({ coins: 20 + (level * 3), shards: 0 }),
  achievement: (level) => ({ coins: 50 + (level * 5), shards: level >= 10 ? 1 : 0 }),
};

function normalizeLevel(trainerLevel) {
  const parsed = Number(trainerLevel);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
}

function normalizeWallet(wallet = {}) {
  return {
    coins: Math.max(0, Number(wallet.coins) || 0),
    shards: Math.max(0, Number(wallet.shards) || 0),
  };
}

export function calculateEconomyReward(source, { trainerLevel = 1 } = {}) {
  const rule = REWARD_RULES[source];
  if (!rule) {
    return { coins: 0, shards: 0 };
  }

  return rule(normalizeLevel(trainerLevel));
}

export function getShopItem(itemId) {
  const listing = SHOP_CATALOG[itemId] || null;
  const item = getItemById(itemId);

  if (!listing || !item) {
    return null;
  }

  return {
    ...listing,
    item,
  };
}

export function previewShopPurchase({
  wallet = {},
  inventory = {},
  itemId,
  quantity = 1,
} = {}) {
  const listing = getShopItem(itemId);
  if (!listing) {
    return purchaseRejection('Unknown shop item.');
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    return purchaseRejection('Choose at least one item.');
  }

  const currentWallet = normalizeWallet(wallet);
  const totalCost = listing.cost * quantity;

  if (currentWallet.coins < totalCost) {
    return purchaseRejection('Not enough coins.');
  }

  return {
    ok: true,
    item_id: itemId,
    quantity,
    unit_cost: listing.cost,
    total_cost: totalCost,
    wallet: {
      ...currentWallet,
      coins: currentWallet.coins - totalCost,
    },
    inventory: {
      ...inventory,
      [itemId]: (Number(inventory[itemId]) || 0) + quantity,
    },
    reason: null,
  };
}

export function applyShopPurchase(args) {
  const preview = previewShopPurchase(args);
  if (!preview.ok) {
    throw new Error(preview.reason);
  }

  return {
    wallet: preview.wallet,
    inventory: preview.inventory,
  };
}

export function calculateUpgradeCost(upgradeId, currentLevel = 0) {
  const upgrade = UPGRADE_CATALOG[upgradeId];
  if (!upgrade) {
    return null;
  }

  const level = normalizeUpgradeLevel(currentLevel);
  return upgrade.base_cost + (upgrade.cost_growth * level);
}

export function previewUpgradePurchase({
  wallet = {},
  upgrades = {},
  upgradeId,
} = {}) {
  const upgrade = UPGRADE_CATALOG[upgradeId];
  if (!upgrade) {
    return upgradeRejection('Unknown upgrade.');
  }

  const currentLevel = normalizeUpgradeLevel(upgrades[upgradeId]);
  if (currentLevel >= upgrade.max_level) {
    return upgradeRejection('Upgrade already maxed.');
  }

  const currentWallet = normalizeWallet(wallet);
  const totalCost = calculateUpgradeCost(upgradeId, currentLevel);
  if (currentWallet.coins < totalCost) {
    return upgradeRejection('Not enough coins.');
  }

  return {
    ok: true,
    upgrade_id: upgradeId,
    current_level: currentLevel,
    next_level: currentLevel + 1,
    total_cost: totalCost,
    wallet: {
      ...currentWallet,
      coins: currentWallet.coins - totalCost,
    },
    upgrades: {
      ...upgrades,
      [upgradeId]: currentLevel + 1,
    },
    reason: null,
  };
}

export function applyUpgradePurchase(args) {
  const preview = previewUpgradePurchase(args);
  if (!preview.ok) {
    throw new Error(preview.reason);
  }

  return {
    wallet: preview.wallet,
    upgrades: preview.upgrades,
  };
}

function normalizeUpgradeLevel(level) {
  const parsed = Number(level);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

function purchaseRejection(reason) {
  return {
    ok: false,
    item_id: null,
    quantity: 0,
    unit_cost: 0,
    total_cost: 0,
    wallet: null,
    inventory: null,
    reason,
  };
}

function upgradeRejection(reason) {
  return {
    ok: false,
    upgrade_id: null,
    current_level: 0,
    next_level: 0,
    total_cost: 0,
    wallet: null,
    upgrades: null,
    reason,
  };
}
