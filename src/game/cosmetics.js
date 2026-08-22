export const COSMETIC_CATALOG = {
  trainer_card_bronze: {
    cosmetic_id: 'trainer_card_bronze',
    name: 'Bronze Trainer Card',
    slot: 'trainer_card',
    description: 'Adds a bronze frame to the trainer card.',
    cost: 120,
    currency: 'coins',
  },
  premier_ball_skin: {
    cosmetic_id: 'premier_ball_skin',
    name: 'Premier Ball Skin',
    slot: 'ball_skin',
    description: 'Uses a clean Premier Ball style for capture throws.',
    cost: 2,
    currency: 'shards',
  },
};

function normalizeWallet(wallet = {}) {
  return {
    coins: Math.max(0, Number(wallet.coins) || 0),
    shards: Math.max(0, Number(wallet.shards) || 0),
  };
}

function normalizeOwnedCosmetics(ownedCosmetics = []) {
  return Array.isArray(ownedCosmetics) ? [...ownedCosmetics] : [];
}

export function getCosmetic(cosmeticId) {
  return COSMETIC_CATALOG[cosmeticId] || null;
}

export function previewCosmeticPurchase({
  wallet = {},
  ownedCosmetics = [],
  cosmeticId,
} = {}) {
  const cosmetic = getCosmetic(cosmeticId);
  if (!cosmetic) {
    return cosmeticRejection('Unknown cosmetic.');
  }

  const owned = normalizeOwnedCosmetics(ownedCosmetics);
  if (owned.includes(cosmeticId)) {
    return cosmeticRejection('Cosmetic already owned.');
  }

  const currentWallet = normalizeWallet(wallet);
  if (currentWallet[cosmetic.currency] < cosmetic.cost) {
    return cosmeticRejection(`Not enough ${cosmetic.currency}.`);
  }

  return {
    ok: true,
    cosmetic_id: cosmeticId,
    slot: cosmetic.slot,
    currency: cosmetic.currency,
    total_cost: cosmetic.cost,
    wallet: {
      ...currentWallet,
      [cosmetic.currency]: currentWallet[cosmetic.currency] - cosmetic.cost,
    },
    ownedCosmetics: [...owned, cosmeticId],
    reason: null,
  };
}

export function applyCosmeticPurchase(args) {
  const preview = previewCosmeticPurchase(args);
  if (!preview.ok) {
    throw new Error(preview.reason);
  }

  return {
    wallet: preview.wallet,
    ownedCosmetics: preview.ownedCosmetics,
  };
}

function cosmeticRejection(reason) {
  return {
    ok: false,
    cosmetic_id: null,
    slot: null,
    currency: null,
    total_cost: 0,
    wallet: null,
    ownedCosmetics: null,
    reason,
  };
}
