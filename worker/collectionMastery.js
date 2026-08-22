import {
  COLLECTION_MASTERY_TIERS,
  getCollectionMasteryTier,
  evaluateUnclaimedMasteryRewards,
} from '../src/game/collectionMastery.js';

export const MASTERY_ACHIEVEMENT_PREFIX = 'mastery_';

export async function getDistinctCaughtCount(db, userId) {
  const { results } = await db.prepare(
    'SELECT COUNT(DISTINCT pokemon_id) AS caught_count FROM caught_pokemon WHERE user_id = ?'
  ).bind(userId).all();

  const parsed = Number(results?.[0]?.caught_count);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

export async function listClaimedMasteryTiers(db, userId) {
  const { results } = await db.prepare(
    'SELECT achievement_id FROM user_achievements WHERE user_id = ?'
  ).bind(userId).all();

  return (results || [])
    .map((row) => String(row.achievement_id || ''))
    .filter((achievementId) => achievementId.startsWith(MASTERY_ACHIEVEMENT_PREFIX))
    .map((achievementId) => achievementId.slice(MASTERY_ACHIEVEMENT_PREFIX.length));
}

export async function getMasteryStatus(db, userId) {
  const caughtCount = await getDistinctCaughtCount(db, userId);
  const claimedTierIds = await listClaimedMasteryTiers(db, userId);
  const claimed = new Set(claimedTierIds);
  const unclaimedRewards = evaluateUnclaimedMasteryRewards({
    caughtCount,
    claimedTierIds,
  });
  const unclaimedIds = new Set(unclaimedRewards.map((tier) => tier.id));
  const { current } = getCollectionMasteryTier(caughtCount);

  return {
    user_id: userId,
    caught_count: caughtCount,
    current_tier: current,
    tiers: COLLECTION_MASTERY_TIERS.map((tier) => ({
      ...tier,
      claimed: claimed.has(tier.id) || (tier.id === 'bronze' && caughtCount >= 0),
      claimable: unclaimedIds.has(tier.id),
    })),
    unclaimed_rewards: unclaimedRewards,
  };
}

export async function claimMasteryTier(db, userId, tierId, addWalletReward) {
  const tier = COLLECTION_MASTERY_TIERS.find((candidate) => candidate.id === tierId);
  if (!tier || !tier.claimable) {
    return { error: 'Unknown mastery tier.' };
  }

  const caughtCount = await getDistinctCaughtCount(db, userId);
  const claimedTierIds = await listClaimedMasteryTiers(db, userId);
  const claimable = evaluateUnclaimedMasteryRewards({ caughtCount, claimedTierIds })
    .some((candidate) => candidate.id === tierId);

  if (!claimable) {
    return { error: caughtCount < tier.target
      ? 'Mastery tier is not reached yet.'
      : 'Mastery tier already claimed.' };
  }

  const wallet = tier.reward ? await addWalletReward(tier.reward) : null;

  await db.prepare(
    `INSERT INTO user_achievements (user_id, achievement_id, claimed_at)
     VALUES (?, ?, datetime('now'))`
  ).bind(userId, `${MASTERY_ACHIEVEMENT_PREFIX}${tierId}`).run();

  return {
    tier: { ...tier, claimed: true, claimable: false },
    wallet,
    caught_count: caughtCount,
  };
}
