// Pokemon App API Client for Cloudflare Workers

import { calculateCoopRaidTeamPower } from "@/game/coopRaids";
import { calculatePvpTeamPower } from "@/game/pvp";

const API_BASE = import.meta.env.DEV ? 'http://localhost:8787' : '';
const USER_ID_KEY = 'pokemon-user-id';

class PokemonAPI {
  constructor() {
    this.userId = null;
  }

  // Get or create user ID
  async getUserId() {
    if (this.userId) return this.userId;
    
    // Check localStorage first
    let userId = localStorage.getItem(USER_ID_KEY);
    
    if (!userId) {
      // Generate new UUID
      userId = crypto.randomUUID();
      localStorage.setItem(USER_ID_KEY, userId);
    }
    
    // Register/update user in backend
    try {
      await this.request('/api/user', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
      });
    } catch (err) {
      console.error('Failed to register user:', err);
    }
    
    this.userId = userId;
    return userId;
  }

  async getTrainerRecoveryCode() {
    return this.getUserId();
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Pokemon endpoints
  async getAllPokemon() {
    return this.request('/api/pokemon');
  }

  async getPokemon(id) {
    return this.request(`/api/pokemon/${id}`);
  }

  async createPokemon(data) {
    return this.request('/api/pokemon', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getRandomPokemon(rarity = null, type = null) {
    const query = new URLSearchParams();
    if (rarity) query.set('rarity', rarity);
    if (type) query.set('type', type);
    const params = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/api/pokemon/random/get${params}`);
  }

  // Caught Pokemon endpoints
  async getCaughtPokemon() {
    const userId = await this.getUserId();
    return this.request(`/api/caught?user_id=${encodeURIComponent(userId)}`);
  }

  async catchPokemon(pokemonId, nickname = null) {
    const userId = await this.getUserId();
    return this.request('/api/caught', {
      method: 'POST',
      body: JSON.stringify({ pokemon_id: pokemonId, nickname, user_id: userId }),
    });
  }

  async updateCaughtPokemon(caughtId, data) {
    return this.request(`/api/caught/${caughtId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async releasePokemon(caughtId) {
    return this.request(`/api/caught/${caughtId}`, {
      method: 'DELETE',
    });
  }

  // ===== STARTER POKEMON =====
  async claimStarters() {
    const userId = await this.getUserId();
    return this.request('/api/starter/claim', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  }
  // =========================

  // ===== PLAYER PROGRESS API =====
  async getProgress() {
    const userId = await this.getUserId();
    return this.request(`/api/player/progress?user_id=${encodeURIComponent(userId)}`);
  }

  async setProgress(xp, level) {
    const userId = await this.getUserId();
    return this.request('/api/player/progress', {
      method: 'POST',
      body: JSON.stringify({ xp, level, user_id: userId }),
    });
  }
  // ====================

  // ===== PLAYER WALLET API =====
  async getWallet() {
    const userId = await this.getUserId();
    return this.request(`/api/player/wallet?user_id=${encodeURIComponent(userId)}`);
  }

  async purchaseShopItem(itemId, quantity = 1) {
    const userId = await this.getUserId();
    return this.request('/api/shop/purchase', {
      method: 'POST',
      body: JSON.stringify({ item_id: itemId, quantity, user_id: userId }),
    });
  }

  async getUpgrades() {
    const userId = await this.getUserId();
    return this.request(`/api/player/upgrades?user_id=${encodeURIComponent(userId)}`);
  }

  async purchaseUpgrade(upgradeId) {
    const userId = await this.getUserId();
    return this.request('/api/upgrades/purchase', {
      method: 'POST',
      body: JSON.stringify({ upgrade_id: upgradeId, user_id: userId }),
    });
  }

  async getCosmetics() {
    const userId = await this.getUserId();
    return this.request(`/api/player/cosmetics?user_id=${encodeURIComponent(userId)}`);
  }

  async purchaseCosmetic(cosmeticId) {
    const userId = await this.getUserId();
    return this.request('/api/cosmetics/purchase', {
      method: 'POST',
      body: JSON.stringify({ cosmetic_id: cosmeticId, user_id: userId }),
    });
  }

  async equipCosmetic(cosmeticId) {
    const userId = await this.getUserId();
    return this.request('/api/cosmetics/equip', {
      method: 'POST',
      body: JSON.stringify({ cosmetic_id: cosmeticId, user_id: userId }),
    });
  }

  async getAchievements() {
    const userId = await this.getUserId();
    return this.request(`/api/player/achievements?user_id=${encodeURIComponent(userId)}`);
  }

  async claimAchievement(achievementId) {
    const userId = await this.getUserId();
    return this.request('/api/achievements/claim', {
      method: 'POST',
      body: JSON.stringify({ achievement_id: achievementId, user_id: userId }),
    });
  }
  // ====================

  // ===== TEAM API =====
  async getTeam() {
    const userId = await this.getUserId();
    return this.request(`/api/team?user_id=${encodeURIComponent(userId)}`);
  }

  async setTeam(teamData) {
    const userId = await this.getUserId();
    return this.request('/api/team', {
      method: 'POST',
      body: JSON.stringify({ team: teamData, user_id: userId }),
    });
  }

  async healTeam() {
    const userId = await this.getUserId();
    return this.request(`/api/team/heal?user_id=${encodeURIComponent(userId)}`, {
      method: 'PATCH',
    });
  }

  async updateTeamMemberHP(pokemonId, currentHP) {
    const userId = await this.getUserId();
    return this.request(`/api/team/${pokemonId}`, {
      method: 'PATCH',
      body: JSON.stringify({ currentHP, user_id: userId }),
    });
  }

  async removeFromTeam(pokemonId) {
    const userId = await this.getUserId();
    return this.request(`/api/team/${pokemonId}?user_id=${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    });
  }
  // ====================

  // ===== POKEMON CREATOR =====
  async generatePokemon(data) {
    return this.request('/api/pokemon/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async saveGeneratedPokemon(data) {
    const userId = await this.getUserId();
    return this.request('/api/pokemon/generated', {
      method: 'POST',
      body: JSON.stringify({ ...data, user_id: userId }),
    });
  }
  // ===========================

  // ===== ITEMS API =====
  async getItems() {
    const userId = await this.getUserId();
    return this.request(`/api/items?user_id=${encodeURIComponent(userId)}`);
  }

  async addItem(itemId, quantity = 1) {
    const userId = await this.getUserId();
    return this.request('/api/items', {
      method: 'POST',
      body: JSON.stringify({ item_id: itemId, quantity, user_id: userId }),
    });
  }

  async useItem(itemId) {
    const userId = await this.getUserId();
    return this.request(`/api/items/${itemId}/use`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  }

  async setItemQuantity(itemId, quantity) {
    const userId = await this.getUserId();
    return this.request(`/api/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity, user_id: userId }),
    });
  }
  // ====================

  // ===== DAILY QUESTS API =====
  async getDailyQuests() {
    const userId = await this.getUserId();
    return this.request(`/api/quests/daily?user_id=${encodeURIComponent(userId)}`);
  }

  async updateDailyQuestProgress(questId, amount = 1) {
    const userId = await this.getUserId();
    return this.request(`/api/quests/daily/${questId}/progress`, {
      method: 'POST',
      body: JSON.stringify({ amount, user_id: userId }),
    });
  }

  async claimDailyQuest(questId) {
    const userId = await this.getUserId();
    return this.request(`/api/quests/daily/${questId}/claim`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  }

  async claimAllDailyQuests() {
    const userId = await this.getUserId();
    return this.request('/api/quests/daily/claim-all', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  }

  // ===== WEEKLY MISSIONS API =====
  async getWeeklyMissions() {
    const userId = await this.getUserId();
    return this.request(`/api/weekly-missions?user_id=${encodeURIComponent(userId)}`);
  }

  async progressWeeklyMissions(event, amount = 1) {
    const userId = await this.getUserId();
    return this.request('/api/weekly-missions/progress', {
      method: 'POST',
      body: JSON.stringify({ event, amount, user_id: userId }),
    });
  }

  async claimAllWeeklyMissions() {
    const userId = await this.getUserId();
    return this.request('/api/weekly-missions/claim-all', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  }

  // ===== BOSS CLEAR PROGRESSION API =====
  async getBossClears() {
    const userId = await this.getUserId();
    return this.request(`/api/boss-clears?user_id=${encodeURIComponent(userId)}`);
  }

  async recordBossClear(clear) {
    const userId = await this.getUserId();
    return this.request('/api/boss-clears', {
      method: 'POST',
      body: JSON.stringify({ ...clear, user_id: userId }),
    });
  }
  // ====================

  // ===== LEADERBOARDS API =====
  async getLeaderboard(key = 'level', limit = null) {
    const query = new URLSearchParams({ key });
    if (limit) query.set('limit', String(limit));
    return this.request(`/api/leaderboards?${query.toString()}`);
  }
  // ====================

  // ===== CHALLENGE TOWER API =====
  async getChallengeTower() {
    const userId = await this.getUserId();
    return this.request(`/api/tower?user_id=${encodeURIComponent(userId)}`);
  }

  async completeChallengeTowerFloor(floor) {
    const userId = await this.getUserId();
    return this.request('/api/tower/complete', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, floor }),
    });
  }
  // ====================

  // ===== PVP API =====
  async joinPvpQueue(team = []) {
    const userId = await this.getUserId();
    const teamPower = calculatePvpTeamPower(team);
    return this.request('/api/pvp/queue', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, team_power: teamPower }),
    });
  }

  async leavePvpQueue() {
    const userId = await this.getUserId();
    return this.request(`/api/pvp/queue?user_id=${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    });
  }

  async submitPvpMatchResult(result) {
    const userId = await this.getUserId();
    return this.request('/api/pvp/matches', {
      method: 'POST',
      body: JSON.stringify({ ...result, user_id: userId }),
    });
  }

  async getPvpMatchHistory(limit = 5) {
    const userId = await this.getUserId();
    return this.request(`/api/pvp/matches?user_id=${encodeURIComponent(userId)}&limit=${encodeURIComponent(limit)}`);
  }
  // ==============

  // ===== CO-OP RAID API =====
  async createCoopRaid(team = [], level = 1) {
    const userId = await this.getUserId();
    const teamPower = calculateCoopRaidTeamPower(team);
    return this.request('/api/coop-raids', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, team_power: teamPower, level }),
    });
  }

  async joinCoopRaid(raidId, team = []) {
    const userId = await this.getUserId();
    const teamPower = calculateCoopRaidTeamPower(team);
    return this.request(`/api/coop-raids/${encodeURIComponent(raidId)}/join`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, team_power: teamPower }),
    });
  }

  async attackCoopRaid(raidId, damageDealt) {
    const userId = await this.getUserId();
    return this.request(`/api/coop-raids/${encodeURIComponent(raidId)}/attack`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, damage_dealt: damageDealt }),
    });
  }
  // ========================

  // ===== TRADING API =====
  async listTradeOffers() {
    const userId = await this.getUserId();
    return this.request(`/api/trades?user_id=${encodeURIComponent(userId)}`);
  }

  async createTradeOffer({ toUserId, offeredCaughtId, requestedCaughtId }) {
    const userId = await this.getUserId();
    return this.request('/api/trades', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        to_user_id: toUserId,
        offered_caught_id: offeredCaughtId,
        requested_caught_id: requestedCaughtId,
      }),
    });
  }

  async acceptTradeOffer(tradeId) {
    const userId = await this.getUserId();
    return this.request(`/api/trades/${encodeURIComponent(tradeId)}/accept`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  }

  async cancelTradeOffer(tradeId) {
    const userId = await this.getUserId();
    return this.request(`/api/trades/${encodeURIComponent(tradeId)}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  }

  async declineTradeOffer(tradeId) {
    const userId = await this.getUserId();
    return this.request(`/api/trades/${encodeURIComponent(tradeId)}/decline`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  }
  // ===================

  // ===== EVOLUTION API =====
  async getEvolutionOptions() {
    const userId = await this.getUserId();
    return this.request(`/api/evolution/options?user_id=${encodeURIComponent(userId)}`);
  }

  async evolvePokemon(caughtId) {
    const userId = await this.getUserId();
    return this.request('/api/evolution/evolve', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, caught_id: caughtId }),
    });
  }
  // ====================
}

export const pokemonAPI = new PokemonAPI();
