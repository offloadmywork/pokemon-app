// ═══════════════════════════════════════════
// TEAM MANAGEMENT — localStorage persistence
// ═══════════════════════════════════════════

import { getMaxHP } from "@/game/battle";

const TEAM_STORAGE_KEY = 'pokemon-team';
const MAX_TEAM_SIZE = 3;

/**
 * Team structure:
 * [{ pokemon_id, name, type, image_url, power_level, rarity, currentHP, maxHP }]
 */

/**
 * Load team from localStorage
 * @returns {Array} team array
 */
export function loadTeam() {
  try {
    const saved = JSON.parse(localStorage.getItem(TEAM_STORAGE_KEY));
    if (Array.isArray(saved)) return saved;
  } catch {}
  return [];
}

/**
 * Save team to localStorage
 */
export function saveTeam(team) {
  localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(team));
}

/**
 * Heal all team members to max HP
 * @returns {Array} new team with full HP
 */
export function healTeam(team) {
  return team.map(p => ({
    ...p,
    maxHP: getMaxHP(p),
    currentHP: getMaxHP(p),
  }));
}

/**
 * Check if at least one Pokemon is alive (HP > 0)
 */
export function isTeamAlive(team) {
  return team.length > 0 && team.some(p => p.currentHP > 0);
}

/**
 * Get the first alive Pokemon
 */
export function getActivePokemon(team) {
  return team.find(p => p.currentHP > 0) || null;
}

/**
 * Add a Pokemon to the team
 * @returns {{ success: boolean, team: Array, message: string }}
 */
export function addToTeam(pokemon) {
  const team = loadTeam();
  if (team.length >= MAX_TEAM_SIZE) {
    return { success: false, team, message: 'Team is full! (max 3)' };
  }
  if (team.some(p => p.pokemon_id === pokemon.id)) {
    return { success: false, team, message: 'Already on your team!' };
  }
  const maxHP = getMaxHP(pokemon);
  const newMember = {
    pokemon_id: pokemon.id,
    name: pokemon.name,
    type: pokemon.type,
    image_url: pokemon.image_url,
    power_level: pokemon.power_level,
    rarity: pokemon.rarity,
    currentHP: maxHP,
    maxHP,
  };
  const newTeam = [...team, newMember];
  saveTeam(newTeam);
  return { success: true, team: newTeam, message: `${pokemon.name} joined your team!` };
}

/**
 * Remove a Pokemon from the team
 */
export function removeFromTeam(pokemonId) {
  const team = loadTeam();
  const newTeam = team.filter(p => p.pokemon_id !== pokemonId);
  saveTeam(newTeam);
  return newTeam;
}

/**
 * Check if a pokemon is on the team
 */
export function isOnTeam(pokemonId) {
  const team = loadTeam();
  return team.some(p => p.pokemon_id === pokemonId);
}

export { MAX_TEAM_SIZE };
