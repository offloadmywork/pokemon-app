// Collection Mastery Tiers (Phase 4: Live Ops and Retention).
// Pure domain rules — persistence and API wiring live in the Worker layer.
// Fairness guardrail: tier rewards are currency-only, never combat power.

export const COLLECTION_MASTERY_TIERS = [
  {
    id: 'bronze',
    title: 'Bronze Collector',
    description: 'Every trainer starts here. Catch unique Pokémon to rank up.',
    target: 0,
    reward: null,
    claimable: false,
  },
  {
    id: 'silver',
    title: 'Silver Curator',
    description: 'Catch 10 unique Pokémon.',
    target: 10,
    reward: { coins: 100, shards: 1 },
    claimable: true,
  },
  {
    id: 'gold',
    title: 'Gold Archivist',
    description: 'Catch 25 unique Pokémon.',
    target: 25,
    reward: { coins: 250, shards: 2 },
    claimable: true,
  },
  {
    id: 'master',
    title: 'Master Pokédex',
    description: 'Catch all 50 seeded Pokémon.',
    target: 50,
    reward: { coins: 500, shards: 3 },
    claimable: true,
  },
];

function normalizeCount(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
}

export function getCollectionMasteryTier(caughtCount = 0) {
  const progress = normalizeCount(caughtCount);

  let currentIndex = 0;
  COLLECTION_MASTERY_TIERS.forEach((tier, index) => {
    if (progress >= tier.target) currentIndex = index;
  });

  const current = COLLECTION_MASTERY_TIERS[currentIndex];
  const next = COLLECTION_MASTERY_TIERS[currentIndex + 1] || null;

  return {
    current,
    next,
    progressToNext: next ? { value: progress, target: next.target } : null,
    caughtCount: progress,
  };
}

export function evaluateUnclaimedMasteryRewards({
  caughtCount = 0,
  claimedTierIds = [],
} = {}) {
  const progress = normalizeCount(caughtCount);
  const claimed = new Set(Array.isArray(claimedTierIds) ? claimedTierIds : []);

  return COLLECTION_MASTERY_TIERS
    .filter((tier) => tier.claimable)
    .filter((tier) => progress >= tier.target)
    .filter((tier) => !claimed.has(tier.id))
    .map((tier) => ({
      ...tier,
      reward: { ...tier.reward },
      progress,
    }));
}
