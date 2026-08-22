import { getItemById } from './items.js';

export function getLureByItemId(itemId) {
  const item = getItemById(itemId);

  if (item?.category !== 'lure') {
    return null;
  }

  return {
    itemId: item.id,
    durationEncounters: item.durationEncounters,
    encounterChanceMultiplier: item.encounterChanceMultiplier,
    boostedTypes: item.boostedTypes || [],
    encounterTypeWeight: item.encounterTypeWeight || 0,
  };
}

export function getLureEncounterBonus(lure) {
  return {
    encounterChanceMultiplier: lure?.encounterChanceMultiplier || 1,
    catchRateMultiplier: 1,
    xpMultiplier: 1,
  };
}

export function applyLureDurationBonus(lure, upgradeLevel = 0) {
  if (!lure) return null;

  const parsedLevel = Number(upgradeLevel);
  const bonusEncounters = Number.isFinite(parsedLevel) && parsedLevel > 0
    ? Math.floor(parsedLevel)
    : 0;

  return {
    ...lure,
    durationEncounters: lure.durationEncounters + bonusEncounters,
  };
}

export function selectLureEncounterType(lure, roll = Math.random()) {
  if (!lure?.boostedTypes?.length || roll >= lure.encounterTypeWeight) {
    return null;
  }

  const bucketSize = lure.encounterTypeWeight / lure.boostedTypes.length;
  const typeIndex = Math.min(
    lure.boostedTypes.length - 1,
    Math.floor(roll / bucketSize)
  );
  return lure.boostedTypes[typeIndex];
}
