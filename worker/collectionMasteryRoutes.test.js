import { describe, expect, it, vi } from 'vitest';
import app from './index';
import { sessionAuthHeader, sessionEnv } from './testSessionAuth';

function createMasteryDbMock({ caughtCount = 12, claimedRows = [] } = {}) {
  const calls = [];
  const claimed = [...claimedRows];

  const db = {
    prepare: vi.fn((sql) => ({
      bind: vi.fn((...params) => ({
        run: vi.fn(async () => {
          calls.push({ type: 'run', sql, params });
          if (sql.includes('INSERT INTO user_achievements')) {
            claimed.push({ user_id: params[0], achievement_id: params[1] });
          }
          return { success: true };
        }),
        all: vi.fn(async () => {
          calls.push({ type: 'all', sql, params });
          if (sql.includes('COUNT(DISTINCT pokemon_id)')) {
            return { results: [{ caught_count: caughtCount }] };
          }
          if (sql.includes('FROM user_achievements')) {
            return { results: [...claimed] };
          }
          return { results: [] };
        }),
      })),
    })),
  };

  return { db, calls, claimed };
}

describe('Collection Mastery API', () => {
  it('reports tier status with claimable milestones', async () => {
    const { db } = createMasteryDbMock({ caughtCount: 12 });

    const response = await app.request('/api/mastery?user_id=user-1', {
      method: 'GET',
    }, sessionEnv(db));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.caught_count).toBe(12);
    expect(body.current_tier.id).toBe('silver');
    const silver = body.tiers.find((tier) => tier.id === 'silver');
    expect(silver.claimed).toBe(false);
    expect(silver.claimable).toBe(true);
    expect(body.unclaimed_rewards.map((tier) => tier.id)).toEqual(['silver']);
  });

  it('claims a reached tier once and pays currency rewards', async () => {
    const { db, calls } = createMasteryDbMock({ caughtCount: 26 });

    const first = await app.request('/api/mastery/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await sessionAuthHeader('user-1')) },
      body: JSON.stringify({ user_id: 'user-1', tier_id: 'silver' }),
    }, sessionEnv(db));
    expect(first.status).toBe(200);
    const firstBody = await first.json();
    expect(firstBody.wallet.coins).toBeGreaterThan(0);
    expect(calls.some((call) => (
      call.type === 'run'
      && call.sql.includes('INSERT INTO user_achievements')
      && call.params[1] === 'mastery_silver'
    ))).toBe(true);

    // Claiming again must be rejected.
    const second = await app.request('/api/mastery/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await sessionAuthHeader('user-1')) },
      body: JSON.stringify({ user_id: 'user-1', tier_id: 'silver' }),
    }, sessionEnv(db));
    expect(second.status).toBe(400);
  });

  it('rejects claiming an unreached tier', async () => {
    const { db } = createMasteryDbMock({ caughtCount: 5 });

    const response = await app.request('/api/mastery/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await sessionAuthHeader('user-1')) },
      body: JSON.stringify({ user_id: 'user-1', tier_id: 'master' }),
    }, sessionEnv(db));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/not reached/i);
  });
});
