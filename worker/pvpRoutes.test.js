import { describe, expect, it, vi } from 'vitest';
import app from './index';
import { sessionAuthHeader, sessionEnv } from './testSessionAuth';

function createDbMock({
  queueRows = [],
  matchRows = [],
  teamRows = [],
  progressRows = [],
  walletRows = [],
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
          if (sql.includes('FROM pvp_queue')) {
            return { results: queueRows };
          }
          if (sql.includes('FROM pvp_matches')) {
            return { results: matchRows };
          }
          if (sql.includes('FROM team')) {
            return { results: teamRows };
          }
          if (sql.includes('FROM player_progress')) {
            return { results: progressRows };
          }
          if (sql.includes('FROM player_wallet')) {
            return { results: walletRows };
          }
          return { results: [] };
        }),
      })),
    })),
  };

  return { db, calls };
}

describe('PvP Worker API', () => {
  it('returns PvP leaderboard entries ranked by recorded wins', async () => {
    const { db, calls } = createDbMock({
      matchRows: [
        { user_id: 'winner-2', wins: 3, losses: 1, draws: 2 },
        { user_id: 'winner-1', wins: 2, losses: 0, draws: 1 },
      ],
    });

    const response = await app.request('/api/leaderboards?key=pvp&limit=5', {
      method: 'GET',
    }, { DB: db, FEATURE_LEADERBOARDS: 'true' });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      key: 'pvp',
      entries: [
        { rank: 1, user_id: 'winner-2', score: 3, detail: { wins: 3, losses: 1, draws: 2 } },
        { rank: 2, user_id: 'winner-1', score: 2, detail: { wins: 2, losses: 0, draws: 1 } },
      ],
    });
    expect(calls).toContainEqual(expect.objectContaining({
      type: 'all',
      sql: expect.stringContaining('pvp_participants'),
      params: [5],
    }));
  });

  it('returns the current player wallet for persisted PvP coin rewards', async () => {
    const { db, calls } = createDbMock({
      walletRows: [{ user_id: 'user-1', coins: 50, shards: 0 }],
    });

    const response = await app.request('/api/player/wallet?user_id=user-1', {
      method: 'GET',
    }, { DB: db });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      user_id: 'user-1',
      coins: 50,
      shards: 0,
    });
    expect(calls).toContainEqual(expect.objectContaining({
      type: 'all',
      sql: expect.stringContaining('FROM player_wallet'),
      params: ['user-1'],
    }));
  });

  it('joins the PvP queue and returns a matched fair opponent', async () => {
    const { db, calls } = createDbMock({
      queueRows: [{ user_id: 'opponent-1', team_power: 88, queued_at: '2026-07-05T03:00:00Z' }],
      teamRows: [{
        pokemon_id: 'o1',
        name: 'Squirtle',
        type: 'Water',
        power_level: 88,
        rarity: 'Common',
        currentHP: 40,
        maxHP: 120,
        position: 0,
      }],
    });

    const response = await app.request('/api/pvp/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await sessionAuthHeader('user-1')) },
      body: JSON.stringify({ user_id: 'user-1', team_power: 80 }),
    }, sessionEnv(db));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      queued: false,
      matched: true,
      playerPower: 80,
      opponent: {
        user_id: 'opponent-1',
        team_power: 88,
        queued_at: '2026-07-05T03:00:00Z',
        team: [{
          pokemon_id: 'o1',
          name: 'Squirtle',
          type: 'Water',
          power_level: 88,
          rarity: 'Common',
          currentHP: 40,
          maxHP: 120,
          position: 0,
        }],
      },
    });
    expect(calls).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'run',
        sql: expect.stringContaining('INSERT INTO pvp_queue'),
        params: ['user-1', 80],
      }),
      expect.objectContaining({
        type: 'run',
        sql: expect.stringContaining('DELETE FROM pvp_queue'),
        params: ['user-1'],
      }),
      expect.objectContaining({
        type: 'run',
        sql: expect.stringContaining('DELETE FROM pvp_queue'),
        params: ['opponent-1'],
      }),
    ]));
  });

  it('keeps the player queued when no fair opponent exists', async () => {
    const { db } = createDbMock({ queueRows: [] });

    const response = await app.request('/api/pvp/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await sessionAuthHeader('user-1')) },
      body: JSON.stringify({ user_id: 'user-1', team_power: 80 }),
    }, sessionEnv(db));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      queued: true,
      matched: false,
      playerPower: 80,
      opponent: null,
    });
  });

  it('removes the current user from the PvP queue', async () => {
    const { db, calls } = createDbMock();

    const response = await app.request('/api/pvp/queue?user_id=user-1', {
      method: 'DELETE',
      headers: await sessionAuthHeader('user-1'),
    }, sessionEnv(db));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ queued: false });
    expect(calls).toContainEqual(expect.objectContaining({
      type: 'run',
      sql: expect.stringContaining('DELETE FROM pvp_queue'),
      params: ['user-1'],
    }));
  });

  it('submits a completed PvP match result', async () => {
    const { db, calls } = createDbMock({
      matchRows: [{
        id: 'match-1',
        player_user_id: 'user-1',
        opponent_user_id: 'opponent-1',
        outcome: 'win',
        winner_user_id: 'user-1',
        player_remaining_pokemon: 1,
        opponent_remaining_pokemon: 0,
        completed_at: '2026-07-05T04:30:00Z',
      }],
    });

    const response = await app.request('/api/pvp/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await sessionAuthHeader('user-1')) },
      body: JSON.stringify({
        user_id: 'user-1',
        opponent_user_id: 'opponent-1',
        player_team: [{ pokemon_id: 'p1', currentHP: 12 }],
        opponent_team: [{ pokemon_id: 'o1', currentHP: 0 }],
      }),
    }, sessionEnv(db));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      match: {
        id: 'match-1',
        player_user_id: 'user-1',
        opponent_user_id: 'opponent-1',
        outcome: 'win',
        winner_user_id: 'user-1',
        player_remaining_pokemon: 1,
        opponent_remaining_pokemon: 0,
        completed_at: '2026-07-05T04:30:00Z',
      },
      rewards: {
        xp: 50,
        coins: 20,
      },
      progress: {
        xp: 50,
        level: 1,
      },
      wallet: {
        coins: 20,
      },
    });
    expect(calls).toContainEqual(expect.objectContaining({
      type: 'run',
      sql: expect.stringContaining('INSERT INTO pvp_matches'),
      params: expect.arrayContaining(['user-1', 'opponent-1', 'win', 'user-1', 1, 0]),
    }));
  });

  it('applies the PvP XP reward to player progress after a completed match', async () => {
    const { db, calls } = createDbMock({
      matchRows: [{
        id: 'match-1',
        player_user_id: 'user-1',
        opponent_user_id: 'opponent-1',
        outcome: 'win',
        winner_user_id: 'user-1',
        player_remaining_pokemon: 1,
        opponent_remaining_pokemon: 0,
        completed_at: '2026-07-05T04:30:00Z',
      }],
      progressRows: [{ xp: 90, level: 1 }],
    });

    const response = await app.request('/api/pvp/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await sessionAuthHeader('user-1')) },
      body: JSON.stringify({
        user_id: 'user-1',
        opponent_user_id: 'opponent-1',
        player_team: [{ pokemon_id: 'p1', currentHP: 12 }],
        opponent_team: [{ pokemon_id: 'o1', currentHP: 0 }],
      }),
    }, sessionEnv(db));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(expect.objectContaining({
      rewards: { xp: 50, coins: 20 },
      progress: { xp: 140, level: 2 },
    }));
    expect(calls).toContainEqual(expect.objectContaining({
      type: 'all',
      sql: expect.stringContaining('FROM player_progress'),
      params: ['user-1'],
    }));
    expect(calls).toContainEqual(expect.objectContaining({
      type: 'run',
      sql: expect.stringContaining('UPDATE player_progress'),
      params: [140, 2, 'user-1'],
    }));
  });

  it('applies the PvP coin reward to the player wallet after a completed match', async () => {
    const { db, calls } = createDbMock({
      matchRows: [{
        id: 'match-1',
        player_user_id: 'user-1',
        opponent_user_id: 'opponent-1',
        outcome: 'win',
        winner_user_id: 'user-1',
        player_remaining_pokemon: 1,
        opponent_remaining_pokemon: 0,
        completed_at: '2026-07-05T04:30:00Z',
      }],
      walletRows: [{ coins: 30 }],
    });

    const response = await app.request('/api/pvp/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await sessionAuthHeader('user-1')) },
      body: JSON.stringify({
        user_id: 'user-1',
        opponent_user_id: 'opponent-1',
        player_team: [{ pokemon_id: 'p1', currentHP: 12 }],
        opponent_team: [{ pokemon_id: 'o1', currentHP: 0 }],
      }),
    }, sessionEnv(db));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(expect.objectContaining({
      rewards: { xp: 50, coins: 20 },
      wallet: { coins: 50 },
    }));
    expect(calls).toContainEqual(expect.objectContaining({
      type: 'all',
      sql: expect.stringContaining('FROM player_wallet'),
      params: ['user-1'],
    }));
    expect(calls).toContainEqual(expect.objectContaining({
      type: 'run',
      sql: expect.stringContaining('UPDATE player_wallet'),
      params: [50, 'user-1'],
    }));
  });

  it('returns recent PvP match history for the current user', async () => {
    const matchRows = [{
      id: 'match-1',
      player_user_id: 'user-1',
      opponent_user_id: 'opponent-1',
      outcome: 'win',
      winner_user_id: 'user-1',
      player_remaining_pokemon: 2,
      opponent_remaining_pokemon: 0,
      completed_at: '2026-07-05T04:30:00Z',
    }];
    const { db, calls } = createDbMock({ matchRows });

    const response = await app.request('/api/pvp/matches?user_id=user-1&limit=3', {
      method: 'GET',
    }, sessionEnv(db));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ matches: matchRows });
    expect(calls).toContainEqual(expect.objectContaining({
      type: 'all',
      sql: expect.stringContaining('FROM pvp_matches'),
      params: ['user-1', 'user-1', 3],
    }));
  });
});
