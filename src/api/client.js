// Pokemon App API Client for Cloudflare Workers

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

  async getRandomPokemon(rarity = null) {
    const params = rarity ? `?rarity=${encodeURIComponent(rarity)}` : '';
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
}

export const pokemonAPI = new PokemonAPI();
