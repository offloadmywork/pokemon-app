import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { pokemonAPI } from './client';

// Daily Quests API tests

const originalFetch = global.fetch;
const originalLocalStorage = global.localStorage;

const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value; }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

describe('Daily Quests API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    pokemonAPI.userId = 'test-user';
    global.localStorage = localStorageMock;
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    global.localStorage = originalLocalStorage;
  });

  it('fetches daily quest list for the current user', async () => {
    const quests = [{ id: 'q1', title: 'Catch 1', progress: 0, target: 1 }];
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => quests,
    });

    const result = await pokemonAPI.getDailyQuests();

    expect(result).toEqual(quests);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/quests/daily?user_id=test-user'),
      expect.any(Object)
    );
  });

  it('returns quest progress + rewards', async () => {
    const quests = [{
      id: 'q1',
      title: 'Win 3 battles',
      progress: 2,
      target: 3,
      reward_xp: 50,
      reward_item_id: 'potion',
      reward_item_quantity: 1,
    }];
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => quests,
    });

    const result = await pokemonAPI.getDailyQuests();

    expect(result[0]).toMatchObject({
      progress: 2,
      target: 3,
      reward_xp: 50,
      reward_item_id: 'potion',
      reward_item_quantity: 1,
    });
  });

  it('claims a completed quest reward', async () => {
    const claimed = { id: 'q1', claimed_at: '2026-02-27T00:00:00Z' };
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => claimed,
    });

    const result = await pokemonAPI.claimDailyQuest('q1');

    expect(result).toEqual(claimed);
    const fetchCall = global.fetch.mock.calls[0];
    expect(fetchCall[0]).toContain('/api/quests/daily/q1/claim');
    expect(JSON.parse(fetchCall[1].body)).toEqual({ user_id: 'test-user' });
  });

  it('rejects claim for incomplete quest', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Quest not complete' }),
    });

    await expect(pokemonAPI.claimDailyQuest('q1')).rejects.toThrow('Quest not complete');
  });

  it('handles API errors gracefully', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => { throw new Error('Invalid JSON'); },
    });

    await expect(pokemonAPI.getDailyQuests()).rejects.toThrow('Request failed');
  });
});
