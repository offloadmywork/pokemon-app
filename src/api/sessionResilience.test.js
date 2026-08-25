import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { pokemonAPI } from './client';

// BDD: Session resilience — a stale or revoked session token should never
// wedge the client. A 401 triggers exactly one re-mint + retry.

const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value; }),
    removeItem: vi.fn((key) => { store[key] && delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

const originalFetch = global.fetch;

describe('API client session resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    global.localStorage = localStorageMock;
    global.fetch = vi.fn();
    pokemonAPI.userId = 'test-user';
    pokemonAPI.sessionToken = 'stale-token';
    pokemonAPI.needsSessionMint = false;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('re-mints the session and retries once after a 401', async () => {
    global.fetch
      // First attempt: stale token rejected.
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ error: 'Valid session required' }) })
      // Mint call succeeds with a fresh token.
      .mockResolvedValueOnce({ ok: true, json: async () => ({ token: 'fresh-token' }) })
      // Retry succeeds.
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 1 }) });

    const result = await pokemonAPI.request('/api/team');

    expect(result).toEqual({ id: 1 });
    expect(pokemonAPI.sessionToken).toBe('fresh-token');
    expect(global.fetch).toHaveBeenCalledTimes(3);
    const retryHeaders = global.fetch.mock.calls[2][1].headers;
    expect(retryHeaders.Authorization).toBe('Bearer fresh-token');
  });

  it('does not retry when no user identity is available to mint for', async () => {
    pokemonAPI.userId = null;
    global.fetch.mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: 'Valid session required' }) });

    await expect(pokemonAPI.request('/api/team')).rejects.toThrow('Valid session required');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('surfaces the error when the retry also fails with 401 (no loop)', async () => {
    global.fetch
      .mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: 'Valid session required' }) });
    // Mint fails too (server unreachable / not configured).
    pokemonAPI.mintSessionToken = vi.fn(async () => null);

    await expect(pokemonAPI.request('/api/team')).rejects.toThrow('Valid session required');
    // Original request only — no retry without a fresh token.
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
