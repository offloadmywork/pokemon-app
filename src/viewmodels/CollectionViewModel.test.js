import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CollectionViewModel } from './CollectionViewModel';

// Mock the API client
const mockApiClient = {
  getCaughtPokemon: vi.fn(),
  getPokemon: vi.fn(),
  claimStarters: vi.fn(),
  updateCaughtPokemon: vi.fn(),
  releasePokemon: vi.fn(),
  getTeam: vi.fn(),
  setTeam: vi.fn(),
  healTeam: vi.fn(),
};

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value; },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('CollectionViewModel', () => {
  let vm;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    vm = new CollectionViewModel(mockApiClient);
  });

  describe('Initial State', () => {
    it('starts with empty collection', () => {
      expect(vm.caughtPokemon).toEqual([]);
      expect(vm.isLoading).toBe(true);
      expect(vm.currentPage).toBe(1);
    });

    it('starts with empty team', () => {
      expect(vm.team).toEqual([]);
    });
  });

  describe('loadCollection', () => {
    it('loads caught pokemon from API', async () => {
      const mockCaught = [
        { id: '1', pokemon_id: 'p1', name: 'Pikachu', type: 'Electric' },
        { id: '2', pokemon_id: 'p2', name: 'Charmander', type: 'Fire' },
      ];
      mockApiClient.getCaughtPokemon.mockResolvedValue(mockCaught);

      await vm.loadCollection();

      expect(vm.caughtPokemon).toEqual(mockCaught);
      expect(vm.isLoading).toBe(false);
    });

    it('does not auto-claim starters while loading an empty collection', async () => {
      mockApiClient.getCaughtPokemon.mockResolvedValue([]);

      await vm.loadCollection();

      expect(vm.caughtPokemon).toEqual([]);
      expect(mockApiClient.claimStarters).not.toHaveBeenCalled();
    });

    it('claims starters through an explicit empty-collection action', async () => {
      const starterPokemon = [
        { id: 'c1', pokemon_id: 's1', name: 'Flametail Jr', type: 'Fire' },
        { id: 'c2', pokemon_id: 's2', name: 'Ripplefin', type: 'Water' },
        { id: 'c3', pokemon_id: 's3', name: 'Leaflet', type: 'Grass' },
      ];
      mockApiClient.getCaughtPokemon.mockResolvedValue([]);
      mockApiClient.claimStarters.mockResolvedValue({
        success: true,
        starters: [
          { pokemon_id: 's1', name: 'Flametail Jr', type: 'Fire', power_level: 25 },
          { pokemon_id: 's2', name: 'Ripplefin', type: 'Water', power_level: 25 },
          { pokemon_id: 's3', name: 'Leaflet', type: 'Grass', power_level: 25 },
        ],
      });
      mockApiClient.getCaughtPokemon
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(starterPokemon);

      await vm.loadCollection();
      const result = await vm.claimStartersForEmptyCollection();

      expect(result.success).toBe(true);
      expect(mockApiClient.claimStarters).toHaveBeenCalledTimes(1);
      expect(vm.caughtPokemon).toEqual(starterPokemon);
      expect(vm.team).toHaveLength(3);
    });

    it('handles API errors gracefully', async () => {
      mockApiClient.getCaughtPokemon.mockRejectedValue(new Error('Network error'));

      await vm.loadCollection();

      expect(vm.error).toBe('Network error');
      expect(vm.isLoading).toBe(false);
    });
  });

  describe('Team Management', () => {
    beforeEach(async () => {
      const mockCaught = [
        { id: 'c1', pokemon_id: 'p1', name: 'Pikachu', type: 'Electric', power_level: 50 },
        { id: 'c2', pokemon_id: 'p2', name: 'Charmander', type: 'Fire', power_level: 40 },
        { id: 'c3', pokemon_id: 'p3', name: 'Squirtle', type: 'Water', power_level: 35 },
        { id: 'c4', pokemon_id: 'p4', name: 'Bulbasaur', type: 'Grass', power_level: 30 },
      ];
      mockApiClient.getCaughtPokemon.mockResolvedValue(mockCaught);
      mockApiClient.getTeam.mockResolvedValue([]);
      await vm.loadCollection();
    });

    it('adds pokemon to team', async () => {
      const pokemon = { id: 'p1', name: 'Pikachu', type: 'Electric', power_level: 50 };
      mockApiClient.setTeam.mockImplementation((team) => Promise.resolve(team));
      
      await vm.addToTeam(pokemon);

      expect(vm.team.length).toBe(1);
      expect(vm.team[0].pokemon_id).toBe('p1');
      expect(vm.team[0].currentHP).toBe(100);
      expect(vm.team[0].maxHP).toBe(100);
    });

    it('limits team to 3 pokemon', async () => {
      mockApiClient.setTeam.mockImplementation((team) => Promise.resolve(team));
      
      await vm.addToTeam({ id: 'p1', name: 'P1' });
      await vm.addToTeam({ id: 'p2', name: 'P2' });
      await vm.addToTeam({ id: 'p3', name: 'P3' });
      const result = await vm.addToTeam({ id: 'p4', name: 'P4' });

      expect(vm.team.length).toBe(3);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Team is full');
    });

    it('does not add duplicate pokemon', async () => {
      mockApiClient.setTeam.mockImplementation((team) => Promise.resolve(team));
      
      await vm.addToTeam({ id: 'p1', name: 'Pikachu' });
      const result = await vm.addToTeam({ id: 'p1', name: 'Pikachu' });

      expect(vm.team.length).toBe(1);
      expect(result.success).toBe(false);
    });

    it('removes pokemon from team', async () => {
      mockApiClient.setTeam.mockImplementation((team) => Promise.resolve(team));
      
      await vm.addToTeam({ id: 'p1', name: 'Pikachu' });
      await vm.removeFromTeam('p1');

      expect(vm.team.length).toBe(0);
    });

    // TODO: Once API team persistence is implemented:
    // - saveTeam() will call API to persist team
    // - loadCollection() will fetch team from API
    // - This enables cross-device play
  });

  describe('Pagination', () => {
    beforeEach(async () => {
      // Create 30 pokemon for pagination tests
      const mockCaught = Array.from({ length: 30 }, (_, i) => ({
        id: `c${i}`,
        pokemon_id: `p${i}`,
        name: `Pokemon ${i}`,
      }));
      mockApiClient.getCaughtPokemon.mockResolvedValue(mockCaught);
      await vm.loadCollection();
    });

    it('calculates total pages correctly', () => {
      expect(vm.totalPages).toBe(3); // 30 items / 12 per page
    });

    it('returns current page items', () => {
      const pageItems = vm.currentPageItems;
      expect(pageItems.length).toBe(12);
    });

    it('navigates to next page', () => {
      vm.nextPage();
      expect(vm.currentPage).toBe(2);
    });

    it('does not go past last page', () => {
      vm.goToPage(10);
      expect(vm.currentPage).toBe(3);
    });

    it('navigates to previous page', () => {
      vm.nextPage();
      vm.previousPage();
      expect(vm.currentPage).toBe(1);
    });

    it('does not go below page 1', () => {
      vm.previousPage();
      expect(vm.currentPage).toBe(1);
    });
  });

  describe('Collection Discovery', () => {
    beforeEach(async () => {
      mockApiClient.getCaughtPokemon.mockResolvedValue([
        {
          id: 'c1',
          pokemon_id: 'p1',
          name: 'Pikachu',
          nickname: 'Sparky',
          type: 'Electric',
          rarity: 'Rare',
        },
        {
          id: 'c2',
          pokemon_id: 'p2',
          name: 'Bulbasaur',
          nickname: null,
          type: 'Grass',
          rarity: 'Common',
        },
        {
          id: 'c3',
          pokemon_id: 'p3',
          name: 'Squirtle',
          nickname: null,
          type: 'Water',
          rarity: 'Uncommon',
        },
      ]);
      await vm.loadCollection();
    });

    it('filters collection by search text, type, and rarity while resetting pagination', () => {
      vm.goToPage(2);

      vm.setSearchTerm('spark');
      vm.setTypeFilter('Electric');
      vm.setRarityFilter('Rare');

      expect(vm.currentPage).toBe(1);
      expect(vm.filteredPokemon).toEqual([
        expect.objectContaining({ pokemon_id: 'p1', nickname: 'Sparky' }),
      ]);
      expect(vm.discoverySummary).toEqual({
        total: 3,
        visible: 1,
        hasFilters: true,
      });
    });

    it('matches nested pokemon details when a caught row has loaded details', () => {
      vm.setSearchTerm('bulba');
      vm.setTypeFilter('Grass');

      expect(vm.filteredPokemon).toEqual([
        expect.objectContaining({ pokemon_id: 'p2' }),
      ]);
    });
  });

  describe('Nickname Management', () => {
    it('starts editing a nickname', () => {
      vm.startEditing('c1');
      expect(vm.editingId).toBe('c1');
      expect(vm.editingNickname).toBe('');
    });

    it('updates nickname value', () => {
      vm.startEditing('c1');
      vm.setNickname('Sparky');
      expect(vm.editingNickname).toBe('Sparky');
    });

    it('saves nickname via API', async () => {
      mockApiClient.updateCaughtPokemon.mockResolvedValue({ success: true });
      vm.startEditing('c1');
      vm.setNickname('Sparky');
      
      await vm.saveNickname();

      expect(mockApiClient.updateCaughtPokemon).toHaveBeenCalledWith('c1', { nickname: 'Sparky' });
      expect(vm.editingId).toBeNull();
    });

    it('cancels editing', () => {
      vm.startEditing('c1');
      vm.cancelEditing();
      expect(vm.editingId).toBeNull();
      expect(vm.editingNickname).toBe('');
    });
  });

  describe('Release Pokemon', () => {
    beforeEach(async () => {
      mockApiClient.getCaughtPokemon.mockResolvedValue([
        { id: 'c1', pokemon_id: 'p1', name: 'Pikachu' },
      ]);
      mockApiClient.getTeam.mockResolvedValue([]);
      await vm.loadCollection();
    });

    it('releases pokemon via API', async () => {
      mockApiClient.releasePokemon.mockResolvedValue({ success: true });
      
      await vm.releasePokemon('c1', 'p1');

      expect(mockApiClient.releasePokemon).toHaveBeenCalledWith('c1');
      expect(vm.caughtPokemon.length).toBe(0);
    });

    it('removes released pokemon from team if on team', async () => {
      mockApiClient.setTeam.mockImplementation((team) => Promise.resolve(team));
      
      await vm.addToTeam({ id: 'p1', name: 'Pikachu' });
      mockApiClient.releasePokemon.mockResolvedValue({ success: true });
      
      await vm.releasePokemon('c1', 'p1');

      expect(vm.team.length).toBe(0);
    });
  });

  describe('Healing', () => {
    it('heals all team members', async () => {
      mockApiClient.setTeam.mockImplementation((team) => Promise.resolve(team));
      mockApiClient.healTeam.mockResolvedValue([
        { pokemon_id: 'p1', name: 'Pikachu', currentHP: 100, maxHP: 100 },
        { pokemon_id: 'p2', name: 'Charmander', currentHP: 100, maxHP: 100 },
      ]);
      
      await vm.addToTeam({ id: 'p1', name: 'Pikachu', power_level: 50 });
      await vm.addToTeam({ id: 'p2', name: 'Charmander', power_level: 40 });
      
      // Simulate damage (would need to be done through API in real flow)
      
      await vm.healTeam();
      
      expect(mockApiClient.healTeam).toHaveBeenCalled();
    });
  });

  describe('Is On Team Check', () => {
    it('returns true if pokemon is on team', async () => {
      mockApiClient.setTeam.mockImplementation((team) => Promise.resolve(team));
      await vm.addToTeam({ id: 'p1', name: 'Pikachu' });
      expect(vm.isOnTeam('p1')).toBe(true);
    });

    it('returns false if pokemon is not on team', () => {
      expect(vm.isOnTeam('p999')).toBe(false);
    });
  });
});
