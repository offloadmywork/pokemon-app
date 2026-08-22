import { describe, expect, it, vi } from 'vitest';
import { listBossClears, recordBossClear } from './bossProgress';

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
          if (sql.includes('FROM boss_clears')) {
            return { results: rows };
          }
          return { results: [] };
        }),
      })),
    })),
  };

  return { db, calls };
}

describe('boss clear persistence', () => {
  it('lists clears for a user', async () => {
    const { db, calls } = createDbMock({
      rows: [{ boss_key: 'grove-guardian', name: 'Grove Guardian', reward_xp: 120 }],
    });

    await expect(listBossClears(db, 'user-1')).resolves.toEqual([
      { boss_key: 'grove-guardian', name: 'Grove Guardian', reward_xp: 120 },
    ]);

    expect(calls).toContainEqual(expect.objectContaining({
      type: 'all',
      sql: expect.stringContaining('FROM boss_clears'),
      params: ['user-1'],
    }));
  });

  it('records a clear with upsert semantics', async () => {
    const { db, calls } = createDbMock({
      rows: [{
        user_id: 'user-1',
        boss_key: 'grove-guardian',
        name: 'Grove Guardian',
        reward_xp: 120,
        cleared_at: '2026-07-04T20:17:00.000Z',
      }],
    });

    const result = await recordBossClear(db, 'user-1', {
      boss_key: 'grove-guardian',
      name: 'Grove Guardian',
      reward_xp: 120,
      cleared_at: '2026-07-04T20:17:00.000Z',
    });

    expect(result).toEqual(expect.objectContaining({
      boss_key: 'grove-guardian',
      name: 'Grove Guardian',
      reward_xp: 120,
    }));
    expect(calls).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'run',
        sql: expect.stringContaining('INSERT INTO boss_clears'),
        params: ['user-1', 'grove-guardian', 'Grove Guardian', 120, '2026-07-04T20:17:00.000Z'],
      }),
      expect.objectContaining({
        type: 'all',
        sql: expect.stringContaining('FROM boss_clears'),
        params: ['user-1', 'grove-guardian'],
      }),
    ]));
  });
});
