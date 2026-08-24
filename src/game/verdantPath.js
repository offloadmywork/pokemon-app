export const VERDANT_PATH = Object.freeze({
  id: 'verdant-path',
  name: 'Verdant Path',
  tileSize: 32,
  width: 30,
  height: 22,
  spawn: Object.freeze({ x: 4, y: 17 }),
  encounterTiles: Object.freeze([
    Object.freeze({ x: 9, y: 6, width: 6, height: 5 }),
    Object.freeze({ x: 18, y: 13, width: 6, height: 4 }),
  ]),
  landmarks: Object.freeze([
    Object.freeze({ x: 24, y: 5, label: 'Moonwell' }),
    Object.freeze({ x: 25, y: 17, label: 'Grove Gate' }),
  ]),
  // Authored endgame for the slice: the Grove Warden guards the moonwell
  // clearing, and the reward cache behind it only opens once the warden falls.
  bossArena: Object.freeze({ x: 22, y: 3, width: 5, height: 4 }),
  rewardCache: Object.freeze({ x: 24, y: 2 }),
});

/**
 * Authored pacing: the zone has exactly one current objective. New players
 * are pushed toward the warden fight, winners toward the cache, and finished
 * players get a calm end state instead of a stale pointer.
 */
export function getVerdantObjective({ bossDefeated = false, cacheOpened = false } = {}, zone = VERDANT_PATH) {
  if (!bossDefeated) {
    return { label: 'Challenge the Grove Warden at the moonwell', x: zone.bossArena.x + 2, y: zone.bossArena.y + 1 };
  }
  if (!cacheOpened) {
    return { label: 'Open the sealed cache behind the moonwell', x: zone.rewardCache.x, y: zone.rewardCache.y };
  }
  return { label: 'Verdant Path is at peace — wander as you please', x: zone.spawn.x, y: zone.spawn.y };
}

/**
 * One cardinal step from (fromX, fromY) toward an objective tile, breaking
 * ties on the dominant axis. Returns null when already standing on it.
 */
export function getVerdantGuidanceStep(fromX, fromY, objective) {
  const dx = objective.x - fromX;
  const dy = objective.y - fromY;
  if (dx === 0 && dy === 0) return null;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'east' : 'west';
  return dy > 0 ? 'south' : 'north';
}

/**
 * Resolves an authored tile event for the current position. The boss trigger
 * fires anywhere inside the warden arena; the reward stays sealed until the
 * caller confirms the boss is defeated.
 */
export function getVerdantTileEvent(x, y, { bossDefeated = false } = {}, zone = VERDANT_PATH) {
  const { bossArena, rewardCache } = zone;
  if (x >= rewardCache.x && x < rewardCache.x + 1 && y >= rewardCache.y && y < rewardCache.y + 1) {
    return bossDefeated ? 'reward' : null;
  }
  // A defeated warden closes the gate: the arena becomes safe ground and the
  // critical path to the cache can never re-trigger the fight.
  if (!bossDefeated &&
    x >= bossArena.x && x < bossArena.x + bossArena.width &&
    y >= bossArena.y && y < bossArena.y + bossArena.height
  ) return 'boss';
  return null;
}

export function isVerdantEncounterTile(x, y, zone = VERDANT_PATH) {
  return zone.encounterTiles.some((area) => (
    x >= area.x && x < area.x + area.width && y >= area.y && y < area.y + area.height
  ));
}

/**
 * Stable decorative variant per tile for the art pass: a tiny integer hash
 * spreads flowers, pebbles, and grass tufts deterministically so the meadow
 * never looks flat-painted or random between visits.
 */
export function getVerdantTileVariant(x, y) {
  let hash = (x * 374761393 + y * 668265263) | 0;
  hash = (hash ^ (hash >> 13)) * 1274126177;
  return Math.abs((hash ^ (hash >> 16)) % 4);
}

/**
 * Character facing: horizontal intent wins over vertical (classic top-down
 * feel); an idle intent keeps the previous facing so the hero never snaps
 * to a default direction when the player releases the keys.
 */
export function getVerdantFacing(intent, currentFacing = 'down') {
  if (!intent) return currentFacing;
  if ((intent.x || 0) < 0) return 'left';
  if ((intent.x || 0) > 0) return 'right';
  if ((intent.y || 0) < 0) return 'up';
  if ((intent.y || 0) > 0) return 'down';
  return currentFacing;
}

export function isVerdantWalkable(x, y, zone = VERDANT_PATH) {
  if (x < 1 || y < 1 || x >= zone.width - 1 || y >= zone.height - 1) return false;
  // A deliberately placed stream bank creates a readable route choice.
  return !(x >= 15 && x <= 16 && y >= 2 && y <= 14 && y !== 10);
}

/**
 * Touch controls deliberately share the keyboard movement model. A held
 * virtual direction takes priority so a focused keyboard key cannot fight a
 * player's thumb on a small screen.
 */
export function getVerdantMovementIntent({ left = false, right = false, up = false, down = false, touchDirection = null } = {}) {
  const touchVectors = {
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
  };
  if (touchDirection && touchVectors[touchDirection]) return touchVectors[touchDirection];
  return { x: (right ? 1 : 0) - (left ? 1 : 0), y: (down ? 1 : 0) - (up ? 1 : 0) };
}
