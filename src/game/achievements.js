export const ACHIEVEMENT_CATALOG = {
  collect_10: {
    achievement_id: 'collect_10',
    title: 'First Box Filled',
    description: 'Catch 10 unique Pokemon.',
    category: 'collection',
    target: 10,
    reward: { coins: 75, shards: 0 },
  },
  collect_25: {
    achievement_id: 'collect_25',
    title: 'Growing Pokedex',
    description: 'Catch 25 unique Pokemon.',
    category: 'collection',
    target: 25,
    reward: { coins: 150, shards: 1 },
  },
  collect_50: {
    achievement_id: 'collect_50',
    title: 'Regional Researcher',
    description: 'Catch 50 unique Pokemon.',
    category: 'collection',
    target: 50,
    reward: { coins: 300, shards: 2 },
  },
};

export function getAchievement(achievementId) {
  return ACHIEVEMENT_CATALOG[achievementId] || null;
}

export function evaluateCollectionAchievements({
  caughtCount = 0,
  claimedAchievementIds = [],
} = {}) {
  const progress = normalizeCount(caughtCount);
  const claimed = new Set(Array.isArray(claimedAchievementIds) ? claimedAchievementIds : []);

  return Object.values(ACHIEVEMENT_CATALOG)
    .filter((achievement) => achievement.category === 'collection')
    .filter((achievement) => progress >= achievement.target)
    .filter((achievement) => !claimed.has(achievement.achievement_id))
    .map((achievement) => ({
      ...achievement,
      progress,
      reward: { ...achievement.reward },
    }));
}

function normalizeCount(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}
