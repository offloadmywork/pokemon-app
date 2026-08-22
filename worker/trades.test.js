import { describe, expect, it, vi } from 'vitest';
import { acceptTradeOffer, cancelTradeOffer, createTradeOffer, declineTradeOffer, getTradeOffer, listTradeOffers } from './trades';

const pendingOffer = {
  id: 'trade-1',
  from_user_id: 'player-1',
  to_user_id: 'player-2',
  offered_caught_id: 'caught-1',
  requested_caught_id: 'caught-3',
  status: 'pending',
  created_at: '2026-07-06T09:00:00Z',
  updated_at: '2026-07-06T09:00:00Z',
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
          return { results: [] };
        }),
      })),
    })),
  };

  return { db, calls };
}

describe('trade persistence', () => {
  it('creates a pending trade offer after both caught Pokemon owners validate', async () => {
    const { db, calls } = createDbMock({
      caughtPokemonRows: caughtRows,
      offerRows: [pendingOffer],
    });

    const result = await createTradeOffer(
      db,
      {
        fromUserId: 'player-1',
        toUserId: 'player-2',
        offeredCaughtId: 'caught-1',
        requestedCaughtId: 'caught-3',
      },
      () => 'trade-1',
    );

    expect(result).toEqual(pendingOffer);
    expect(calls).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'all',
        sql: expect.stringContaining('FROM caught_pokemon'),
        params: ['caught-1', 'caught-3'],
      }),
      expect.objectContaining({
        type: 'run',
        sql: expect.stringContaining('INSERT INTO trade_offers'),
        params: ['trade-1', 'player-1', 'player-2', 'caught-1', 'caught-3', 'pending'],
      }),
    ]));
  });

  it('rejects a trade offer when the offered Pokemon is not owned by the creator', async () => {
    const { db, calls } = createDbMock({
      caughtPokemonRows: [
        { id: 'caught-1', pokemon_id: 'bulbasaur', user_id: 'player-2' },
        { id: 'caught-3', pokemon_id: 'charmander', user_id: 'player-2' },
      ],
    });

    const result = await createTradeOffer(
      db,
      {
        fromUserId: 'player-1',
        toUserId: 'player-2',
        offeredCaughtId: 'caught-1',
        requestedCaughtId: 'caught-3',
      },
      () => 'trade-1',
    );

    expect(result).toEqual({
      status: 'rejected',
      reason: 'The offered Pokemon is no longer available from that trainer.',
    });
    expect(calls).not.toContainEqual(expect.objectContaining({
      type: 'run',
      sql: expect.stringContaining('INSERT INTO trade_offers'),
    }));
  });

  it('loads a trade offer by id', async () => {
    const { db, calls } = createDbMock({ offerRows: [pendingOffer] });

    await expect(getTradeOffer(db, 'trade-1')).resolves.toEqual(pendingOffer);
    expect(calls).toContainEqual(expect.objectContaining({
      type: 'all',
      sql: expect.stringContaining('FROM trade_offers'),
      params: ['trade-1'],
    }));
  });

  it('lists pending incoming and outgoing trade offers for a trainer', async () => {
    const incomingOffer = { ...pendingOffer, id: 'trade-in', from_user_id: 'player-3', to_user_id: 'player-1' };
    const outgoingOffer = { ...pendingOffer, id: 'trade-out', from_user_id: 'player-1', to_user_id: 'player-2' };
    const completeOffer = { ...pendingOffer, id: 'trade-done', from_user_id: 'player-1', status: 'complete' };
    const { db, calls } = createDbMock({ offerRows: [incomingOffer, outgoingOffer, completeOffer] });

    await expect(listTradeOffers(db, 'player-1')).resolves.toEqual({
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

  it('accepts a pending trade offer and swaps caught Pokemon ownership', async () => {
    const { db, calls } = createDbMock({
      offerRows: [pendingOffer],
      caughtPokemonRows: caughtRows,
    });

    const result = await acceptTradeOffer(db, {
      tradeId: 'trade-1',
      userId: 'player-2',
    });

    expect(result).toEqual({
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

  it('rejects acceptance by anyone other than the invited trainer', async () => {
    const { db, calls } = createDbMock({ offerRows: [pendingOffer] });

    await expect(acceptTradeOffer(db, {
      tradeId: 'trade-1',
      userId: 'player-3',
    })).resolves.toEqual({
      status: 'failed',
      offer: pendingOffer,
      transfers: [],
      reason: 'Only the invited trainer can accept this trade.',
    });
    expect(calls).not.toContainEqual(expect.objectContaining({
      type: 'run',
      sql: expect.stringContaining('UPDATE caught_pokemon'),
    }));
  });

  it('cancels an outgoing pending trade offer for the creator', async () => {
    const { db, calls } = createDbMock({ offerRows: [pendingOffer] });

    await expect(cancelTradeOffer(db, {
      tradeId: 'trade-1',
      userId: 'player-1',
    })).resolves.toEqual({
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

  it('rejects cancelling a trade offer by anyone other than the creator', async () => {
    const { db, calls } = createDbMock({ offerRows: [pendingOffer] });

    await expect(cancelTradeOffer(db, {
      tradeId: 'trade-1',
      userId: 'player-2',
    })).resolves.toEqual({
      status: 'failed',
      offer: pendingOffer,
      reason: 'Only the trainer who created this trade can cancel it.',
    });
    expect(calls).not.toContainEqual(expect.objectContaining({
      type: 'run',
      sql: expect.stringContaining('UPDATE trade_offers'),
    }));
  });

  it('declines an incoming pending trade offer for the invited trainer', async () => {
    const { db, calls } = createDbMock({ offerRows: [pendingOffer] });

    await expect(declineTradeOffer(db, {
      tradeId: 'trade-1',
      userId: 'player-2',
    })).resolves.toEqual({
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
