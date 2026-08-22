// CollectionViewModel - Business logic for Collection page
// Testable without browser - pure state management

const TEAM_HP = 100;

export class CollectionViewModel {
  constructor(apiClient) {
    this.api = apiClient;
    
    // State
    this.caughtPokemon = [];
    this.isLoading = true;
    this.currentPage = 1;
    this.error = null;
    this.searchTerm = '';
    this.typeFilter = 'all';
    this.rarityFilter = 'all';
    
    // Team state (will be persisted via API in future)
    this.team = [];
    
    // Editing state
    this.editingId = null;
    this.editingNickname = '';
    
    // Pagination
    this.itemsPerPage = 12;
    
    // Pokemon data cache
    this.pokemonCache = new Map();
  }

  // ═══════════════════════════════════════════════════
  // Collection Loading
  // ═══════════════════════════════════════════════════
  
  async loadCollection() {
    this.isLoading = true;
    this.error = null;
    
    try {
      const caughtList = await this.api.getCaughtPokemon();
      this.caughtPokemon = caughtList;
    } catch (err) {
      this.error = err.message;
      console.error('Failed to fetch collection:', err);
    } finally {
      this.isLoading = false;
    }
  }

  async claimStartersForEmptyCollection() {
    this.isLoading = true;
    this.error = null;

    try {
      const result = await this.api.claimStarters();
      if (!result.success) {
        return { success: false, message: result.message || 'Failed to claim starters' };
      }

      if (result.starters) {
        this._autoAddStartersToTeam(result.starters);
      }

      this.caughtPokemon = await this.api.getCaughtPokemon();
      return { success: true, starters: result.starters || [] };
    } catch (err) {
      this.error = err.message;
      console.error('Failed to claim starters:', err);
      return { success: false, message: err.message };
    } finally {
      this.isLoading = false;
    }
  }

  // ═══════════════════════════════════════════════════
  // Team Management (API-backed)
  // ═══════════════════════════════════════════════════
  
  async loadTeam() {
    try {
      const team = await this.api.getTeam();
      this.team = team;
      return team;
    } catch (err) {
      console.error('Failed to load team:', err);
      return [];
    }
  }

  async addToTeam(pokemon) {
    // Check for duplicates
    if (this.isOnTeam(pokemon.id)) {
      return { success: false, message: 'Already on team!' };
    }
    
    // Check team size
    if (this.team.length >= 3) {
      return { success: false, message: 'Team is full! (max 3)' };
    }
    
    const teamMember = {
      pokemon_id: pokemon.id,
      name: pokemon.name,
      type: pokemon.type,
      power_level: pokemon.power_level,
      rarity: pokemon.rarity,
      image_url: pokemon.image_url,
      maxHP: TEAM_HP,
      currentHP: TEAM_HP,
    };
    
    // Optimistically update local state
    this.team = [...this.team, teamMember];
    
    try {
      // Persist to API
      const updatedTeam = await this.api.setTeam(this.team);
      this.team = updatedTeam;
      return { success: true, team: this.team };
    } catch (err) {
      // Revert on error
      this.team = this.team.filter(p => p.pokemon_id !== pokemon.id);
      console.error('Failed to add to team:', err);
      return { success: false, message: 'Failed to save team' };
    }
  }

  async removeFromTeam(pokemonId) {
    const previousTeam = this.team;
    this.team = this.team.filter(p => p.pokemon_id !== pokemonId);
    
    try {
      await this.api.setTeam(this.team);
    } catch (err) {
      this.team = previousTeam;
      console.error('Failed to remove from team:', err);
    }
  }

  isOnTeam(pokemonId) {
    return this.team.some(p => p.pokemon_id === pokemonId);
  }

  async healTeam() {
    try {
      const healedTeam = await this.api.healTeam();
      this.team = healedTeam;
      return healedTeam;
    } catch (err) {
      console.error('Failed to heal team:', err);
      return this.team;
    }
  }

  // ═══════════════════════════════════════════════════
  // Pagination
  // ═══════════════════════════════════════════════════
  
  get currentPageItems() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredPokemon.slice(start, start + this.itemsPerPage);
  }

  get totalPages() {
    return Math.max(1, Math.ceil(this.filteredPokemon.length / this.itemsPerPage));
  }

  get hasMorePages() {
    return this.currentPage < this.totalPages;
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  goToPage(page) {
    this.currentPage = Math.max(1, Math.min(this.totalPages, page));
  }

  setSearchTerm(term) {
    this.searchTerm = term || '';
    this.currentPage = 1;
  }

  setTypeFilter(type) {
    this.typeFilter = type || 'all';
    this.currentPage = 1;
  }

  setRarityFilter(rarity) {
    this.rarityFilter = rarity || 'all';
    this.currentPage = 1;
  }

  get filteredPokemon() {
    const search = this.searchTerm.trim().toLowerCase();

    return this.caughtPokemon.filter((caught) => {
      const fields = this._getDiscoveryFields(caught);
      const matchesSearch = !search || fields.searchText.includes(search);
      const matchesType = this.typeFilter === 'all' || fields.type === this.typeFilter;
      const matchesRarity = this.rarityFilter === 'all' || fields.rarity === this.rarityFilter;

      return matchesSearch && matchesType && matchesRarity;
    });
  }

  get discoverySummary() {
    return {
      total: this.caughtPokemon.length,
      visible: this.filteredPokemon.length,
      hasFilters: Boolean(
        this.searchTerm.trim() ||
        this.typeFilter !== 'all' ||
        this.rarityFilter !== 'all'
      ),
    };
  }

  // ═══════════════════════════════════════════════════
  // Nickname Editing
  // ═══════════════════════════════════════════════════
  
  startEditing(caughtId, currentNickname = '') {
    this.editingId = caughtId;
    this.editingNickname = currentNickname;
  }

  setNickname(nickname) {
    this.editingNickname = nickname;
  }

  async saveNickname() {
    if (!this.editingId) return;
    
    try {
      await this.api.updateCaughtPokemon(this.editingId, {
        nickname: this.editingNickname.trim() || null,
      });
      
      // Update local state
      this.caughtPokemon = this.caughtPokemon.map(p =>
        p.id === this.editingId
          ? { ...p, nickname: this.editingNickname.trim() || null }
          : p
      );
      
      this.editingId = null;
      this.editingNickname = '';
    } catch (err) {
      console.error('Failed to save nickname:', err);
      throw err;
    }
  }

  cancelEditing() {
    this.editingId = null;
    this.editingNickname = '';
  }

  // ═══════════════════════════════════════════════════
  // Release Pokemon
  // ═══════════════════════════════════════════════════
  
  async releasePokemon(caughtId, pokemonId) {
    try {
      await this.api.releasePokemon(caughtId);
      
      // Remove from collection
      this.caughtPokemon = this.caughtPokemon.filter(c => c.id !== caughtId);
      
      // Remove from team if on team
      if (this.isOnTeam(pokemonId)) {
        this.removeFromTeam(pokemonId);
      }
      
      // Adjust current page if needed
      if (this.currentPage > this.totalPages) {
        this.currentPage = this.totalPages || 1;
      }
      
    } catch (err) {
      console.error('Failed to release Pokemon:', err);
      throw err;
    }
  }

  // ═══════════════════════════════════════════════════
  // Pokemon Details (with caching)
  // ═══════════════════════════════════════════════════
  
  async getPokemonDetails(pokemonId) {
    if (this.pokemonCache.has(pokemonId)) {
      return this.pokemonCache.get(pokemonId);
    }
    
    try {
      const pokemon = await this.api.getPokemon(pokemonId);
      this.pokemonCache.set(pokemonId, pokemon);
      return pokemon;
    } catch (err) {
      console.error(`Failed to fetch Pokemon ${pokemonId}:`, err);
      return null;
    }
  }

  // ═══════════════════════════════════════════════════
  // Private Helpers
  // ═══════════════════════════════════════════════════
  
  _autoAddStartersToTeam(starters) {
    for (const starter of starters.slice(0, 3)) {
      this.team.push({
        pokemon_id: starter.pokemon_id,
        name: starter.name,
        type: starter.type,
        power_level: starter.power_level,
        rarity: starter.rarity,
        image_url: starter.image_url,
        maxHP: TEAM_HP,
        currentHP: TEAM_HP,
      });
    }
  }

  _getDiscoveryFields(caught) {
    const pokemon = caught?.pokemon || {};
    const name = caught?.name || pokemon.name || '';
    const nickname = caught?.nickname || '';
    const type = caught?.type || pokemon.type || '';
    const rarity = caught?.rarity || pokemon.rarity || '';

    return {
      type,
      rarity,
      searchText: `${name} ${nickname} ${type} ${rarity}`.toLowerCase(),
    };
  }
}

// Factory function for creating VM with default API
export function createCollectionViewModel(apiClient) {
  return new CollectionViewModel(apiClient);
}
