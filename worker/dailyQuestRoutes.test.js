import { describe, expect, it, vi } from 'vitest';
import app from './index';

function createDailyQuestDbMock({
  progressRows = [{ level: 4 }],
  upgradeRows = [],
} = {}) {
  const calls = [];
  const insertedQuests = [];

  const db = {
    prepare: vi.fn((sql) => ({
      bind: vi.fn((...params) => ({
        run: vi.fn(async () => {
          calls.push({ type: 'run', sql, params });
          if (sql.includes('INSERT INTO daily_quests')) {
            insertedQuests.push({
              id: params[0],
              user_id: params[1],
              quest_date: params[2],
              template_key: params[3],
              title: params[4],
              description: params[5],
              target: params[6],
              progress: 0,
              reward_xp: params[7],
              reward_item_id: params[8],
              reward_item_quantity: params[9],
            });
          }
          return { success: true };
        }),
        all: vi.fn(async () => {
          calls.push({ type: 'all', sql, params });
          if (sql.includes('FROM daily_quests')) {
            return { results: insertedQuests };
          }
          if (sql.includes('FROM player_progress')) {
            return { results: progressRows };
          }
          if (sql.includes('FROM user_upgrades')) {
            return { results: upgradeRows };
          }
          return { results: [] };
        }),
      })),
    })),
  };

  return { db, calls, insertedQuests };
}

describe('Daily Quest Worker API', () => {
  it('generates an extra daily quest for a purchased Daily Task Slot upgrade', async () => {
    const { db, calls } = createDailyQuestDbMock({
      progressRows: [{ level: 4 }],
      upgradeRows: [{ upgrade_id: 'daily_task_slot', level: 1 }],
    });

    const response = await app.request('/api/daily-quests?user_id=user-1', {
      method: 'GET',
    }, { DB: db });

    expect(response.status).toBe(200);
    const quests = await response.json();

    expect(quests).toHaveLength(5);
    expect(quests.map((quest) => quest.template_key)).toEqual(expect.arrayContaining([
      'catch-2',
      'battle-2',
      'use-item-2',
    ]));
    expect(calls).toContainEqual(expect.objectContaining({
      type: 'all',
      sql: expect.stringContaining('FROM user_upgrades'),
      params: ['user-1', 'daily_task_slot'],
    }));
  });
});
