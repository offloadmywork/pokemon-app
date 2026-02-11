// ═══════════════════════════════════════════
// BATTLE SYSTEM — Type effectiveness & damage
// ═══════════════════════════════════════════

import { CATCH_RATES } from "@/game/constants";

// Full 18-type effectiveness chart
const TYPE_CHART = {
  Fire:     { strong: ['Grass', 'Ice', 'Bug', 'Steel'],          weak: ['Water', 'Rock', 'Ground'] },
  Water:    { strong: ['Fire', 'Rock', 'Ground'],                 weak: ['Grass', 'Electric'] },
  Grass:    { strong: ['Water', 'Rock', 'Ground'],                weak: ['Fire', 'Ice', 'Flying', 'Bug', 'Poison'] },
  Electric: { strong: ['Water', 'Flying'],                        weak: ['Ground'] },
  Psychic:  { strong: ['Fighting', 'Poison'],                     weak: ['Bug', 'Dark', 'Ghost'] },
  Dragon:   { strong: ['Dragon'],                                 weak: ['Ice', 'Dragon', 'Fairy'] },
  Fairy:    { strong: ['Fighting', 'Dragon', 'Dark'],             weak: ['Poison', 'Steel'] },
  Rock:     { strong: ['Fire', 'Ice', 'Flying', 'Bug'],          weak: ['Water', 'Grass', 'Fighting', 'Ground', 'Steel'] },
  Ice:      { strong: ['Grass', 'Ground', 'Flying', 'Dragon'],   weak: ['Fire', 'Fighting', 'Rock', 'Steel'] },
  Flying:   { strong: ['Grass', 'Fighting', 'Bug'],              weak: ['Electric', 'Ice', 'Rock'] },
  Poison:   { strong: ['Grass', 'Fairy'],                         weak: ['Ground', 'Psychic'] },
  Bug:      { strong: ['Grass', 'Psychic', 'Dark'],              weak: ['Fire', 'Flying', 'Rock'] },
  Normal:   { strong: [],                                         weak: ['Fighting'] },
  Dark:     { strong: ['Psychic', 'Ghost'],                       weak: ['Fighting', 'Bug', 'Fairy'] },
  Ghost:    { strong: ['Psychic', 'Ghost'],                       weak: ['Dark', 'Ghost'] },
  Steel:    { strong: ['Ice', 'Rock', 'Fairy'],                   weak: ['Fire', 'Fighting', 'Ground'] },
  Fighting: { strong: ['Normal', 'Ice', 'Rock', 'Dark', 'Steel'], weak: ['Flying', 'Psychic', 'Fairy'] },
  Ground:   { strong: ['Fire', 'Electric', 'Poison', 'Rock', 'Steel'], weak: ['Water', 'Grass', 'Ice'] },
};

/**
 * Get type effectiveness
 * @returns {'super-effective' | 'not-very-effective' | 'normal'}
 */
export function getEffectiveness(attackerType, defenderType) {
  const chart = TYPE_CHART[attackerType];
  if (!chart) return 'normal';
  if (chart.strong.includes(defenderType)) return 'super-effective';
  if (chart.weak && TYPE_CHART[defenderType]?.strong?.includes(attackerType)) return 'not-very-effective';
  // Also check: if defender's type is in attacker's weak list (meaning defender resists)
  // Actually let's be more precise: if attacker type is weak against defender type
  // We need to check if defenderType is strong against attackerType
  const defChart = TYPE_CHART[defenderType];
  if (defChart && defChart.strong.includes(attackerType)) return 'not-very-effective';
  return 'normal';
}

/**
 * Calculate max HP for a pokemon
 */
export function getMaxHP(pokemon) {
  return (pokemon.power_level || 10) * 3 + 20;
}

/**
 * Calculate damage dealt
 * @returns {{ damage: number, effectiveness: string, isCritical: boolean }}
 */
export function calculateDamage(attacker, defender) {
  const baseDamage = Math.floor((attacker.power_level || 10) / 5) + Math.floor(Math.random() * 6) + 3;
  const effectiveness = getEffectiveness(attacker.type, defender.type);
  const isCritical = Math.random() < 0.10;

  let damage = baseDamage;

  if (effectiveness === 'super-effective') {
    damage = Math.floor(damage * 1.5);
  } else if (effectiveness === 'not-very-effective') {
    damage = Math.floor(damage * 0.6);
  }

  if (isCritical) {
    damage = Math.floor(damage * 1.5);
  }

  return {
    damage: Math.max(1, damage),
    effectiveness,
    isCritical,
  };
}

/**
 * Calculate catch rate with HP factor
 * Lower HP = higher catch rate
 */
export function getCatchRate(pokemon, currentHP) {
  const maxHP = getMaxHP(pokemon);
  const baseRate = CATCH_RATES[pokemon.rarity] || 0.5;
  const hpRatio = currentHP / maxHP;
  const boostedRate = baseRate * (1 + (1 - hpRatio) * 1.5);
  return Math.min(0.95, boostedRate);
}

/**
 * Calculate catch rate when fainted (HP = 0)
 */
export function getFaintedCatchRate() {
  return 0.90;
}
