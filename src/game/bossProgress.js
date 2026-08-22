export const BOSS_CLEAR_STORAGE_KEY = 'pokemon-boss-clears';

export function getBossClearKey(boss) {
  return (boss?.name || 'unknown-boss')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function loadBossClears() {
  try {
    const saved = JSON.parse(localStorage.getItem(BOSS_CLEAR_STORAGE_KEY));
    return saved && typeof saved === 'object' ? saved : {};
  } catch {
    return {};
  }
}

export function recordBossClear(boss, clearedAt = new Date().toISOString()) {
  const key = getBossClearKey(boss);
  const clear = {
    name: boss.name,
    reward_xp: boss.rewardXP || boss.reward_xp || 0,
    cleared_at: clearedAt,
  };
  const clears = {
    ...loadBossClears(),
    [key]: clear,
  };
  localStorage.setItem(BOSS_CLEAR_STORAGE_KEY, JSON.stringify(clears));
  return clear;
}
