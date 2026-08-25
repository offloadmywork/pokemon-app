import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { pokemonAPI } from './client';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value; }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

// Store original fetch and localStorage
const originalFetch = global.fetch;
const originalLocalStorage = global.localStorage;
const originalCrypto = global.crypto;

describe('PokemonAPI User Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    pokemonAPI.userId = null; // Reset cached userId
    pokemonAPI.sessionToken = null;
    pokemonAPI.needsSessionMint = false;
    
    // Setup mocks
    global.localStorage = localStorageMock;
    global.fetch = vi.fn();
    
    // Mock crypto.randomUUID
    vi.stubGlobal('crypto', {
      ...originalCrypto,
      randomUUID: vi.fn(() => 'test-uuid-12345'),
    });
  });

  afterEach(() => {
    // Restore originals
    global.fetch = originalFetch;
    global.localStorage = originalLocalStorage;
    vi.unstubAllGlobals();
  });

  describe('getUserId', () => {
    it('should generate and store new user ID if none exists', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ user_id: 'test-uuid-12345', existing: false }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'signed-token' }),
        });

      const userId = await pokemonAPI.getUserId();
      
      expect(userId).toBe('test-uuid-12345');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('pokemon-user-id', 'test-uuid-12345');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/user'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ user_id: 'test-uuid-12345' }),
        })
      );
    });

    it('should use existing user ID from localStorage', async () => {
      localStorageMock.setItem('pokemon-user-id', 'existing-user-id');

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ user_id: 'existing-user-id', existing: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'signed-token' }),
        });

      const userId = await pokemonAPI.getUserId();
      
      expect(userId).toBe('existing-user-id');
      expect(global.crypto.randomUUID).not.toHaveBeenCalled();
    });

    it('should cache user ID after first call', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ user_id: 'test-uuid-12345', existing: false }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'signed-token' }),
        });

      const userId1 = await pokemonAPI.getUserId();
      const userId2 = await pokemonAPI.getUserId();
      
      expect(userId1).toBe(userId2);
      // Registration + session mint on the cold path, then nothing further.
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should handle backend registration failure gracefully', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const userId = await pokemonAPI.getUserId();
      
      expect(userId).toBe('test-uuid-12345');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('pokemon-user-id', 'test-uuid-12345');
    });

    it('mints a session token during first registration and sends it on requests', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ user_id: 'test-uuid-12345', existing: false }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'signed-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ([]),
        });

      await pokemonAPI.getUserId();
      expect(pokemonAPI.sessionToken).toBe('signed-token');

      await pokemonAPI.getCaughtPokemon();
      const apiCall = global.fetch.mock.calls[2];
      expect(apiCall[1].headers.Authorization).toBe('Bearer signed-token');
    });

    it('re-mints the session token when the active user changes', async () => {
      pokemonAPI.sessionToken = 'old-user-token';
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'new-user-token' }),
      });

      pokemonAPI.setActiveUserId('restored-user');

      // Old token is invalidated immediately; the lazy request path re-mints.
      expect(pokemonAPI.sessionToken).toBeNull();
      expect(pokemonAPI.needsSessionMint).toBe(true);
    });

    it('should expose the current user ID as a trainer recovery code', async () => {
      localStorageMock.setItem('pokemon-user-id', 'recoverable-user-id');
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user_id: 'recoverable-user-id', existing: true }),
      });

      const recoveryCode = await pokemonAPI.getTrainerRecoveryCode();

      expect(recoveryCode).toBe('recoverable-user-id');
    });
  });

  describe('API methods with user_id', () => {
    beforeEach(() => {
      // Setup getUserId to return a test user ID
      localStorageMock.setItem('pokemon-user-id', 'test-user');
      pokemonAPI.userId = 'test-user';
    });

    it('should include user_id in getCaughtPokemon request', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ([]),
      });

      await pokemonAPI.getCaughtPokemon();
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/caught?user_id=test-user'),
        expect.any(Object)
      );
    });

    it('should include user_id in catchPokemon request', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'caught-1', pokemon_id: 'poke-1' }),
      });

      await pokemonAPI.catchPokemon('poke-1', 'Sparky');
      
      const fetchCall = global.fetch.mock.calls[0];
      expect(fetchCall[0]).toContain('/api/caught');
      
      const body = JSON.parse(fetchCall[1].body);
      expect(body).toEqual({
        pokemon_id: 'poke-1',
        nickname: 'Sparky',
        user_id: 'test-user'
      });
    });

    it('should include user_id in getProgress request', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ xp: 100, level: 5 }),
      });

      await pokemonAPI.getProgress();
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/player/progress?user_id=test-user'),
        expect.any(Object)
      );
    });

    it('should include user_id in setProgress request', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ xp: 200, level: 6 }),
      });

      await pokemonAPI.setProgress(200, 6);
      
      const fetchCall = global.fetch.mock.calls[0];
      expect(fetchCall[0]).toContain('/api/player/progress');
      
      const body = JSON.parse(fetchCall[1].body);
      expect(body).toEqual({ xp: 200, level: 6, user_id: 'test-user' });
    });

    it('should include user_id in getTeam request', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ([]),
      });

      await pokemonAPI.getTeam();
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/team?user_id=test-user'),
        expect.any(Object)
      );
    });

    it('should include user_id in setTeam request', async () => {
      const teamData = [{ pokemon_id: 'poke-1', name: 'Sparky' }];
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => teamData,
      });

      await pokemonAPI.setTeam(teamData);
      
      const fetchCall = global.fetch.mock.calls[0];
      expect(fetchCall[0]).toContain('/api/team');
      
      const body = JSON.parse(fetchCall[1].body);
      expect(body).toEqual({ team: teamData, user_id: 'test-user' });
    });

    it('should include user_id in claimStarters request', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, starters: [] }),
      });

      await pokemonAPI.claimStarters();
      
      const fetchCall = global.fetch.mock.calls[0];
      expect(fetchCall[0]).toContain('/api/starter/claim');
      
      const body = JSON.parse(fetchCall[1].body);
      expect(body).toEqual({ user_id: 'test-user' });
    });

    it('should include user_id in healTeam request', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ([]),
      });

      await pokemonAPI.healTeam();
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/team/heal?user_id=test-user'),
        expect.any(Object)
      );
    });

    it('should include user_id in updateTeamMemberHP request', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await pokemonAPI.updateTeamMemberHP('poke-1', 50);
      
      const fetchCall = global.fetch.mock.calls[0];
      expect(fetchCall[0]).toContain('/api/team/poke-1');
      
      const body = JSON.parse(fetchCall[1].body);
      expect(body).toEqual({ currentHP: 50, user_id: 'test-user' });
    });

    it('should include user_id in removeFromTeam request', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await pokemonAPI.removeFromTeam('poke-1');
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/team/poke-1?user_id=test-user'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should include user_id in saveGeneratedPokemon request', async () => {
      const pokemonData = {
        name: 'TestMon',
        type: 'Fire',
        description: 'A test pokemon',
        image_url: 'http://example.com/image.png',
        power_level: 50
      };
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, pokemon: pokemonData }),
      });

      await pokemonAPI.saveGeneratedPokemon(pokemonData);
      
      const fetchCall = global.fetch.mock.calls[0];
      expect(fetchCall[0]).toContain('/api/pokemon/generated');
      
      const body = JSON.parse(fetchCall[1].body);
      expect(body.user_id).toBe('test-user');
      expect(body.name).toBe('TestMon');
    });

    it('should include user_id in getDailyQuests request', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ([]),
      });

      await pokemonAPI.getDailyQuests();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/quests/daily?user_id=test-user'),
        expect.any(Object)
      );
    });

    it('should include user_id in updateDailyQuestProgress request', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'quest-1', progress: 1, target: 1 }),
      });

      await pokemonAPI.updateDailyQuestProgress('quest-1', 2);

      const fetchCall = global.fetch.mock.calls[0];
      expect(fetchCall[0]).toContain('/api/quests/daily/quest-1/progress');

      const body = JSON.parse(fetchCall[1].body);
      expect(body).toEqual({ amount: 2, user_id: 'test-user' });
    });

    it('should include user_id in claimDailyQuest request', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'quest-1', claimed_at: '2026-02-27T00:00:00Z' }),
      });

      await pokemonAPI.claimDailyQuest('quest-1');

      const fetchCall = global.fetch.mock.calls[0];
      expect(fetchCall[0]).toContain('/api/quests/daily/quest-1/claim');

      const body = JSON.parse(fetchCall[1].body);
      expect(body).toEqual({ user_id: 'test-user' });
    });

    it('should include user_id in claimAllDailyQuests request', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ claimed: [], claimedCount: 0 }),
      });

      await pokemonAPI.claimAllDailyQuests();

      const fetchCall = global.fetch.mock.calls[0];
      expect(fetchCall[0]).toContain('/api/quests/daily/claim-all');

      const body = JSON.parse(fetchCall[1].body);
      expect(body).toEqual({ user_id: 'test-user' });
    });

    it('should include user_id in getBossClears request', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ([]),
      });

      await pokemonAPI.getBossClears();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/boss-clears?user_id=test-user'),
        expect.any(Object)
      );
    });

    it('should include user_id in recordBossClear request', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ boss_key: 'grove-guardian' }),
      });

      await pokemonAPI.recordBossClear({
        boss_key: 'grove-guardian',
        name: 'Grove Guardian',
        reward_xp: 120,
        cleared_at: '2026-07-04T20:17:00.000Z',
      });

      const fetchCall = global.fetch.mock.calls[0];
      expect(fetchCall[0]).toContain('/api/boss-clears');

      const body = JSON.parse(fetchCall[1].body);
      expect(body).toEqual({
        user_id: 'test-user',
        boss_key: 'grove-guardian',
        name: 'Grove Guardian',
        reward_xp: 120,
        cleared_at: '2026-07-04T20:17:00.000Z',
      });
    });
  });
});
