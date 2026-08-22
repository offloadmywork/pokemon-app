import { describe, expect, it, vi } from 'vitest';
import app from './index';

function createDbMock({
  raidRows = [],
  participantRows = [],
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
          if (sql.includes('FROM coop_raid_rooms')) {
            return { results: raidRows };
          }
          if (sql.includes('FROM coop_raid_participants')) {
            return { results: participantRows };
          }
          if (sql.includes('FROM player_progress')) {
            return { results: progressRows };
          }
          if (sql.includes('FROM player_wallet')) {
            return { results: walletRows };
          }
          if (sql.includes('FROM users')) {
            return { results: [] };
          }
          return { results: [] };
        }),
      })),
    })),
  };

  return { db, calls };
}

describe('Co-op raid Worker API', () => {
  it('creates a co-op raid room with the host participant', async () => {
    const { db, calls } = createDbMock();

    const response = await app.request('/api/coop-raids', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'user-1', team_power: 75, level: 1 }),
    }, { DB: db });

    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload).toEqual({
      raid: expect.objectContaining({
        id: expect.any(String),
        host_user_id: 'user-1',
        boss_id: 'verdant-titan',
        boss_name: 'Verdant Titan',
        level: 1,
        status: 'waiting',
      }),
      participants: [{
        raid_id: payload.raid.id,
        user_id: 'user-1',
        team_power: 75,
      }],
      ready: false,
    });
    expect(calls).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'run',
        sql: expect.stringContaining('INSERT INTO coop_raid_rooms'),
      }),
      expect.objectContaining({
        type: 'run',
        sql: expect.stringContaining('INSERT INTO coop_raid_participants'),
      }),
    ]));
  });

  it('joins a second trainer to a co-op raid room and marks it ready', async () => {
    const { db } = createDbMock({
      raidRows: [{
        id: 'raid-1',
        host_user_id: 'user-1',
        boss_id: 'verdant-titan',
        boss_name: 'Verdant Titan',
        level: 1,
        max_hp: 180,
        current_hp: 180,
        power: 70,
        reward_xp: 80,
        reward_coins: 30,
        status: 'waiting',
      }],
      participantRows: [
        { raid_id: 'raid-1', user_id: 'user-1', team_power: 75 },
        { raid_id: 'raid-1', user_id: 'user-2', team_power: 60 },
      ],
    });

    const response = await app.request('/api/coop-raids/raid-1/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'user-2', team_power: 60 }),
    }, { DB: db });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      raid: expect.objectContaining({ id: 'raid-1', status: 'waiting' }),
      participants: [
        { raid_id: 'raid-1', user_id: 'user-1', team_power: 75 },
        { raid_id: 'raid-1', user_id: 'user-2', team_power: 60 },
      ],
      ready: true,
    });
  });

  it('records a ready co-op raid attack attempt through the Worker API', async () => {
    const { db, calls } = createDbMock({
      raidRows: [{
        id: 'raid-1',
        host_user_id: 'user-1',
        boss_id: 'verdant-titan',
        boss_name: 'Verdant Titan',
        level: 1,
        max_hp: 180,
        current_hp: 180,
        power: 70,
        reward_xp: 80,
        reward_coins: 30,
        status: 'waiting',
      }],
      participantRows: [
        { raid_id: 'raid-1', user_id: 'user-1', team_power: 75 },
        { raid_id: 'raid-1', user_id: 'user-2', team_power: 60 },
      ],
    });

    const response = await app.request('/api/coop-raids/raid-1/attack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'user-1', damage_dealt: 90 }),
    }, { DB: db });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      raid: expect.objectContaining({ id: 'raid-1', current_hp: 90, status: 'in_progress' }),
      participants: [
        { raid_id: 'raid-1', user_id: 'user-1', team_power: 75 },
        { raid_id: 'raid-1', user_id: 'user-2', team_power: 60 },
      ],
      ready: true,
      attempt: expect.objectContaining({
        status: 'in_progress',
        outcome: null,
      }),
      rewards: [],
      progress: [],
      wallets: [],
    });
    expect(calls).toContainEqual(expect.objectContaining({
      type: 'run',
      sql: expect.stringContaining('UPDATE coop_raid_rooms'),
      params: [90, 'in_progress', 'raid-1'],
    }));
  });

  it('persists co-op raid victory rewards to each ready trainer progress and wallet', async () => {
    const { db, calls } = createDbMock({
      raidRows: [{
        id: 'raid-1',
        host_user_id: 'user-1',
        boss_id: 'verdant-titan',
        boss_name: 'Verdant Titan',
        level: 1,
        max_hp: 180,
        current_hp: 80,
        power: 70,
        reward_xp: 80,
        reward_coins: 30,
        status: 'in_progress',
      }],
      participantRows: [
        { raid_id: 'raid-1', user_id: 'user-1', team_power: 75 },
        { raid_id: 'raid-1', user_id: 'user-2', team_power: 60 },
      ],
      progressRows: [{ xp: 90, level: 1 }],
      walletRows: [{ coins: 20 }],
    });

    const response = await app.request('/api/coop-raids/raid-1/attack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'user-1', damage_dealt: 100 }),
    }, { DB: db });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(expect.objectContaining({
      raid: expect.objectContaining({ id: 'raid-1', current_hp: 0, status: 'complete' }),
      rewards: [
        { user_id: 'user-1', xp: 80, coins: 30 },
        { user_id: 'user-2', xp: 80, coins: 30 },
      ],
      progress: [
        { user_id: 'user-1', xp: 170, level: 2 },
        { user_id: 'user-2', xp: 170, level: 2 },
      ],
      wallets: [
        { user_id: 'user-1', coins: 50 },
        { user_id: 'user-2', coins: 50 },
      ],
    }));
    expect(calls).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'run',
        sql: expect.stringContaining('UPDATE player_progress'),
        params: [170, 2, 'user-1'],
      }),
      expect.objectContaining({
        type: 'run',
        sql: expect.stringContaining('UPDATE player_progress'),
        params: [170, 2, 'user-2'],
      }),
      expect.objectContaining({
        type: 'run',
        sql: expect.stringContaining('UPDATE player_wallet'),
        params: [50, 'user-1'],
      }),
      expect.objectContaining({
        type: 'run',
        sql: expect.stringContaining('UPDATE player_wallet'),
        params: [50, 'user-2'],
      }),
    ]));
  });

  it('rejects co-op raid attacks before two trainers are ready', async () => {
    const { db } = createDbMock({
      raidRows: [{
        id: 'raid-1',
        host_user_id: 'user-1',
        boss_id: 'verdant-titan',
        boss_name: 'Verdant Titan',
        level: 1,
        max_hp: 180,
        current_hp: 180,
        power: 70,
        reward_xp: 80,
        reward_coins: 30,
        status: 'waiting',
      }],
      participantRows: [
        { raid_id: 'raid-1', user_id: 'user-1', team_power: 75 },
      ],
    });

    const response = await app.request('/api/coop-raids/raid-1/attack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'user-1', damage_dealt: 90 }),
    }, { DB: db });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: 'Co-op raid needs at least two ready trainers before attacking',
    });
  });
});
