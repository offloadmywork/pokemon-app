import { describe, expect, it, vi } from 'vitest';
import app from './index';

function createKpiDbMock({
  users = [],
  progressRows = [],
  bossClearRows = [],
  sessionRows = [],
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
          if (sql.includes('FROM users')) {
            return { results: users };
          }
          if (sql.includes('FROM player_progress')) {
            return { results: progressRows };
          }
          if (sql.includes('FROM boss_clears')) {
            return { results: bossClearRows };
          }
          if (sql.includes('FROM user_sessions')) {
            return { results: sessionRows };
          }
          return { results: [] };
        }),
      })),
    })),
  };

  return { db, calls };
}

describe('KPI Metrics Worker API', () => {
  it('records a completed player session sample for session-length KPI tracking', async () => {
    const { db, calls } = createKpiDbMock();

    const response = await app.request('/api/player/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: 'user-1',
        started_at: '2026-07-07T10:00:00Z',
        ended_at: '2026-07-07T10:05:00Z',
      }),
    }, { DB: db });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      user_id: 'user-1',
      started_at: '2026-07-07T10:00:00Z',
      ended_at: '2026-07-07T10:05:00Z',
    });
    expect(calls).toContainEqual(expect.objectContaining({
      type: 'run',
      sql: expect.stringContaining('INSERT INTO user_sessions'),
      params: expect.arrayContaining([
        'user-1',
        '2026-07-07T10:00:00Z',
        '2026-07-07T10:05:00Z',
      ]),
    }));
  });

  it('builds a KPI snapshot from persisted user, progress, boss clear, and session rows', async () => {
    const { db, calls } = createKpiDbMock({
      users: [
        { id: 'u1', created_at: '2026-06-28T00:00:00Z', last_active_at: '2026-07-06T00:00:00Z' },
        { id: 'u2', created_at: '2026-07-05T00:00:00Z', last_active_at: '2026-07-05T05:00:00Z' },
      ],
      progressRows: [
        { user_id: 'u1', level: 5 },
        { user_id: 'u2', level: 3 },
      ],
      bossClearRows: [
        { user_id: 'u1', boss_key: 'grove-guardian' },
        { user_id: 'u2', boss_key: 'crystal-warden' },
      ],
      sessionRows: [
        { user_id: 'u1', started_at: '2026-07-07T10:00:00Z', ended_at: '2026-07-07T10:05:00Z' },
      ],
    });

    const response = await app.request('/api/metrics/kpis?now=2026-07-08T00:00:00Z', {
      method: 'GET',
    }, { DB: db });

    expect(response.status).toBe(200);
    const snapshot = await response.json();

    expect(snapshot.d1Retention).toMatchObject({ eligible: 2, retained: 1, rate: 0.5 });
    expect(snapshot.d7Retention).toMatchObject({ eligible: 1, retained: 1, rate: 1 });
    expect(snapshot.sessionLength).toMatchObject({ averageMinutes: 5, sampleSize: 1, met: true });
    expect(snapshot.level5Reach).toMatchObject({ eligible: 2, reached: 1, rate: 0.5 });
    expect(snapshot.zone1Completion).toMatchObject({ eligible: 2, completed: 1, rate: 0.5 });
    expect(calls).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'all', sql: expect.stringContaining('FROM users') }),
      expect.objectContaining({ type: 'all', sql: expect.stringContaining('FROM player_progress') }),
      expect.objectContaining({ type: 'all', sql: expect.stringContaining('FROM boss_clears') }),
      expect.objectContaining({ type: 'all', sql: expect.stringContaining('FROM user_sessions') }),
    ]));
  });
});
