import { describe, expect, it, vi, beforeEach } from 'vitest';
import { sessionAuthHeader, sessionEnv } from './testSessionAuth';

// BDD: Multi-player routes keep counterparties request-supplied, but the
// ACTING user must always come from the signed session token.

const mocks = vi.hoisted(() => ({
  createTradeOffer: vi.fn(async () => ({ status: 'pending' })),
  joinCoopRaidRoom: vi.fn(async () => ({ raid: {}, ready: true, participants: [] })),
  leavePvpQueue: vi.fn(async () => {}),
}));
const createTradeOffer = mocks.createTradeOffer;
const joinCoopRaidRoom = mocks.joinCoopRaidRoom;
const leavePvpQueue = mocks.leavePvpQueue;

vi.mock('./trades.js', () => ({
  createTradeOffer: mocks.createTradeOffer,
  acceptTradeOffer: vi.fn(),
  cancelTradeOffer: vi.fn(),
  declineTradeOffer: vi.fn(),
  listTradeOffers: vi.fn(async () => []),
}));

vi.mock('./coopRaids.js', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    joinCoopRaidRoom: mocks.joinCoopRaidRoom,
  };
});

vi.mock('./pvpQueue.js', () => ({
  upsertPvpQueueEntry: vi.fn(async () => {}),
  findQueuedPvpOpponent: vi.fn(async () => ({ matched: false })),
  leavePvpQueue: mocks.leavePvpQueue,
  getPvpOpponentTeam: vi.fn(async () => []),
}));

const dbStub = {
  prepare: () => ({
    bind: () => ({
      run: async () => ({ success: true }),
      all: async () => ({ results: [] }),
    }),
  }),
};

import app from './index';

describe('Multi-player route identity binding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates trade offers from the token user, ignoring the body claim', async () => {
    const response = await app.request('/api/trades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await sessionAuthHeader('token-user')) },
      body: JSON.stringify({
        user_id: 'spoofed-user',
        to_user_id: 'player-2',
        offered_caught_id: 'caught-1',
        requested_caught_id: 'caught-2',
      }),
    }, sessionEnv(dbStub));

    expect(response.status).toBe(201);
    expect(createTradeOffer).toHaveBeenCalledTimes(1);
    expect(createTradeOffer.mock.calls[0][1].fromUserId).toBe('token-user');
    expect(createTradeOffer.mock.calls[0][1].toUserId).toBe('player-2');
  });

  it('joins co-op raids under the token identity', async () => {
    const response = await app.request('/api/coop-raids/raid-1/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await sessionAuthHeader('raid-fan')) },
      body: JSON.stringify({ user_id: 'spoofed-user', team_power: 120 }),
    }, sessionEnv(dbStub));

    expect(response.status).toBe(200);
    expect(joinCoopRaidRoom.mock.calls[0][1]).toEqual(
      expect.objectContaining({ userId: 'raid-fan' })
    );
  });

  it('leaves the PvP queue as the token user without any query parameter', async () => {
    const response = await app.request('/api/pvp/queue', {
      method: 'DELETE',
      headers: await sessionAuthHeader('queued-trainer'),
    }, sessionEnv(dbStub));

    expect(response.status).toBe(200);
    expect(leavePvpQueue).toHaveBeenCalledWith(expect.anything(), 'queued-trainer');
  });

  it('still rejects these mutations without a valid session', async () => {
    const noSession = await app.request('/api/trades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to_user_id: 'p2', offered_caught_id: 'c1', requested_caught_id: 'c2' }),
    }, sessionEnv(dbStub));
    expect(noSession.status).toBe(401);

    const noSessionJoin = await app.request('/api/coop-raids/raid-1/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team_power: 100 }),
    }, sessionEnv(dbStub));
    expect(noSessionJoin.status).toBe(401);
  });
});
