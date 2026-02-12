import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pokemonAPI } from './client';

describe('Pokemon API Client', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
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
      const mockCaught = [{ id: 1, pokemon_id: 1, nickname: 'Sparky' }];
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCaught),
      });

      const result = await pokemonAPI.getCaughtPokemon();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/caught'),
        expect.any(Object)
      );
      expect(result).toEqual(mockCaught);
    });

    it('should catch a pokemon without nickname', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await pokemonAPI.catchPokemon(1);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/caught'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ pokemon_id: 1, nickname: null }),
        })
      );
    });

    it('should catch a pokemon with nickname', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await pokemonAPI.catchPokemon(1, 'Sparky');

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ pokemon_id: 1, nickname: 'Sparky' }),
        })
      );
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

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/starter/claim'),
        expect.objectContaining({
          method: 'POST',
        })
      );
      expect(result).toEqual(mockStarters);
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
});
