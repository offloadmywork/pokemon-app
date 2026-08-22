import { describe, expect, it, vi } from 'vitest';
import {
  findQueuedPvpOpponent,
  leavePvpQueue,
  upsertPvpQueueEntry,
} from './pvpQueue';

function createDbMock({ rows = [] } = {}) {
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
            return { results: rows };
          }
          return { results: [] };
        }),
      })),
    })),
  };

  return { db, calls };
}

describe('PvP queue persistence', () => {
  it('upserts the current user queue entry with team power', async () => {
    const { db, calls } = createDbMock();

    await upsertPvpQueueEntry(db, 'user-1', 85);

    expect(calls).toContainEqual(expect.objectContaining({
      type: 'run',
      sql: expect.stringContaining('INSERT INTO pvp_queue'),
      params: ['user-1', 85],
    }));
  });

  it('finds the closest queued opponent inside the fair power range', async () => {
    const { db, calls } = createDbMock({
      rows: [
        { user_id: 'near', team_power: 92, queued_at: '2026-07-05T02:00:00Z' },
      ],
    });

    const result = await findQueuedPvpOpponent(db, 'user-1', 80);

    expect(result).toEqual({
      matched: true,
      playerPower: 80,
      opponent: { user_id: 'near', team_power: 92, queued_at: '2026-07-05T02:00:00Z' },
    });
    expect(calls).toContainEqual(expect.objectContaining({
      type: 'all',
      sql: expect.stringContaining('FROM pvp_queue'),
      params: ['user-1', 60, 100, 80],
    }));
  });

  it('removes a user from the queue', async () => {
    const { db, calls } = createDbMock();

    await leavePvpQueue(db, 'user-1');

    expect(calls).toContainEqual(expect.objectContaining({
      type: 'run',
      sql: expect.stringContaining('DELETE FROM pvp_queue'),
      params: ['user-1'],
    }));
  });
});
