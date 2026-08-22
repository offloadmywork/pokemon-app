import { describe, expect, it, vi } from 'vitest';
import app from './index';

const pendingOffer = {
  id: 'trade-1',
  from_user_id: 'player-1',
  to_user_id: 'player-2',
  offered_caught_id: 'caught-1',
  requested_caught_id: 'caught-3',
  status: 'pending',
};

const caughtRows = [
  { id: 'caught-1', pokemon_id: 'bulbasaur', user_id: 'player-1', name: 'Bulbasaur' },
  { id: 'caught-3', pokemon_id: 'charmander', user_id: 'player-2', name: 'Charmander' },
];

function createDbMock({ offerRows = [], caughtPokemonRows = [] } = {}) {
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
          if (sql.includes('FROM trade_offers')) {
            if (sql.includes('AND to_user_id = ?')) {
              return { results: offerRows.filter((offer) => offer.status === params[0] && offer.to_user_id === params[1]) };
            }
            if (sql.includes('AND from_user_id = ?')) {
              return { results: offerRows.filter((offer) => offer.status === params[0] && offer.from_user_id === params[1]) };
            }
            return { results: offerRows };
          }
          if (sql.includes('FROM caught_pokemon')) {
            return { results: caughtPokemonRows };
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

describe('Trading Worker API', () => {
  it('creates a pending trade offer when both trainers own the selected caught Pokemon', async () => {
    const { db, calls } = createDbMock({
      offerRows: [pendingOffer],
      caughtPokemonRows: caughtRows,
    });

    const response = await app.request('/api/trades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: 'player-1',
        to_user_id: 'player-2',
        offered_caught_id: 'caught-1',
        requested_caught_id: 'caught-3',
      }),
    }, { DB: db });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual(pendingOffer);
    expect(calls).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'run',
        sql: expect.stringContaining('INSERT INTO trade_offers'),
      }),
    ]));
  });

  it('lists pending incoming and outgoing trade offers for the current trainer', async () => {
    const incomingOffer = { ...pendingOffer, id: 'trade-in', from_user_id: 'player-3', to_user_id: 'player-1' };
    const outgoingOffer = { ...pendingOffer, id: 'trade-out', from_user_id: 'player-1', to_user_id: 'player-2' };
    const { db, calls } = createDbMock({ offerRows: [incomingOffer, outgoingOffer] });

    const response = await app.request('/api/trades?user_id=player-1', {}, { DB: db });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      incoming: [incomingOffer],
      outgoing: [outgoingOffer],
    });
    expect(calls).toContainEqual(expect.objectContaining({
      type: 'all',
      sql: expect.stringContaining('AND to_user_id = ?'),
      params: ['pending', 'player-1'],
    }));
    expect(calls).toContainEqual(expect.objectContaining({
      type: 'all',
      sql: expect.stringContaining('AND from_user_id = ?'),
      params: ['pending', 'player-1'],
    }));
  });

  it('requires a user id when listing trade offers', async () => {
    const { db } = createDbMock();

    const response = await app.request('/api/trades', {}, { DB: db });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'user_id is required' });
  });

  it('rejects invalid trade offers before inserting them', async () => {
    const { db, calls } = createDbMock({
      caughtPokemonRows: [
        { id: 'caught-1', pokemon_id: 'bulbasaur', user_id: 'player-2' },
        { id: 'caught-3', pokemon_id: 'charmander', user_id: 'player-2' },
      ],
    });

    const response = await app.request('/api/trades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: 'player-1',
        to_user_id: 'player-2',
        offered_caught_id: 'caught-1',
        requested_caught_id: 'caught-3',
      }),
    }, { DB: db });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'The offered Pokemon is no longer available from that trainer.',
    });
    expect(calls).not.toContainEqual(expect.objectContaining({
      type: 'run',
      sql: expect.stringContaining('INSERT INTO trade_offers'),
    }));
  });

  it('accepts a pending trade and swaps ownership', async () => {
    const { db, calls } = createDbMock({
      offerRows: [pendingOffer],
      caughtPokemonRows: caughtRows,
    });

    const response = await app.request('/api/trades/trade-1/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'player-2' }),
    }, { DB: db });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: 'complete',
      offer: { ...pendingOffer, status: 'complete' },
      transfers: [
        { caught_id: 'caught-1', from_user_id: 'player-1', to_user_id: 'player-2' },
        { caught_id: 'caught-3', from_user_id: 'player-2', to_user_id: 'player-1' },
      ],
    });
    expect(calls).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'run',
        sql: expect.stringContaining('UPDATE caught_pokemon'),
        params: ['player-2', 'caught-1'],
      }),
      expect.objectContaining({
        type: 'run',
        sql: expect.stringContaining('UPDATE caught_pokemon'),
        params: ['player-1', 'caught-3'],
      }),
      expect.objectContaining({
        type: 'run',
        sql: expect.stringContaining('UPDATE trade_offers'),
        params: ['complete', 'trade-1'],
      }),
    ]));
  });

  it('cancels an outgoing pending trade for the creator', async () => {
    const { db, calls } = createDbMock({ offerRows: [pendingOffer] });

    const response = await app.request('/api/trades/trade-1/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'player-1' }),
    }, { DB: db });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: 'cancelled',
      offer: { ...pendingOffer, status: 'cancelled' },
      reason: null,
    });
    expect(calls).toContainEqual(expect.objectContaining({
      type: 'run',
      sql: expect.stringContaining('UPDATE trade_offers'),
      params: ['cancelled', 'trade-1'],
    }));
  });

  it('declines an incoming pending trade for the invited trainer', async () => {
    const { db, calls } = createDbMock({ offerRows: [pendingOffer] });

    const response = await app.request('/api/trades/trade-1/decline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'player-2' }),
    }, { DB: db });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: 'declined',
      offer: { ...pendingOffer, status: 'declined' },
      reason: null,
    });
    expect(calls).toContainEqual(expect.objectContaining({
      type: 'run',
      sql: expect.stringContaining('UPDATE trade_offers'),
      params: ['declined', 'trade-1'],
    }));
  });
});
