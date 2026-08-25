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
    // Preset a session so getUserId() does not fire an extra mint request
    // that would consume this suite's single-response fetch mocks.
    pokemonAPI.sessionToken = 'test-session-token';
    
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
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
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

    it('should fetch random pokemon with rarity and type filters', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 1, name: 'Lapras', rarity: 'Rare', type: 'Water' }),
      });

      await pokemonAPI.getRandomPokemon('Rare', 'Water');

      expect(fetch.mock.calls[0][0]).toContain('/api/pokemon/random/get?rarity=Rare&type=Water');
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

      // The client's session token takes precedence over caller-supplied
      // Authorization headers; the server derives identity from it anyway.
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-session-token',
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

  describe('PvP Endpoints', () => {
    it('should join the PvP queue with living team power', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user_id: 'test-uuid', existing: false }),
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ queued: true, team_power: 75 }),
      });

      const result = await pokemonAPI.joinPvpQueue([
        { pokemon_id: 'p1', power_level: 45, currentHP: 20 },
        { pokemon_id: 'p2', power_level: 30, currentHP: 10 },
        { pokemon_id: 'p3', power_level: 99, currentHP: 0 },
      ]);

      const call = fetch.mock.calls.find(([url]) => url.includes('/api/pvp/queue'));
      expect(call).toBeDefined();
      expect(call[1]).toEqual(expect.objectContaining({ method: 'POST' }));
      expect(JSON.parse(call[1].body)).toMatchObject({
        user_id: 'test-uuid',
        team_power: 75,
      });
      expect(result).toEqual({ queued: true, team_power: 75 });
    });

    it('should leave the PvP queue for the current user', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user_id: 'test-uuid', existing: false }),
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ queued: false }),
      });

      await pokemonAPI.leavePvpQueue();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/pvp/queue?user_id=test-uuid'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should submit a PvP match result for the current user', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user_id: 'test-uuid', existing: false }),
      });

      const matchPayload = { match: { id: 'match-1', outcome: 'win' } };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(matchPayload),
      });

      const result = await pokemonAPI.submitPvpMatchResult({
        opponent_user_id: 'opponent-1',
        player_team: [{ pokemon_id: 'p1', currentHP: 12 }],
        opponent_team: [{ pokemon_id: 'o1', currentHP: 0 }],
      });

      const call = fetch.mock.calls.find(([url]) => url.includes('/api/pvp/matches'));
      expect(call).toBeDefined();
      expect(call[1]).toEqual(expect.objectContaining({ method: 'POST' }));
      expect(JSON.parse(call[1].body)).toEqual({
        user_id: 'test-uuid',
        opponent_user_id: 'opponent-1',
        player_team: [{ pokemon_id: 'p1', currentHP: 12 }],
        opponent_team: [{ pokemon_id: 'o1', currentHP: 0 }],
      });
      expect(result).toEqual(matchPayload);
    });

    it('should fetch recent PvP match history for the current user', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user_id: 'test-uuid', existing: false }),
      });

      const historyPayload = { matches: [{ id: 'match-1', outcome: 'win' }] };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(historyPayload),
      });

      const result = await pokemonAPI.getPvpMatchHistory(3);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/pvp/matches?user_id=test-uuid&limit=3'),
        expect.objectContaining({
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        })
      );
      expect(result).toEqual(historyPayload);
    });

    it('should fetch the player wallet for the current user', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user_id: 'test-uuid', existing: false }),
      });

      const walletPayload = { user_id: 'test-uuid', coins: 50, shards: 0 };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(walletPayload),
      });

      const result = await pokemonAPI.getWallet();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/player/wallet?user_id=test-uuid'),
        expect.objectContaining({
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        })
      );
      expect(result).toEqual(walletPayload);
    });

    it('should purchase shop items for the current user', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user_id: 'test-uuid', existing: false }),
      });

      const purchasePayload = {
        success: true,
        item_id: 'pokeball',
        quantity: 2,
        total_cost: 20,
        wallet: { user_id: 'test-uuid', coins: 80, shards: 0 },
        item: { item_id: 'pokeball', quantity: 3 },
      };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(purchasePayload),
      });

      const result = await pokemonAPI.purchaseShopItem('pokeball', 2);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/shop/purchase'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            item_id: 'pokeball',
            quantity: 2,
            user_id: 'test-uuid',
          }),
        })
      );
      expect(result).toEqual(purchasePayload);
    });

    it('should fetch trainer upgrades for the current user', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user_id: 'test-uuid', existing: false }),
      });

      const upgradesPayload = {
        user_id: 'test-uuid',
        upgrades: { bag_slots: 2 },
      };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(upgradesPayload),
      });

      const result = await pokemonAPI.getUpgrades();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/player/upgrades?user_id=test-uuid'),
        expect.objectContaining({
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        })
      );
      expect(result).toEqual(upgradesPayload);
    });

    it('should purchase trainer upgrades for the current user', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user_id: 'test-uuid', existing: false }),
      });

      const upgradePayload = {
        success: true,
        upgrade_id: 'bag_slots',
        current_level: 1,
        next_level: 2,
        total_cost: 180,
        wallet: { user_id: 'test-uuid', coins: 120, shards: 0 },
        upgrade: { upgrade_id: 'bag_slots', level: 2 },
      };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(upgradePayload),
      });

      const result = await pokemonAPI.purchaseUpgrade('bag_slots');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/upgrades/purchase'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            upgrade_id: 'bag_slots',
            user_id: 'test-uuid',
          }),
        })
      );
      expect(result).toEqual(upgradePayload);
    });

    it('should fetch owned cosmetics for the current user', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user_id: 'test-uuid', existing: false }),
      });

      const cosmeticsPayload = {
        user_id: 'test-uuid',
        cosmetics: [{ cosmetic_id: 'trainer_card_bronze', equipped: false }],
      };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(cosmeticsPayload),
      });

      const result = await pokemonAPI.getCosmetics();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/player/cosmetics?user_id=test-uuid'),
        expect.objectContaining({
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        })
      );
      expect(result).toEqual(cosmeticsPayload);
    });

    it('should purchase cosmetics for the current user', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user_id: 'test-uuid', existing: false }),
      });

      const cosmeticPayload = {
        success: true,
        cosmetic_id: 'trainer_card_bronze',
        total_cost: 120,
        currency: 'coins',
        wallet: { user_id: 'test-uuid', coins: 30, shards: 0 },
        cosmetic: { cosmetic_id: 'trainer_card_bronze', equipped: false },
      };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(cosmeticPayload),
      });

      const result = await pokemonAPI.purchaseCosmetic('trainer_card_bronze');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/cosmetics/purchase'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            cosmetic_id: 'trainer_card_bronze',
            user_id: 'test-uuid',
          }),
        })
      );
      expect(result).toEqual(cosmeticPayload);
    });

    it('should equip cosmetics for the current user', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user_id: 'test-uuid', existing: false }),
      });

      const equipPayload = {
        success: true,
        cosmetic_id: 'trainer_card_bronze',
        slot: 'trainer_card',
        cosmetic: { cosmetic_id: 'trainer_card_bronze', equipped: true },
      };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(equipPayload),
      });

      const result = await pokemonAPI.equipCosmetic('trainer_card_bronze');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/cosmetics/equip'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            cosmetic_id: 'trainer_card_bronze',
            user_id: 'test-uuid',
          }),
        })
      );
      expect(result).toEqual(equipPayload);
    });

    it('should fetch achievements for the current user', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user_id: 'test-uuid', existing: false }),
      });

      const achievementsPayload = {
        user_id: 'test-uuid',
        achievements: [{ achievement_id: 'collect_10', claimable: true }],
      };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(achievementsPayload),
      });

      const result = await pokemonAPI.getAchievements();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/player/achievements?user_id=test-uuid'),
        expect.objectContaining({
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        })
      );
      expect(result).toEqual(achievementsPayload);
    });

    it('should claim achievements for the current user', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user_id: 'test-uuid', existing: false }),
      });

      const claimPayload = {
        success: true,
        achievement_id: 'collect_10',
        reward: { coins: 75, shards: 0 },
        wallet: { user_id: 'test-uuid', coins: 85, shards: 0 },
      };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(claimPayload),
      });

      const result = await pokemonAPI.claimAchievement('collect_10');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/achievements/claim'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            achievement_id: 'collect_10',
            user_id: 'test-uuid',
          }),
        })
      );
      expect(result).toEqual(claimPayload);
    });
  });

  describe('Co-op Raid Endpoints', () => {
    it('should create a co-op raid room with living team power', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user_id: 'test-uuid', existing: false }),
      });

      const raidPayload = { raid: { id: 'raid-1' }, participants: [], ready: false };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(raidPayload),
      });

      const result = await pokemonAPI.createCoopRaid([
        { pokemon_id: 'p1', power_level: 40, currentHP: 100 },
        { pokemon_id: 'p2', power_level: 30, currentHP: 0 },
      ], 2);

      const call = fetch.mock.calls.find(([url]) => url.includes('/api/coop-raids'));
      expect(call).toBeDefined();
      expect(call[1]).toEqual(expect.objectContaining({ method: 'POST' }));
      expect(JSON.parse(call[1].body)).toEqual({
        user_id: 'test-uuid',
        team_power: 40,
        level: 2,
      });
      expect(result).toEqual(raidPayload);
    });

    it('should join a co-op raid room with current team power', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user_id: 'test-uuid', existing: false }),
      });

      const raidPayload = { raid: { id: 'raid-1' }, participants: [], ready: true };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(raidPayload),
      });

      const result = await pokemonAPI.joinCoopRaid('raid-1', [
        { pokemon_id: 'p1', power_level: 55, currentHP: 80 },
      ]);

      const call = fetch.mock.calls.find(([url]) => url.includes('/api/coop-raids/raid-1/join'));
      expect(call).toBeDefined();
      expect(call[1]).toEqual(expect.objectContaining({ method: 'POST' }));
      expect(JSON.parse(call[1].body)).toEqual({
        user_id: 'test-uuid',
        team_power: 55,
      });
      expect(result).toEqual(raidPayload);
    });

    it('should record a co-op raid attack attempt', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user_id: 'test-uuid', existing: false }),
      });

      const attackPayload = {
        raid: { id: 'raid-1', current_hp: 90, status: 'in_progress' },
        attempt: { status: 'in_progress', outcome: null },
      };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(attackPayload),
      });

      const result = await pokemonAPI.attackCoopRaid('raid-1', 90);

      const call = fetch.mock.calls.find(([url]) => url.includes('/api/coop-raids/raid-1/attack'));
      expect(call).toBeDefined();
      expect(call[1]).toEqual(expect.objectContaining({ method: 'POST' }));
      expect(JSON.parse(call[1].body)).toEqual({
        user_id: 'test-uuid',
        damage_dealt: 90,
      });
      expect(result).toEqual(attackPayload);
    });
  });

  describe('Trading Endpoints', () => {
    it('should fetch pending trade offers for the current user', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user_id: 'test-uuid', existing: false }),
      });

      const offersPayload = {
        incoming: [{ id: 'trade-in', status: 'pending' }],
        outgoing: [{ id: 'trade-out', status: 'pending' }],
      };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(offersPayload),
      });

      const result = await pokemonAPI.listTradeOffers();

      expect(result).toEqual(offersPayload);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/trades?user_id=test-uuid'),
        expect.any(Object),
      );
    });

    it('should create a trade offer for the current user', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user_id: 'test-uuid', existing: false }),
      });

      const tradePayload = { id: 'trade-1', status: 'pending' };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(tradePayload),
      });

      const result = await pokemonAPI.createTradeOffer({
        toUserId: 'player-2',
        offeredCaughtId: 'caught-1',
        requestedCaughtId: 'caught-3',
      });

      const call = fetch.mock.calls.find(([url]) => url.includes('/api/trades'));
      expect(call).toBeDefined();
      expect(call[1]).toEqual(expect.objectContaining({ method: 'POST' }));
      expect(JSON.parse(call[1].body)).toEqual({
        user_id: 'test-uuid',
        to_user_id: 'player-2',
        offered_caught_id: 'caught-1',
        requested_caught_id: 'caught-3',
      });
      expect(result).toEqual(tradePayload);
    });

    it('should accept a pending trade offer for the current user', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user_id: 'test-uuid', existing: false }),
      });

      const tradePayload = { id: 'trade-1', status: 'complete' };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(tradePayload),
      });

      const result = await pokemonAPI.acceptTradeOffer('trade-1');

      const call = fetch.mock.calls.find(([url]) => url.includes('/api/trades/trade-1/accept'));
      expect(call).toBeDefined();
      expect(call[1]).toEqual(expect.objectContaining({ method: 'POST' }));
      expect(JSON.parse(call[1].body)).toEqual({ user_id: 'test-uuid' });
      expect(result).toEqual(tradePayload);
    });

    it('should cancel an outgoing trade offer for the current user', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user_id: 'test-uuid', existing: false }),
      });

      const tradePayload = { id: 'trade-1', status: 'cancelled' };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(tradePayload),
      });

      const result = await pokemonAPI.cancelTradeOffer('trade-1');

      const call = fetch.mock.calls.find(([url]) => url.includes('/api/trades/trade-1/cancel'));
      expect(call).toBeDefined();
      expect(call[1]).toEqual(expect.objectContaining({ method: 'POST' }));
      expect(JSON.parse(call[1].body)).toEqual({ user_id: 'test-uuid' });
      expect(result).toEqual(tradePayload);
    });

    it('should decline an incoming trade offer for the current user', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user_id: 'test-uuid', existing: false }),
      });

      const tradePayload = { id: 'trade-1', status: 'declined' };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(tradePayload),
      });

      const result = await pokemonAPI.declineTradeOffer('trade-1');

      const call = fetch.mock.calls.find(([url]) => url.includes('/api/trades/trade-1/decline'));
      expect(call).toBeDefined();
      expect(call[1]).toEqual(expect.objectContaining({ method: 'POST' }));
      expect(JSON.parse(call[1].body)).toEqual({ user_id: 'test-uuid' });
      expect(result).toEqual(tradePayload);
    });
  });

  describe('Evolution Endpoints', () => {
    it('should fetch evolution options', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user_id: 'test-uuid', existing: false }),
      });

      const mockOptions = [{ caught_id: 'c1', can_evolve: true }];
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockOptions),
      });

      const result = await pokemonAPI.getEvolutionOptions();

      expect(result).toEqual(mockOptions);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/evolution/options?user_id='),
        expect.any(Object)
      );
    });

    it('should evolve a pokemon', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user_id: 'test-uuid', existing: false }),
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await pokemonAPI.evolvePokemon('c1');

      const call = fetch.mock.calls.find(([url]) => url.includes('/api/evolution/evolve'));
      expect(call).toBeDefined();
      expect(call[1]).toEqual(expect.objectContaining({ method: 'POST' }));
      const body = JSON.parse(call[1].body);
      expect(body).toMatchObject({ user_id: 'test-uuid', caught_id: 'c1' });
    });
  });

  describe('Weekly Missions Endpoints', () => {
    it('should fetch weekly missions', async () => {
            fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user_id: 'test-uuid', existing: false }),
      });

fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ week_key: '2026-W34', missions: [] }),
      });

      await pokemonAPI.getWeeklyMissions();

      const call = fetch.mock.calls.find(([url]) => url.includes('/api/weekly-missions?'));
      expect(call).toBeDefined();
      expect(call[0]).toContain('user_id=test-uuid');
    });

    it('should post weekly mission progress events', async () => {
            fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user_id: 'test-uuid', existing: false }),
      });

fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await pokemonAPI.progressWeeklyMissions('catches', 3);

      const call = fetch.mock.calls.find(([url]) => url.includes('/api/weekly-missions/progress'));
      expect(call[1]).toEqual(expect.objectContaining({ method: 'POST' }));
      expect(JSON.parse(call[1].body)).toMatchObject({ event: 'catches', amount: 3, user_id: 'test-uuid' });
    });

    it('should claim all weekly missions', async () => {
            fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user_id: 'test-uuid', existing: false }),
      });

fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ totalXp: 100 }),
      });

      await pokemonAPI.claimAllWeeklyMissions();

      const call = fetch.mock.calls.find(([url]) => url.includes('/api/weekly-missions/claim-all'));
      expect(call[1]).toEqual(expect.objectContaining({ method: 'POST' }));
      expect(JSON.parse(call[1].body)).toMatchObject({ user_id: 'test-uuid' });
    });
  });

  describe('Collection Mastery Endpoints', () => {
    it('should fetch mastery status', async () => {
            fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user_id: 'test-uuid', existing: false }),
      });

fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ caught_count: 12, tiers: [] }),
      });

      await pokemonAPI.getMasteryStatus();

      const call = fetch.mock.calls.find(([url]) => url.includes('/api/mastery?'));
      expect(call).toBeDefined();
      expect(call[0]).toContain('user_id=test-uuid');
    });

    it('should claim a mastery tier', async () => {
            fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user_id: 'test-uuid', existing: false }),
      });

fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ tier: { id: 'silver' }, wallet: { coins: 100 } }),
      });

      await pokemonAPI.claimMasteryTier('silver');

      const call = fetch.mock.calls.find(([url]) => url.includes('/api/mastery/claim'));
      expect(call[1]).toEqual(expect.objectContaining({ method: 'POST' }));
      expect(JSON.parse(call[1].body)).toMatchObject({ tier_id: 'silver', user_id: 'test-uuid' });
    });
  });

});
