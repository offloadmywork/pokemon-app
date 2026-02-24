// ═══════════════════════════════════════════
// PLAYER PROGRESS — API persistence (cross-device)
// ═══════════════════════════════════════════

import { getLevelFromXP, STORAGE_KEY } from './constants';

// API client will be injected
let apiClient = null;

/**
 * Set the API client for progress operations
 */
export function setProgressApiClient(client) {
  apiClient = client;
}

/**
 * Load progress from API (async)
 * Falls back to localStorage if API fails
 */
export async function loadProgressAsync() {
  try {
    if (apiClient) {
      const progress = await apiClient.getProgress();
      // Cache to localStorage for offline fallback
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
      return progress;
    }
  } catch (err) {
    console.error('Failed to load progress from API:', err);
  }
  // Fallback to cache
  return loadProgressFromCache();
}

/**
 * Load progress from localStorage cache (sync, for backwards compatibility)
 */
export function loadProgress() {
  return loadProgressFromCache();
}

function loadProgressFromCache() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && typeof saved.xp === 'number') {
      return { xp: saved.xp, level: saved.level || getLevelFromXP(saved.xp) };
    }
  } catch {}
  return { xp: 0, level: 1 };
}

/**
 * Save progress to API (async)
 * Also updates localStorage cache
 */
export async function saveProgressAsync(xp, level) {
  const progress = { xp, level };
  try {
    if (apiClient) {
      const result = await apiClient.setProgress(xp, level);
      // Update cache
      localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
      return result;
    }
  } catch (err) {
    console.error('Failed to save progress to API:', err);
  }
  // Fallback: just update cache
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  return progress;
}

/**
 * Save progress to localStorage only (sync, for backwards compatibility)
 */
export function saveProgress(xp, level) {
  const progress = { xp, level };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  // Fire and forget API update
  if (apiClient) {
    apiClient.setProgress(xp, level).catch(err => console.error('Background progress save failed:', err));
  }
}

/**
 * Add XP and auto-level up (async)
 */
export async function addXPAsync(xpGained) {
  const current = await loadProgressAsync();
  const newXP = current.xp + xpGained;
  const newLevel = getLevelFromXP(newXP);
  const leveledUp = newLevel > current.level;
  
  const result = await saveProgressAsync(newXP, newLevel);
  return {
    ...result,
    leveledUp,
    xpGained,
  };
}

/**
 * Add XP and auto-level up (sync with background API save)
 */
export function addXP(xpGained) {
  const current = loadProgress();
  const newXP = current.xp + xpGained;
  const newLevel = getLevelFromXP(newXP);
  const leveledUp = newLevel > current.level;
  
  saveProgress(newXP, newLevel);
  
  return {
    xp: newXP,
    level: newLevel,
    leveledUp,
    xpGained,
  };
}

/**
 * Reset progress to defaults
 */
export function resetProgress() {
  saveProgress(0, 1);
  if (apiClient) {
    apiClient.setProgress(0, 1).catch(err => console.error('Failed to reset progress via API:', err));
  }
}

/**
 * Reset progress (async)
 */
export async function resetProgressAsync() {
  return await saveProgressAsync(0, 1);
}
