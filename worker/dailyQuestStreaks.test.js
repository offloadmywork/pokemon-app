import { describe, it, expect, vi } from 'vitest';
import { applyDailyQuestStreakAfterClaim } from './dailyQuestStreaks';

function createDbMock({ streakRow, itemRow = null }) {
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
          if (sql.includes('FROM daily_quest_streaks')) {
            return { results: [streakRow] };
          }
          if (sql.includes('FROM user_items')) {
            return { results: itemRow ? [itemRow] : [] };
          }
          return { results: [] };
        }),
      })),
    })),
  };

  return { db, calls };
}

describe('daily quest streak persistence', () => {
  it('updates streak state and grants a bonus when all quests are claimed', async () => {
    const { db, calls } = createDbMock({
      streakRow: {
        user_id: 'user-1',
        current_streak: 2,
        longest_streak: 4,
        last_claim_date: '2026-07-03',
      },
    });

    const result = await applyDailyQuestStreakAfterClaim(
      db,
      'user-1',
      [
        { id: 'q1', claimed_at: '2026-07-04T09:00:00Z' },
        { id: 'q2', claimed_at: '2026-07-04T09:01:00Z' },
      ],
      '2026-07-04',
      () => 'bonus-row'
    );

    expect(result).toEqual({
      streak: 3,
      longest_streak: 4,
      bonus: { item_id: 'pokeball', quantity: 3 },
      changed: true,
    });
    expect(calls).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'run',
        sql: expect.stringContaining('UPDATE daily_quest_streaks'),
        params: [3, 4, '2026-07-04', 'user-1'],
      }),
      expect.objectContaining({
        type: 'run',
        sql: expect.stringContaining('INSERT INTO user_items'),
        params: ['bonus-row', 'user-1', 'pokeball', 3],
      }),
    ]));
  });

  it('does not update streak twice for the same claim date', async () => {
    const { db, calls } = createDbMock({
      streakRow: {
        user_id: 'user-1',
        current_streak: 3,
        longest_streak: 3,
        last_claim_date: '2026-07-04',
      },
    });

    const result = await applyDailyQuestStreakAfterClaim(
      db,
      'user-1',
      [{ id: 'q1', claimed_at: '2026-07-04T09:00:00Z' }],
      '2026-07-04'
    );

    expect(result).toEqual({
      streak: 3,
      longest_streak: 3,
      bonus: null,
      changed: false,
    });
    expect(calls.some((call) => call.sql.includes('UPDATE daily_quest_streaks'))).toBe(false);
    expect(calls.some((call) => call.sql.includes('user_items'))).toBe(false);
  });
});
