// Pokemon App API Client for Cloudflare Workers

const API_BASE = import.meta.env.DEV ? 'http://localhost:8787' : '';

class PokemonAPI {
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
    return this.request('/api/caught');
  }

  async catchPokemon(pokemonId, nickname = null) {
    return this.request('/api/caught', {
      method: 'POST',
      body: JSON.stringify({ pokemon_id: pokemonId, nickname }),
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
    return this.request('/api/starter/claim', {
      method: 'POST',
    });
  }
  // =========================

  // ===== TEAM API =====
  async getTeam() {
    return this.request('/api/team');
  }

  async setTeam(teamData) {
    return this.request('/api/team', {
      method: 'POST',
      body: JSON.stringify(teamData),
    });
  }

  async healTeam() {
    return this.request('/api/team/heal', {
      method: 'PATCH',
    });
  }

  async updateTeamMemberHP(pokemonId, currentHP) {
    return this.request(`/api/team/${pokemonId}`, {
      method: 'PATCH',
      body: JSON.stringify({ currentHP }),
    });
  }

  async removeFromTeam(pokemonId) {
    return this.request(`/api/team/${pokemonId}`, {
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
    return this.request('/api/pokemon/generated', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
  // ===========================
}

export const pokemonAPI = new PokemonAPI();
