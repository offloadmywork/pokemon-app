import { describe, expect, it, vi } from 'vitest';
import app from './index';
import { sessionAuthHeader, sessionEnv } from './testSessionAuth';

function createDbMock({
  walletRows = [],
  itemRows = [],
  upgradeRows = [],
  cosmeticRows = [],
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
          if (sql.includes('FROM user_items')) {
            return { results: itemRows };
          }
          if (sql.includes('FROM user_upgrades')) {
            return { results: upgradeRows };
          }
          if (sql.includes('FROM user_cosmetics')) {
            return { results: cosmeticRows };
          }
          return { results: [] };
        }),
      })),
    })),
  };

  return { db, calls };
}

describe('Shop Worker API', () => {
  it('persists an affordable shop purchase to wallet and inventory', async () => {
    const { db, calls } = createDbMock({
      walletRows: [{ user_id: 'user-1', coins: 100, shards: 0 }],
      itemRows: [{ id: 'item-row-1', item_id: 'pokeball', quantity: 1 }],
    });

    const response = await app.request('/api/shop/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await sessionAuthHeader('user-1')) },
      body: JSON.stringify({ user_id: 'user-1', item_id: 'pokeball', quantity: 2 }),
    }, sessionEnv(db));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      item_id: 'pokeball',
      quantity: 2,
      total_cost: 20,
      wallet: { user_id: 'user-1', coins: 80, shards: 0 },
      item: { item_id: 'pokeball', quantity: 3 },
    });
    expect(calls).toContainEqual(expect.objectContaining({
      type: 'all',
      sql: expect.stringContaining('FROM player_wallet'),
      params: ['user-1'],
    }));
    expect(calls).toContainEqual(expect.objectContaining({
      type: 'all',
      sql: expect.stringContaining('FROM user_items'),
      params: ['user-1', 'pokeball'],
    }));
    expect(calls).toContainEqual(expect.objectContaining({
      type: 'run',
      sql: expect.stringContaining('UPDATE player_wallet'),
      params: [80, 0, 'user-1'],
    }));
    expect(calls).toContainEqual(expect.objectContaining({
      type: 'run',
      sql: expect.stringContaining('UPDATE user_items'),
      params: [3, 'item-row-1'],
    }));
  });

  it('rejects unaffordable shop purchases without mutating wallet or inventory', async () => {
    const { db, calls } = createDbMock({
      walletRows: [{ user_id: 'user-1', coins: 15, shards: 0 }],
      itemRows: [{ id: 'item-row-1', item_id: 'ultra_ball', quantity: 0 }],
    });

    const response = await app.request('/api/shop/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await sessionAuthHeader('user-1')) },
      body: JSON.stringify({ user_id: 'user-1', item_id: 'ultra_ball', quantity: 1 }),
    }, sessionEnv(db));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Not enough coins.' });
    expect(calls.some((call) => call.type === 'run' && call.sql.includes('player_wallet'))).toBe(false);
    expect(calls.some((call) => call.type === 'run' && call.sql.includes('user_items'))).toBe(false);
  });

  it('returns persisted trainer upgrade levels for the current user', async () => {
    const { db, calls } = createDbMock({
      upgradeRows: [
        { upgrade_id: 'bag_slots', level: 2 },
        { upgrade_id: 'daily_task_slot', level: 1 },
      ],
    });

    const response = await app.request('/api/player/upgrades?user_id=user-1', {
      method: 'GET',
    }, sessionEnv(db));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      user_id: 'user-1',
      upgrades: {
        bag_slots: 2,
        daily_task_slot: 1,
      },
    });
    expect(calls).toContainEqual(expect.objectContaining({
      type: 'all',
      sql: expect.stringContaining('FROM user_upgrades'),
      params: ['user-1'],
    }));
  });

  it('persists an affordable trainer upgrade purchase to wallet and upgrade level', async () => {
    const { db, calls } = createDbMock({
      walletRows: [{ user_id: 'user-1', coins: 300, shards: 0 }],
      upgradeRows: [{ upgrade_id: 'bag_slots', level: 1 }],
    });

    const response = await app.request('/api/upgrades/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await sessionAuthHeader('user-1')) },
      body: JSON.stringify({ user_id: 'user-1', upgrade_id: 'bag_slots' }),
    }, sessionEnv(db));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      upgrade_id: 'bag_slots',
      current_level: 1,
      next_level: 2,
      total_cost: 180,
      wallet: { user_id: 'user-1', coins: 120, shards: 0 },
      upgrade: { upgrade_id: 'bag_slots', level: 2 },
    });
    expect(calls).toContainEqual(expect.objectContaining({
      type: 'run',
      sql: expect.stringContaining('UPDATE player_wallet'),
      params: [120, 0, 'user-1'],
    }));
    expect(calls).toContainEqual(expect.objectContaining({
      type: 'run',
      sql: expect.stringContaining('UPDATE user_upgrades'),
      params: [2, 'user-1', 'bag_slots'],
    }));
  });

  it('rejects maxed trainer upgrades without mutating wallet or upgrade level', async () => {
    const { db, calls } = createDbMock({
      walletRows: [{ user_id: 'user-1', coins: 1000, shards: 0 }],
      upgradeRows: [{ upgrade_id: 'bag_slots', level: 5 }],
    });

    const response = await app.request('/api/upgrades/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await sessionAuthHeader('user-1')) },
      body: JSON.stringify({ user_id: 'user-1', upgrade_id: 'bag_slots' }),
    }, sessionEnv(db));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Upgrade already maxed.' });
    expect(calls.some((call) => call.type === 'run' && call.sql.includes('player_wallet'))).toBe(false);
    expect(calls.some((call) => call.type === 'run' && call.sql.includes('user_upgrades'))).toBe(false);
  });

  it('returns persisted owned cosmetics for the current user', async () => {
    const { db, calls } = createDbMock({
      cosmeticRows: [
        { cosmetic_id: 'trainer_card_bronze', equipped: 1 },
        { cosmetic_id: 'premier_ball_skin', equipped: 0 },
      ],
    });

    const response = await app.request('/api/player/cosmetics?user_id=user-1', {
      method: 'GET',
    }, sessionEnv(db));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      user_id: 'user-1',
      cosmetics: [
        { cosmetic_id: 'trainer_card_bronze', equipped: true },
        { cosmetic_id: 'premier_ball_skin', equipped: false },
      ],
    });
    expect(calls).toContainEqual(expect.objectContaining({
      type: 'all',
      sql: expect.stringContaining('FROM user_cosmetics'),
      params: ['user-1'],
    }));
  });

  it('persists an affordable cosmetic purchase to wallet and owned cosmetics', async () => {
    const { db, calls } = createDbMock({
      walletRows: [{ user_id: 'user-1', coins: 150, shards: 0 }],
      cosmeticRows: [],
    });

    const response = await app.request('/api/cosmetics/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await sessionAuthHeader('user-1')) },
      body: JSON.stringify({ user_id: 'user-1', cosmetic_id: 'trainer_card_bronze' }),
    }, sessionEnv(db));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      cosmetic_id: 'trainer_card_bronze',
      total_cost: 120,
      currency: 'coins',
      wallet: { user_id: 'user-1', coins: 30, shards: 0 },
      cosmetic: { cosmetic_id: 'trainer_card_bronze', equipped: false },
    });
    expect(calls).toContainEqual(expect.objectContaining({
      type: 'run',
      sql: expect.stringContaining('UPDATE player_wallet'),
      params: [30, 0, 'user-1'],
    }));
    expect(calls).toContainEqual(expect.objectContaining({
      type: 'run',
      sql: expect.stringContaining('INSERT INTO user_cosmetics'),
      params: ['user-1', 'trainer_card_bronze', 0],
    }));
  });

  it('rejects already-owned cosmetics without mutating wallet or owned cosmetics', async () => {
    const { db, calls } = createDbMock({
      walletRows: [{ user_id: 'user-1', coins: 150, shards: 0 }],
      cosmeticRows: [{ cosmetic_id: 'trainer_card_bronze', equipped: 0 }],
    });

    const response = await app.request('/api/cosmetics/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await sessionAuthHeader('user-1')) },
      body: JSON.stringify({ user_id: 'user-1', cosmetic_id: 'trainer_card_bronze' }),
    }, sessionEnv(db));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Cosmetic already owned.' });
    expect(calls.some((call) => call.type === 'run' && call.sql.includes('player_wallet'))).toBe(false);
    expect(calls.some((call) => call.type === 'run' && call.sql.includes('user_cosmetics'))).toBe(false);
  });

  it('equips an owned cosmetic and unequips cosmetics in the same slot', async () => {
    const { db, calls } = createDbMock({
      cosmeticRows: [
        { cosmetic_id: 'trainer_card_bronze', equipped: 0 },
      ],
    });

    const response = await app.request('/api/cosmetics/equip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await sessionAuthHeader('user-1')) },
      body: JSON.stringify({ user_id: 'user-1', cosmetic_id: 'trainer_card_bronze' }),
    }, sessionEnv(db));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      cosmetic_id: 'trainer_card_bronze',
      slot: 'trainer_card',
      cosmetic: { cosmetic_id: 'trainer_card_bronze', equipped: true },
    });
    expect(calls).toContainEqual(expect.objectContaining({
      type: 'run',
      sql: expect.stringContaining('UPDATE user_cosmetics'),
      params: ['user-1', 'trainer_card_bronze'],
    }));
    expect(calls).toContainEqual(expect.objectContaining({
      type: 'run',
      sql: expect.stringContaining('equipped = 1'),
      params: ['user-1', 'trainer_card_bronze'],
    }));
  });

  it('rejects equipping cosmetics the user does not own', async () => {
    const { db, calls } = createDbMock({
      cosmeticRows: [],
    });

    const response = await app.request('/api/cosmetics/equip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await sessionAuthHeader('user-1')) },
      body: JSON.stringify({ user_id: 'user-1', cosmetic_id: 'trainer_card_bronze' }),
    }, sessionEnv(db));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Cosmetic is not owned.' });
    expect(calls.some((call) => call.type === 'run' && call.sql.includes('UPDATE user_cosmetics'))).toBe(false);
  });
});

describe('Shop session enforcement', () => {
  it('rejects purchases without a valid session token', async () => {
    const { db } = createDbMock({ walletRows: [{ user_id: 'user-1', coins: 100, shards: 0 }] });
    const response = await app.request('/api/shop/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'user-1', item_id: 'pokeball', quantity: 1 }),
    }, { DB: db });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Valid session required' });
  });

  it('charges the wallet bound to the token, not the body user_id', async () => {
    const { db, calls } = createDbMock({ walletRows: [{ user_id: 'token-user', coins: 100, shards: 0 }] });
    const response = await app.request('/api/shop/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await sessionAuthHeader('token-user')) },
      // Body still claims user-1 — must be ignored.
      body: JSON.stringify({ user_id: 'user-1', item_id: 'pokeball', quantity: 1 }),
    }, sessionEnv(db));

    expect(response.status).toBe(200);
    const walletSelects = calls.filter(
      (call) => call.type === 'all' && call.sql.includes('FROM player_wallet')
    );
    expect(walletSelects.length).toBeGreaterThan(0);
    expect(walletSelects[0].params).toContain('token-user');
  });
});
