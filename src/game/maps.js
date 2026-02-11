// ═══════════════════════════════════════════
// GAME MAPS — 20 columns × 15 rows
// ═══════════════════════════════════════════
// Tile types:
// 0 = Path (walkable, safe)
// 1 = Tall grass (walkable, ~20% encounter chance)
// 2 = Tree (solid wall)
// 3 = Water (solid wall)
// 4 = Rock (solid wall)
// 5 = Healing spot (walkable, heals team)
// 6 = Portal/Exit (walkable, special)

// Level 1: The Enchanted Forest
// Paths winding through trees, meadows of tall grass, healing pond
const forestMap = [
  [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
  [2, 0, 0, 1, 1, 2, 2, 1, 1, 0, 0, 1, 1, 2, 2, 1, 1, 0, 0, 2],
  [2, 0, 2, 2, 1, 1, 0, 0, 1, 1, 2, 2, 0, 0, 1, 1, 2, 2, 0, 2],
  [2, 0, 0, 2, 2, 1, 1, 0, 0, 2, 2, 0, 0, 1, 1, 2, 2, 0, 0, 2],
  [2, 1, 0, 0, 2, 2, 1, 1, 0, 0, 0, 0, 1, 1, 2, 2, 0, 0, 1, 2],
  [2, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 2],
  [2, 2, 1, 1, 0, 0, 1, 1, 2, 0, 0, 2, 1, 1, 0, 0, 1, 1, 2, 2],
  [2, 0, 0, 1, 1, 0, 0, 2, 2, 5, 5, 2, 2, 0, 0, 1, 1, 0, 0, 2],
  [2, 0, 2, 2, 1, 1, 0, 0, 3, 3, 3, 3, 0, 0, 1, 1, 2, 2, 0, 2],
  [2, 0, 0, 2, 2, 1, 1, 0, 3, 3, 3, 3, 0, 1, 1, 2, 2, 0, 0, 2],
  [2, 1, 0, 0, 2, 2, 1, 0, 0, 0, 0, 0, 0, 1, 2, 2, 0, 0, 1, 2],
  [2, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 2],
  [2, 2, 1, 1, 0, 0, 1, 1, 1, 2, 2, 1, 1, 1, 0, 0, 1, 1, 2, 2],
  [2, 0, 0, 1, 1, 0, 0, 1, 2, 2, 2, 2, 1, 0, 0, 1, 1, 0, 0, 2],
  [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
];

// Level 2: The Crystal Cave
// Narrow tunnels, crystal formations (rocks), underground pools
const crystalCaveMap = [
  [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  [4, 0, 0, 0, 4, 1, 1, 0, 0, 4, 4, 0, 0, 1, 1, 4, 0, 0, 0, 4],
  [4, 0, 4, 0, 0, 0, 1, 1, 0, 4, 4, 0, 1, 1, 0, 0, 0, 4, 0, 4],
  [4, 0, 4, 4, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 4, 4, 0, 4],
  [4, 0, 0, 0, 0, 0, 4, 1, 1, 0, 0, 1, 1, 4, 0, 0, 0, 0, 0, 4],
  [4, 4, 0, 1, 1, 0, 4, 4, 1, 0, 0, 1, 4, 4, 0, 1, 1, 0, 4, 4],
  [4, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 4],
  [4, 0, 1, 0, 0, 0, 3, 3, 0, 5, 5, 0, 3, 3, 0, 0, 0, 1, 0, 4],
  [4, 0, 1, 1, 0, 0, 3, 3, 0, 0, 0, 0, 3, 3, 0, 0, 1, 1, 0, 4],
  [4, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 4],
  [4, 4, 0, 0, 0, 1, 1, 0, 4, 0, 0, 4, 0, 1, 1, 0, 0, 0, 4, 4],
  [4, 0, 0, 1, 1, 1, 0, 0, 4, 4, 4, 4, 0, 0, 1, 1, 1, 0, 0, 4],
  [4, 0, 4, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 4, 0, 4],
  [4, 0, 0, 0, 4, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 4, 0, 0, 0, 4],
  [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
];

// Level 3: Thunder Mountain
// Winding mountain path, rocky terrain, storm elements
const thunderMountainMap = [
  [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  [4, 0, 0, 4, 4, 1, 1, 0, 0, 4, 4, 0, 0, 1, 1, 4, 4, 0, 0, 4],
  [4, 0, 1, 1, 4, 4, 1, 0, 0, 0, 0, 0, 0, 1, 4, 4, 1, 1, 0, 4],
  [4, 0, 0, 1, 0, 0, 0, 0, 4, 4, 4, 4, 0, 0, 0, 0, 1, 0, 0, 4],
  [4, 4, 0, 0, 0, 1, 1, 0, 0, 4, 4, 0, 0, 1, 1, 0, 0, 0, 4, 4],
  [4, 0, 0, 1, 1, 1, 4, 0, 0, 0, 0, 0, 0, 4, 1, 1, 1, 0, 0, 4],
  [4, 0, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 0, 4],
  [4, 0, 0, 0, 4, 0, 1, 1, 0, 5, 5, 0, 1, 1, 0, 4, 0, 0, 0, 4],
  [4, 1, 0, 4, 4, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 4, 4, 0, 1, 4],
  [4, 1, 0, 0, 0, 0, 1, 1, 0, 4, 4, 0, 1, 1, 0, 0, 0, 0, 1, 4],
  [4, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 4],
  [4, 0, 1, 1, 4, 4, 0, 1, 1, 0, 0, 1, 1, 0, 4, 4, 1, 1, 0, 4],
  [4, 0, 0, 0, 0, 4, 0, 0, 1, 1, 1, 1, 0, 0, 4, 0, 0, 0, 0, 4],
  [4, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 4],
  [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
];

// Level 4: The Fire Volcano
// Lava rivers (water=lava visually), rocky paths, ember patches
const fireVolcanoMap = [
  [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  [4, 0, 0, 1, 4, 3, 3, 0, 0, 1, 1, 0, 0, 3, 3, 4, 1, 0, 0, 4],
  [4, 0, 4, 1, 1, 3, 0, 0, 1, 1, 1, 1, 0, 0, 3, 1, 1, 4, 0, 4],
  [4, 0, 0, 0, 1, 0, 0, 4, 3, 3, 3, 3, 4, 0, 0, 1, 0, 0, 0, 4],
  [4, 1, 0, 0, 0, 0, 1, 4, 3, 4, 4, 3, 4, 1, 0, 0, 0, 0, 1, 4],
  [4, 1, 1, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 1, 1, 4],
  [4, 0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 4],
  [4, 0, 0, 0, 1, 0, 0, 1, 0, 5, 5, 0, 1, 0, 0, 1, 0, 0, 0, 4],
  [4, 3, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 3, 4],
  [4, 3, 3, 0, 0, 0, 1, 1, 4, 0, 0, 4, 1, 1, 0, 0, 0, 3, 3, 4],
  [4, 0, 0, 0, 4, 0, 0, 1, 4, 4, 4, 4, 1, 0, 0, 4, 0, 0, 0, 4],
  [4, 0, 1, 1, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 1, 1, 0, 4],
  [4, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 4],
  [4, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 4],
  [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
];

// Level 5: The Sky Temple
// Cloud platforms (paths), golden walkways, celestial gardens
const skyTempleMap = [
  [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
  [3, 0, 0, 0, 1, 1, 3, 3, 0, 0, 0, 0, 3, 3, 1, 1, 0, 0, 0, 3],
  [3, 0, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 0, 3],
  [3, 0, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 0, 3],
  [3, 0, 0, 0, 0, 3, 0, 0, 0, 1, 1, 0, 0, 0, 3, 0, 0, 0, 0, 3],
  [3, 1, 0, 0, 3, 3, 0, 1, 0, 0, 0, 0, 1, 0, 3, 3, 0, 0, 1, 3],
  [3, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 3],
  [3, 0, 0, 0, 0, 0, 1, 0, 0, 5, 5, 0, 0, 1, 0, 0, 0, 0, 0, 3],
  [3, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 3],
  [3, 0, 0, 1, 0, 3, 0, 0, 0, 1, 1, 0, 0, 0, 3, 0, 1, 0, 0, 3],
  [3, 3, 0, 0, 0, 3, 3, 0, 1, 1, 1, 1, 0, 3, 3, 0, 0, 0, 3, 3],
  [3, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 0, 0, 3],
  [3, 0, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0, 3],
  [3, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 3],
  [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
];

// Map configs with start positions and theme data
export const MAPS = [
  {
    data: forestMap,
    startX: 1,
    startY: 1,
    theme: {
      // Tile colors/emojis per tile type for this level
      path: { bg: '#8B7355', emoji: '' },
      grass: { bg: '#2d5a1e', emoji: '🌿', animClass: 'grass-sway' },
      tree: { bg: '#1a3a0a', emoji: '🌳' },
      water: { bg: '#1e40af', emoji: '💧', animClass: 'water-wave' },
      rock: { bg: '#57534e', emoji: '🪨' },
      heal: { bg: '#fdf2f8', emoji: '✨', animClass: 'heal-glow' },
      portal: { bg: '#fbbf24', emoji: '🌟', animClass: 'portal-pulse' },
    },
  },
  {
    data: crystalCaveMap,
    startX: 1,
    startY: 1,
    theme: {
      path: { bg: '#2d1b69', emoji: '' },
      grass: { bg: '#3b1f8e', emoji: '💎', animClass: 'grass-sway' },
      tree: { bg: '#1a1040', emoji: '🔮' },       // crystals instead of trees
      water: { bg: '#312e81', emoji: '💧', animClass: 'water-wave' },
      rock: { bg: '#1e1250', emoji: '💜' },         // crystal formations
      heal: { bg: '#c084fc', emoji: '✨', animClass: 'heal-glow' },
      portal: { bg: '#a855f7', emoji: '🌟', animClass: 'portal-pulse' },
    },
  },
  {
    data: thunderMountainMap,
    startX: 1,
    startY: 1,
    theme: {
      path: { bg: '#4b5563', emoji: '' },
      grass: { bg: '#374151', emoji: '⚡', animClass: 'grass-sway' },
      tree: { bg: '#1f2937', emoji: '🌩️' },       // storm clouds
      water: { bg: '#1e3a8a', emoji: '🌊', animClass: 'water-wave' },
      rock: { bg: '#292524', emoji: '⛰️' },
      heal: { bg: '#93c5fd', emoji: '✨', animClass: 'heal-glow' },
      portal: { bg: '#3b82f6', emoji: '🌟', animClass: 'portal-pulse' },
    },
  },
  {
    data: fireVolcanoMap,
    startX: 1,
    startY: 1,
    theme: {
      path: { bg: '#78350f', emoji: '' },
      grass: { bg: '#92400e', emoji: '🔥', animClass: 'grass-sway' },
      tree: { bg: '#451a03', emoji: '🌋' },        // volcanic rocks
      water: { bg: '#dc2626', emoji: '🔥', animClass: 'water-wave' }, // LAVA!
      rock: { bg: '#44403c', emoji: '🪨' },
      heal: { bg: '#fdba74', emoji: '✨', animClass: 'heal-glow' },
      portal: { bg: '#f97316', emoji: '🌟', animClass: 'portal-pulse' },
    },
  },
  {
    data: skyTempleMap,
    startX: 1,
    startY: 1,
    theme: {
      path: { bg: '#fef3c7', emoji: '' },
      grass: { bg: '#d1fae5', emoji: '🌸', animClass: 'grass-sway' },
      tree: { bg: '#bfdbfe', emoji: '☁️' },         // clouds
      water: { bg: '#93c5fd', emoji: '☁️', animClass: 'water-wave' }, // sky/void
      rock: { bg: '#fde68a', emoji: '🏛️' },         // temple pillars
      heal: { bg: '#fef9c3', emoji: '✨', animClass: 'heal-glow' },
      portal: { bg: '#facc15', emoji: '🌟', animClass: 'portal-pulse' },
    },
  },
];

// Get map for a given level (1-5)
export const getMap = (level) => MAPS[Math.min(level, 5) - 1];

// Check if a tile is walkable
export const isWalkable = (tileType) => tileType === 0 || tileType === 1 || tileType === 5 || tileType === 6;

// Check if a tile is tall grass (encounter possible)
export const isGrass = (tileType) => tileType === 1;

// Check if a tile is a healing spot
export const isHealingSpot = (tileType) => tileType === 5;
