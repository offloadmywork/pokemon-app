import { describe, expect, it } from 'vitest';
import {
  ACHIEVEMENT_CATALOG,
  evaluateCollectionAchievements,
  getAchievement,
} from './achievements';

describe('Achievement milestone rules', () => {
  it('defines collection pride milestones with coin and shard rewards', () => {
    expect(ACHIEVEMENT_CATALOG.collect_10).toMatchObject({
      achievement_id: 'collect_10',
      category: 'collection',
      target: 10,
      reward: { coins: 75, shards: 0 },
    });
    expect(ACHIEVEMENT_CATALOG.collect_50).toMatchObject({
      achievement_id: 'collect_50',
      category: 'collection',
      target: 50,
      reward: { coins: 300, shards: 2 },
    });
  });

  it('unlocks reached collection milestones that have not already been claimed', () => {
    const unlocked = evaluateCollectionAchievements({
      caughtCount: 26,
      claimedAchievementIds: ['collect_10'],
    });

    expect(unlocked).toEqual([
      expect.objectContaining({
        achievement_id: 'collect_25',
        target: 25,
        progress: 26,
        reward: { coins: 150, shards: 1 },
      }),
    ]);
  });

  it('does not unlock future or already claimed milestones', () => {
    expect(evaluateCollectionAchievements({
      caughtCount: 9,
      claimedAchievementIds: [],
    })).toEqual([]);

    expect(evaluateCollectionAchievements({
      caughtCount: 50,
      claimedAchievementIds: ['collect_10', 'collect_25', 'collect_50'],
    })).toEqual([]);
  });

  it('returns null for unknown achievements', () => {
    expect(getAchievement('missing')).toBeNull();
  });
});
