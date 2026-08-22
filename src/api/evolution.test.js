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

describe('Evolution API client', () => {
  it('fetches evolution options for the current trainer', async () => {
    const options = [{ from: 'caterpie', to: 'metapod', level_required: 2 }];
    mockUserAndData(options);

    const result = await pokemonAPI.getEvolutionOptions();

    expect(result).toEqual(options);
    const call = fetch.mock.calls.find(([url]) => url.includes('/api/evolution/options?'));
    expect(call[0]).toContain('user_id=test-uuid');
  });

  it('evolves a caught Pokemon and returns updated data', async () => {
    mockUserAndData({ success: true, evolved_to: { id: 'metapod' } });

    await pokemonAPI.evolvePokemon('caught-1');

    const call = fetch.mock.calls.find(([url]) => url.includes('/api/evolution/evolve'));
    expect(call[1]).toEqual(expect.objectContaining({ method: 'POST' }));
    expect(JSON.parse(call[1].body)).toMatchObject({ caught_id: 'caught-1', user_id: 'test-uuid' });
  });

  it('propagates API errors from evolution endpoints', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ user_id: 'test-uuid', existing: true }),
    });
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'not eligible yet' }),
    });

    await expect(pokemonAPI.evolvePokemon('caught-1')).rejects.toThrow('not eligible yet');
  });
});
