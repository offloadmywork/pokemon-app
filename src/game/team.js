// ═══════════════════════════════════════════
// TEAM MANAGEMENT — API persistence (cross-device)
// ═══════════════════════════════════════════

import { getMaxHP } from "@/game/battle";

const MAX_TEAM_SIZE = 3;

// API client will be injected or imported
let apiClient = null;

/**
 * Set the API client for team operations
 */
export function setTeamApiClient(client) {
  apiClient = client;
}

/**
 * Load team from API (async)
 * Falls back to localStorage if API fails
 */
export async function loadTeamAsync() {
  try {
    if (apiClient) {
      const team = await apiClient.getTeam();
      // Cache to localStorage for offline fallback
      localStorage.setItem('pokemon-team-cache', JSON.stringify(team));
      return team;
    }
  } catch (err) {
    console.error('Failed to load team from API:', err);
  }
  // Fallback to cache
  return loadTeamFromCache();
}

/**
 * Load team from localStorage cache (sync, for backwards compatibility)
 */
export function loadTeam() {
  try {
    const saved = JSON.parse(localStorage.getItem('pokemon-team-cache'));
    if (Array.isArray(saved)) return saved;
  } catch {}
  return [];
}

function loadTeamFromCache() {
  try {
    const saved = JSON.parse(localStorage.getItem('pokemon-team-cache'));
    if (Array.isArray(saved)) return saved;
  } catch {}
  return [];
}

/**
 * Save team to API (async)
 * Also updates localStorage cache
 */
export async function saveTeamAsync(team) {
  try {
    if (apiClient) {
      const result = await apiClient.setTeam(team);
      // Update cache
      localStorage.setItem('pokemon-team-cache', JSON.stringify(result));
      return result;
    }
  } catch (err) {
    console.error('Failed to save team to API:', err);
  }
  // Fallback: just update cache
  localStorage.setItem('pokemon-team-cache', JSON.stringify(team));
  return team;
}

/**
 * Save team to localStorage only (sync, for backwards compatibility)
 */
export function saveTeam(team) {
  localStorage.setItem('pokemon-team-cache', JSON.stringify(team));
  // Fire and forget API update
  if (apiClient) {
    apiClient.setTeam(team).catch(err => console.error('Background team save failed:', err));
  }
}

/**
 * Heal all team members to max HP (API)
 */
export async function healTeamAsync() {
  try {
    if (apiClient) {
      const team = await apiClient.healTeam();
      localStorage.setItem('pokemon-team-cache', JSON.stringify(team));
      return team;
    }
  } catch (err) {
    console.error('Failed to heal team via API:', err);
  }
  // Fallback: heal locally
  const team = loadTeam();
  const healed = healTeam(team);
  saveTeam(healed);
  return healed;
}

/**
 * Heal all team members to max HP (local calculation)
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
 * Add a Pokemon to the team (async)
 */
export async function addToTeamAsync(pokemon) {
  const team = await loadTeamAsync();
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
  await saveTeamAsync(newTeam);
  return { success: true, team: newTeam, message: `${pokemon.name} joined your team!` };
}

/**
 * Add a Pokemon to the team (sync with background API save)
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
 * Remove a Pokemon from the team (async)
 */
export async function removeFromTeamAsync(pokemonId) {
  const team = await loadTeamAsync();
  const newTeam = team.filter(p => p.pokemon_id !== pokemonId);
  await saveTeamAsync(newTeam);
  return newTeam;
}

/**
 * Remove a Pokemon from the team (sync)
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
