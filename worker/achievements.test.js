import { describe, expect, it, vi } from 'vitest';
import app from './index';

function createDbMock({
  walletRows = [],
  caughtRows = [],
  achievementRows = [],
} = {}) {
  const calls = [];
  const db = {
    prepare: vi.fn((sql) => ({
      bind: vi.fn((...params) => ({
        run: vi.fn(async () => {
          calls.push({ type: 'run', sql, params });
          return { success: true };
        }),
        all: vi.fn(async () => {
          calls.push({ type: 'all', sql, params });
          if (sql.includes('FROM player_wallet')) {
            return { results: walletRows };
          }
          if (sql.includes('FROM caught_pokemon')) {
            return { results: caughtRows };
          }
          if (sql.includes('FROM user_achievements')) {
            return { results: achievementRows };
          }
          return { results: [] };
        }),
      })),
    })),
  };

  return { db, calls };
}

describe('Achievement Worker API', () => {
  it('lists collection achievement milestones with claimed and claimable state', async () => {
    const { db, calls } = createDbMock({
      caughtRows: [{ caught_count: 26 }],
      achievementRows: [{ achievement_id: 'collect_10', claimed_at: '2026-07-07T00:00:00Z' }],
    });

    const response = await app.request('/api/player/achievements?user_id=user-1', {
      method: 'GET',
    }, { DB: db });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      user_id: 'user-1',
      progress: { collection: 26 },
      achievements: [
        { achievement_id: 'collect_10', claimed: true, claimable: false, progress: 26 },
        { achievement_id: 'collect_25', claimed: false, claimable: true, progress: 26 },
        { achievement_id: 'collect_50', claimed: false, claimable: false, progress: 26 },
      ],
    });
    expect(calls).toContainEqual(expect.objectContaining({
      type: 'all',
      sql: expect.stringContaining('COUNT(DISTINCT pokemon_id) AS caught_count'),
      params: ['user-1'],
    }));
    expect(calls).toContainEqual(expect.objectContaining({
      type: 'all',
      sql: expect.stringContaining('FROM user_achievements'),
      params: ['user-1'],
    }));
  });

  it('claims a reached achievement once and persists wallet rewards', async () => {
    const { db, calls } = createDbMock({
      walletRows: [{ user_id: 'user-1', coins: 10, shards: 0 }],
      caughtRows: [{ caught_count: 25 }],
      achievementRows: [],
    });

    const response = await app.request('/api/achievements/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'user-1', achievement_id: 'collect_25' }),
    }, { DB: db });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      achievement_id: 'collect_25',
      reward: { coins: 150, shards: 1 },
      wallet: { user_id: 'user-1', coins: 160, shards: 1 },
    });
    expect(calls).toContainEqual(expect.objectContaining({
      type: 'run',
      sql: expect.stringContaining('INSERT INTO player_wallet'),
      params: ['user-1', 160, 1],
    }));
    expect(calls).toContainEqual(expect.objectContaining({
      type: 'run',
      sql: expect.stringContaining('INSERT INTO user_achievements'),
      params: ['user-1', 'collect_25'],
    }));
  });

  it('rejects unreached or already claimed achievements without mutating wallet', async () => {
    const unreached = createDbMock({
      walletRows: [{ user_id: 'user-1', coins: 10, shards: 0 }],
      caughtRows: [{ caught_count: 9 }],
      achievementRows: [],
    });

    const unreachedResponse = await app.request('/api/achievements/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'user-1', achievement_id: 'collect_10' }),
    }, { DB: unreached.db });

    expect(unreachedResponse.status).toBe(400);
    await expect(unreachedResponse.json()).resolves.toEqual({ error: 'Achievement is not complete yet.' });
    expect(unreached.calls.some((call) => call.type === 'run' && call.sql.includes('player_wallet'))).toBe(false);

    const alreadyClaimed = createDbMock({
      walletRows: [{ user_id: 'user-1', coins: 10, shards: 0 }],
      caughtRows: [{ caught_count: 50 }],
      achievementRows: [{ achievement_id: 'collect_10', claimed_at: '2026-07-07T00:00:00Z' }],
    });

    const alreadyClaimedResponse = await app.request('/api/achievements/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'user-1', achievement_id: 'collect_10' }),
    }, { DB: alreadyClaimed.db });

    expect(alreadyClaimedResponse.status).toBe(400);
    await expect(alreadyClaimedResponse.json()).resolves.toEqual({ error: 'Achievement already claimed.' });
    expect(alreadyClaimed.calls.some((call) => call.type === 'run' && call.sql.includes('player_wallet'))).toBe(false);
  });
});
