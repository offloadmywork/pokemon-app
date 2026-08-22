import { describe, it, expect } from 'vitest';
import {
  COLLECTION_MASTERY_TIERS,
  getCollectionMasteryTier,
  evaluateUnclaimedMasteryRewards,
} from './collectionMastery.js';

// Scenario: Trainers climb visual mastery tiers as their Pokédex grows
//   Given a number of uniquely caught Pokémon
//   When the mastery tier is resolved
//   Then it names the highest reached tier and shows progress to the next
describe('getCollectionMasteryTier', () => {
  it('starts new trainers at the Bronze tier floor with progress to Silver', () => {
    const result = getCollectionMasteryTier(0);
    expect(result.current.id).toBe('bronze');
    expect(result.progressToNext).toEqual({ target: 10, value: 0 });
    expect(result.next.id).toBe('silver');
  });

  it('advances trainers through silver, gold, and master tiers', () => {
    expect(getCollectionMasteryTier(10).current.id).toBe('silver');
    expect(getCollectionMasteryTier(25).current.id).toBe('gold');
    expect(getCollectionMasteryTier(50).current.id).toBe('master');
  });

  it('reports maxed state once the final tier is reached', () => {
    const result = getCollectionMasteryTier(60);
    expect(result.current.id).toBe('master');
    expect(result.next).toBeNull();
    expect(result.progressToNext).toBeNull();
  });

  it('normalizes invalid counts to zero without throwing', () => {
    expect(getCollectionMasteryTier(-5).progressToNext.value).toBe(0);
    expect(getCollectionMasteryTier(Number.NaN).current.id).toBe('bronze');
  });
});

// Scenario: Reached tiers pay one-time currency rewards
//   Given tiers already claimed by the trainer
//   When unclaimed mastery rewards are evaluated
//   Then only newly reached tiers are returned with their rewards
describe('evaluateUnclaimedMasteryRewards', () => {
  it('returns no rewards when nothing new is reached', () => {
    const result = evaluateUnclaimedMasteryRewards({ caughtCount: 3, claimedTierIds: [] });
    expect(result).toEqual([]);
  });

  it('returns only tiers that are reached and not yet claimed', () => {
    const result = evaluateUnclaimedMasteryRewards({ caughtCount: 26, claimedTierIds: ['bronze'] });
    expect(result.map((tier) => tier.id)).toEqual(['silver', 'gold']);
  });

  it('never returns an already claimed tier again', () => {
    const first = evaluateUnclaimedMasteryRewards({ caughtCount: 30, claimedTierIds: [] });
    const claimedIds = first.map((tier) => tier.id);
    const second = evaluateUnclaimedMasteryRewards({ caughtCount: 30, claimedTierIds: claimedIds });
    expect(second).toEqual([]);
  });

  it('attaches coin/shard rewards without any combat power advantage', () => {
    const [reward] = evaluateUnclaimedMasteryRewards({ caughtCount: 12, claimedTierIds: [] });
    expect(reward.reward.coins).toBeGreaterThan(0);
    expect(reward.reward.attack_bonus).toBeUndefined();
    expect(reward.reward.power_boost).toBeUndefined();
  });

  it('does not mutate the catalog or inputs', () => {
    const snapshot = JSON.stringify(COLLECTION_MASTERY_TIERS);
    evaluateUnclaimedMasteryRewards({ caughtCount: 55, claimedTierIds: [] });
    expect(JSON.stringify(COLLECTION_MASTERY_TIERS)).toBe(snapshot);
  });
});
