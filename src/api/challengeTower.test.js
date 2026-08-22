import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pokemonAPI } from './client';

beforeEach(() => {
  vi.resetAllMocks();
  global.fetch = vi.fn();
  global.localStorage = (() => {
    const store = {};
    return {
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => { store[k] = v; },
      removeItem: (k) => { delete store[k]; },
      clear: () => { Object.keys(store).forEach((key) => delete store[key]); },
    };
  })();
  localStorage.clear();
  pokemonAPI.userId = null;
  vi.stubGlobal('crypto', { ...crypto, randomUUID: vi.fn(() => 'test-uuid') });
});

function mockUserAndData(data) {
  fetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ user_id: 'test-uuid', existing: true }),
  });
  fetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(data),
  });
}

describe('Challenge Tower API client', () => {
  it('fetches current tower state for the current user', async () => {
    const towerState = { progress: { current_floor: 3, best_floor: 4 }, floors: [] };
    mockUserAndData(towerState);

    const result = await pokemonAPI.getChallengeTower();

    expect(result).toEqual(towerState);
    const call = fetch.mock.calls.find(([url]) => url.includes('/api/tower?'));
    expect(call[0]).toContain('user_id=test-uuid');
  });

  it('submits a completed floor result', async () => {
    mockUserAndData({ progress: { current_floor: 4 } });

    await pokemonAPI.completeChallengeTowerFloor(3);

    const call = fetch.mock.calls.find(([url]) => url.includes('/api/tower/complete'));
    expect(call[1]).toEqual(expect.objectContaining({ method: 'POST' }));
    expect(JSON.parse(call[1].body)).toMatchObject({ floor: 3, user_id: 'test-uuid' });
  });

  it('propagates API errors from tower endpoints', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ user_id: 'test-uuid', existing: true }),
    });
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'tower unavailable' }),
    });

    await expect(pokemonAPI.completeChallengeTowerFloor(2)).rejects.toThrow('tower unavailable');
  });
});
