import { describe, expect, it, vi } from 'vitest';
import app from './index';

function createWeeklyMissionDbMock() {
  const calls = [];
  const missions = [];

  const db = {
    prepare: vi.fn((sql) => ({
      bind: vi.fn((...params) => ({
        run: vi.fn(async () => {
          calls.push({ type: 'run', sql, params });
          if (sql.includes('INSERT INTO weekly_missions')) {
            missions.push({
              mission_key: params[3],
              event: params[4],
              title: params[5],
              description: params[6],
              target: params[7],
              progress: 0,
              reward_xp: params[8],
              reward_coins: params[9],
              claimed_at: null,
            });
          }
          if (sql.includes('UPDATE weekly_missions') && sql.includes('progress = MIN')) {
            const [amount, , , event] = params;
            missions.forEach((mission) => {
              if (mission.event === event && mission.progress < mission.target) {
                mission.progress = Math.min(mission.target, mission.progress + amount);
              }
            });
          }
          if (sql.includes('SET claimed_at')) {
            const [claimedAt, , , missionKey] = params;
            const mission = missions.find((m) => m.mission_key === missionKey);
            if (mission) mission.claimed_at = claimedAt;
          }
          return { success: true };
        }),
        all: vi.fn(async () => {
          calls.push({ type: 'all', sql, params });
          if (sql.includes('FROM weekly_missions')) {
            return { results: [...missions] };
          }
          if (sql.includes('FROM player_progress')) {
            return { results: [{ level: 3, xp: 100 }] };
          }
          return { results: [] };
        }),
      })),
    })),
  };

  return { db, calls, missions };
}

describe('Weekly Mission Worker API', () => {
  it('generates and returns the current week missions for a user', async () => {
    const { db } = createWeeklyMissionDbMock();

    const response = await app.request('/api/weekly-missions?user_id=user-1', {
      method: 'GET',
    }, { DB: db });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.week_key).toMatch(/^\d{4}-W\d{2}$/);
    // Level 3 trainer: 3 core missions + rotated advanced picks
    expect(body.missions.length).toBeGreaterThanOrEqual(4);
    expect(body.missions.every((m) => m.progress === 0 && m.target > 0)).toBe(true);
  });

  it('clamps progress increments at the mission target', async () => {
    const { db, missions } = createWeeklyMissionDbMock();
    await app.request('/api/weekly-missions?user_id=user-1', { method: 'GET' }, { DB: db });

    const response = await app.request('/api/weekly-missions/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'user-1', event: 'catches', amount: 9999 }),
    }, { DB: db });

    expect(response.status).toBe(200);
    const updated = (await response.json()).find((m) => m.event === 'catches');
    expect(updated.progress).toBe(updated.target);
    expect(missions.find((m) => m.event === 'catches').progress).toBe(updated.target);
  });

  it('pays mission rewards exactly once across repeated claims', async () => {
    const { db } = createWeeklyMissionDbMock();

    await app.request('/api/weekly-missions?user_id=user-1', { method: 'GET' }, { DB: db });
    for (const event of ['catches', 'battle-wins', 'daily-quests-completed']) {
      await app.request('/api/weekly-missions/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'user-1', event, amount: 9999 }),
      }, { DB: db });
    }

    const firstResponse = await app.request('/api/weekly-missions/claim-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'user-1' }),
    }, { DB: db });
    const firstClaim = await firstResponse.json();
    expect(firstClaim.claimedCount).toBeGreaterThan(0);
    expect(firstClaim.totalXp).toBeGreaterThan(0);

    const secondResponse = await app.request('/api/weekly-missions/claim-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'user-1' }),
    }, { DB: db });
    const secondClaim = await secondResponse.json();
    expect(secondClaim.totalXp).toBe(0);
    expect(secondClaim.totalCoins).toBe(0);
  });
});
