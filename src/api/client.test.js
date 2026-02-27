import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pokemonAPI } from './client';

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

describe('Pokemon API Client', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
    global.localStorage = localStorageMock;
    localStorageMock.clear();
    pokemonAPI.userId = null;
    
    // Mock crypto.randomUUID for tests that trigger getUserId
    vi.stubGlobal('crypto', {
      ...crypto,
      randomUUID: vi.fn(() => 'test-uuid'),
    });
  });

  describe('Core Request Method', () => {
    it('should make successful GET requests', async () => {
      const mockData = { id: 1, name: 'Pikachu' };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const result = await pokemonAPI.getPokemon(1);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/pokemon/1'),
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      );
      expect(result).toEqual(mockData);
    });

    it('should throw error on failed requests', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Pokemon not found' }),
      });

      await expect(pokemonAPI.getPokemon(999)).rejects.toThrow('Pokemon not found');
    });

    it('should throw generic error when response JSON fails', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      await expect(pokemonAPI.getPokemon(1)).rejects.toThrow('Request failed');
    });
  });

  describe('Pokemon Endpoints', () => {
    it('should fetch all pokemon', async () => {
      const mockPokemon = [{ id: 1, name: 'Pikachu' }, { id: 2, name: 'Charmander' }];
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPokemon),
      });

      const result = await pokemonAPI.getAllPokemon();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/pokemon'),
        expect.any(Object)
      );
      expect(result).toEqual(mockPokemon);
    });

    it('should create a new pokemon', async () => {
      const newPokemon = { name: 'Mewtwo', type: 'Psychic', power_level: 100 };
      const mockResponse = { id: 3, ...newPokemon };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await pokemonAPI.createPokemon(newPokemon);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/pokemon'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(newPokemon),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should fetch random pokemon without rarity filter', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 1, name: 'Random Mon' }),
      });

      await pokemonAPI.getRandomPokemon();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/pokemon/random/get'),
        expect.any(Object)
      );
      expect(fetch.mock.calls[0][0]).not.toContain('rarity=');
    });

    it('should fetch random pokemon with rarity filter', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 1, name: 'Rare Mon', rarity: 'Legendary' }),
      });

      await pokemonAPI.getRandomPokemon('Legendary');

      expect(fetch.mock.calls[0][0]).toContain('/api/pokemon/random/get?rarity=Legendary');
    });
  });

  describe('Caught Pokemon Endpoints', () => {
    it('should fetch caught pokemon', async () => {
      // Mock getUserId response
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user_id: 'test-uuid', existing: false }),
      });
      
      const mockCaught = [{ id: 1, pokemon_id: 1, nickname: 'Sparky' }];
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCaught),
      });

      const result = await pokemonAPI.getCaughtPokemon();

      expect(result).toEqual(mockCaught);
      // Should include user_id in query
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/caught?user_id='),
        expect.any(Object)
      );
    });

    it('should catch a pokemon without nickname', async () => {
      // Mock getUserId response
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user_id: 'test-uuid', existing: false }),
      });
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await pokemonAPI.catchPokemon(1);

      const catchCall = fetch.mock.calls.find(call => call[0].includes('/api/caught') && !call[0].includes('user_id'));
      expect(catchCall).toBeDefined();
      expect(catchCall[1]).toEqual(expect.objectContaining({
        method: 'POST',
      }));
      
      // Check that user_id is in the body
      const body = JSON.parse(catchCall[1].body);
      expect(body).toMatchObject({
        pokemon_id: 1,
        nickname: null,
        user_id: 'test-uuid'
      });
    });

    it('should catch a pokemon with nickname', async () => {
      // Mock getUserId response
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user_id: 'test-uuid', existing: false }),
      });
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await pokemonAPI.catchPokemon(1, 'Sparky');

      const catchCall = fetch.mock.calls.find(call => call[0].includes('/api/caught') && !call[0].includes('user_id'));
      expect(catchCall).toBeDefined();
      
      const body = JSON.parse(catchCall[1].body);
      expect(body).toMatchObject({
        pokemon_id: 1,
        nickname: 'Sparky',
        user_id: 'test-uuid'
      });
    });

    it('should update caught pokemon', async () => {
      const updateData = { nickname: 'New Name', xp: 100 };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ...updateData, id: 1 }),
      });

      await pokemonAPI.updateCaughtPokemon(1, updateData);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/caught/1'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(updateData),
        })
      );
    });

    it('should release caught pokemon', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ deleted: true }),
      });

      await pokemonAPI.releasePokemon(1);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/caught/1'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('Starter Pokemon Endpoints', () => {
    it('should claim starter pokemon', async () => {
      // Mock getUserId response
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user_id: 'test-uuid', existing: false }),
      });
      
      const mockStarters = [
        { id: 1, name: 'Bulbasaur', starter: true },
        { id: 4, name: 'Charmander', starter: true },
        { id: 7, name: 'Squirtle', starter: true },
      ];
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStarters),
      });

      const result = await pokemonAPI.claimStarters();

      const claimCall = fetch.mock.calls.find(call => call[0].includes('/api/starter/claim'));
      expect(claimCall).toBeDefined();
      expect(claimCall[1]).toEqual(expect.objectContaining({
        method: 'POST',
      }));
      
      // Check that user_id is in the body
      const body = JSON.parse(claimCall[1].body);
      expect(body).toEqual({ user_id: 'test-uuid' });
      
      expect(result).toEqual(mockStarters);
    });
  });

  describe('Leaderboards Endpoints', () => {
    it('should fetch leaderboard entries with key', async () => {
      const mockEntries = { key: 'level', entries: [{ user_id: 'u1', score: 100, rank: 1 }] };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockEntries),
      });

      const result = await pokemonAPI.getLeaderboard('level');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/leaderboards?key=level'),
        expect.any(Object)
      );
      expect(result).toEqual(mockEntries);
    });

    it('should include limit when provided', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ key: 'caught', entries: [] }),
      });

      await pokemonAPI.getLeaderboard('caught', 5);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/leaderboards?key=caught&limit=5'),
        expect.any(Object)
      );
    });
  });

  describe('Custom Headers', () => {
    it('should merge custom headers with default headers', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await pokemonAPI.request('/test', {
        headers: { 'Authorization': 'Bearer token123' },
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer token123',
          },
        })
      );
    });
  });
  describe('Challenge Tower Endpoints', () => {
    it('should fetch challenge tower status', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user_id: 'test-uuid', existing: false }),
      });

      const towerPayload = { progress: { current_floor: 1 }, floors: [] };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(towerPayload),
      });

      const result = await pokemonAPI.getChallengeTower();

      expect(result).toEqual(towerPayload);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/tower?user_id='),
        expect.any(Object)
      );
    });

    it('should complete a challenge tower floor', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user_id: 'test-uuid', existing: false }),
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ progress: { current_floor: 2 } }),
      });

      await pokemonAPI.completeChallengeTowerFloor(1);

      const call = fetch.mock.calls.find(([url]) => url.includes('/api/tower/complete'));
      expect(call).toBeDefined();
      expect(call[1]).toEqual(expect.objectContaining({ method: 'POST' }));
      const body = JSON.parse(call[1].body);
      expect(body).toMatchObject({ user_id: 'test-uuid', floor: 1 });
    });
  });

});
