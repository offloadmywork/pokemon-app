// ═══════════════════════════════════════════
// SHARED GAME CONSTANTS
// ═══════════════════════════════════════════

// Generate DiceBear image URL for Pokemon
export const getPokemonImage = (pokemon) => {
  const seed = encodeURIComponent(pokemon.name + (pokemon.type || ""));
  const typeColors = {
    Fire: "f97316,ef4444",
    Water: "3b82f6,0ea5e9",
    Electric: "eab308,facc15",
    Psychic: "d946ef,a855f7",
    Dark: "1f2937,374151",
    Dragon: "7c3aed,6366f1",
    Ice: "67e8f9,22d3ee",
    Fighting: "dc2626,b91c1c",
    Ghost: "7c3aed,6b21a8",
    Steel: "9ca3af,6b7280",
    Fairy: "f472b6,ec4899",
    Rock: "a8a29e,78716c",
    Ground: "d97706,b45309",
    Flying: "93c5fd,60a5fa",
    Poison: "a855f7,9333ea",
    Bug: "84cc16,65a30d",
    Normal: "a8a29e,9ca3af",
    Grass: "22c55e,16a34a",
  };
  const colors = typeColors[pokemon.type] || "6366f1,8b5cf6";
  return `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}&backgroundColor=${colors}&backgroundType=gradientLinear`;
};

// Catch rates based on rarity
export const CATCH_RATES = {
  Common: 0.8,
  Uncommon: 0.65,
  Rare: 0.5,
  Epic: 0.3,
  Legendary: 0.15,
};

export const TOTAL_POKEMON = 680;

// ═══════════════════════════════════════════
// LEVELING SYSTEM
// ═══════════════════════════════════════════

export const STORAGE_KEY = 'pokemon-adventure-progress';

export const LEVEL_CONFIG = [
  {
    level: 1, xpRequired: 0,
    name: 'The Enchanted Forest',
    shortName: 'Forest',
    gradient: 'linear-gradient(180deg, #0a1f0a 0%, #0d2818 15%, #14532d 40%, #166534 60%, #15803d 80%, #1a3a1a 100%)',
    buttonGradient: 'linear-gradient(135deg, #22c55e, #15803d)',
    buttonGlow: '#22c55e',
    buttonLabel: 'Explore the Woods',
    textColor: '#86efac',
    keepExploringLabel: 'Keep Exploring',
  },
  {
    level: 2, xpRequired: 100,
    name: 'The Crystal Cave',
    shortName: 'Crystal Cave',
    gradient: 'linear-gradient(180deg, #0c0a2a 0%, #1a1040 15%, #2d1b69 40%, #1e1250 60%, #150d3a 80%, #0a0620 100%)',
    buttonGradient: 'linear-gradient(135deg, #a855f7, #6b21a8)',
    buttonGlow: '#a855f7',
    buttonLabel: 'Explore the Cave',
    textColor: '#c4b5fd',
    keepExploringLabel: 'Keep Exploring',
  },
  {
    level: 3, xpRequired: 300,
    name: 'Thunder Mountain',
    shortName: 'Thunder Mt.',
    gradient: 'linear-gradient(180deg, #111827 0%, #1f2937 15%, #374151 40%, #1f2937 60%, #111827 80%, #0f172a 100%)',
    buttonGradient: 'linear-gradient(135deg, #3b82f6, #1e40af)',
    buttonGlow: '#3b82f6',
    buttonLabel: 'Climb the Mountain',
    textColor: '#93c5fd',
    keepExploringLabel: 'Keep Exploring',
  },
  {
    level: 4, xpRequired: 600,
    name: 'The Fire Volcano',
    shortName: 'Volcano',
    gradient: 'linear-gradient(180deg, #1a0a00 0%, #3b1106 15%, #7c2d12 40%, #9a3412 60%, #7c2d12 80%, #451a03 100%)',
    buttonGradient: 'linear-gradient(135deg, #f97316, #c2410c)',
    buttonGlow: '#f97316',
    buttonLabel: 'Explore the Volcano',
    textColor: '#fdba74',
    keepExploringLabel: 'Keep Exploring',
  },
  {
    level: 5, xpRequired: 1000,
    name: 'The Sky Temple',
    shortName: 'Sky Temple',
    gradient: 'linear-gradient(180deg, #0c1445 0%, #1e3a8a 15%, #2563eb 35%, #60a5fa 50%, #93c5fd 65%, #fef9c3 85%, #fef3c7 100%)',
    buttonGradient: 'linear-gradient(135deg, #fbbf24, #d97706)',
    buttonGlow: '#facc15',
    buttonLabel: 'Explore the Temple',
    textColor: '#fde68a',
    keepExploringLabel: 'Keep Exploring',
  },
];

export const XP_REWARDS = {
  Common: 10,
  Uncommon: 25,
  Rare: 50,
  Epic: 100,
  Legendary: 250,
};

export const RARITY_WEIGHTS = {
  1: { Common: 60, Uncommon: 30, Rare: 10 },
  2: { Common: 40, Uncommon: 35, Rare: 20, Epic: 5 },
  3: { Common: 20, Uncommon: 30, Rare: 30, Epic: 15, Legendary: 5 },
  4: { Common: 10, Uncommon: 20, Rare: 30, Epic: 25, Legendary: 15 },
  5: { Common: 5, Uncommon: 10, Rare: 25, Epic: 30, Legendary: 30 },
};

export const rollRarity = (level) => {
  const weights = RARITY_WEIGHTS[level] || RARITY_WEIGHTS[1];
  const roll = Math.random() * 100;
  let cumulative = 0;
  for (const [rarity, weight] of Object.entries(weights)) {
    cumulative += weight;
    if (roll < cumulative) return rarity;
  }
  return 'Common';
};

export const getLevelFromXP = (xp) => {
  for (let i = LEVEL_CONFIG.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_CONFIG[i].xpRequired) return LEVEL_CONFIG[i].level;
  }
  return 1;
};

export const getLevelConfig = (level) => LEVEL_CONFIG.find(l => l.level === level) || LEVEL_CONFIG[0];

export const getNextLevelXP = (level) => {
  const next = LEVEL_CONFIG.find(l => l.level === level + 1);
  return next ? next.xpRequired : null;
};

// ═══════════════════════════════════════════
// DEPRECATED: Use @/game/progress module instead
// These are kept for backward compatibility only
// ═══════════════════════════════════════════

/**
 * @deprecated Use loadProgress from @/game/progress instead
 */
export const loadProgress = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return { xp: saved?.xp || 0, level: saved?.level || 1 };
  } catch {
    return { xp: 0, level: 1 };
  }
};

/**
 * @deprecated Use saveProgress from @/game/progress instead
 */
export const saveProgress = (xp, level) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ xp, level }));
};


// ═══════════════════════════════════════════ // GAME BALANCE CONSTANTS // ═══════════════════════════════════════════
export const CRITICAL_CHANCE = 0.1; // 10% chance for critical hits
export const LEVEL_XP_MULTIPLIER = 1.5; // XP multiplier for level-based scaling

export const rarityConfig = {
  Common: { color: "#9ca3af", glow: "none", label: "Common", stars: 1 },
  Uncommon: { color: "#22c55e", glow: "0 0 15px #22c55e", label: "Uncommon", stars: 2 },
  Rare: { color: "#3b82f6", glow: "0 0 20px #3b82f6", label: "Rare!", stars: 3 },
  Epic: { color: "#a855f7", glow: "0 0 25px #a855f7, 0 0 50px #a855f780", label: "EPIC!!", stars: 4 },
  Legendary: { color: "#facc15", glow: "0 0 30px #facc15, 0 0 60px #facc1580, 0 0 90px #facc1540", label: "LEGENDARY", stars: 5 },
};
