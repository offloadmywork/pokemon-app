import { describe, expect, it, vi } from 'vitest';
import app from './index';

function createRecoveryDbMock({ storedCode = null, storedUserId = 'user-1' } = {}) {
  const inserted = [];
  const db = {
    prepare: vi.fn((sql) => ({
      bind: vi.fn((...params) => ({
        run: vi.fn(async () => {
          if (sql.includes('INSERT INTO recovery_codes')) {
            inserted.push({ code: params[0], user_id: params[1] });
          }
          return { success: true };
        }),
        all: vi.fn(async () => {
          if (sql.includes('WHERE user_id = ?')) {
            if (storedCode) return { results: [{ code: storedCode }] };
            const mine = inserted.find((row) => row.user_id === params[0]);
            return { results: mine ? [{ code: mine.code }] : [] };
          }
          if (sql.includes('WHERE code = ?')) {
            const code = params[0];
            if (storedCode === code) return { results: [{ user_id: storedUserId }] };
            const match = inserted.find((row) => row.code === code);
            return { results: match ? [{ user_id: match.user_id }] : [] };
          }
          return { results: [] };
        }),
      })),
    })),
  };
  return db;
}

describe('Recovery phrase API', () => {
  it('registers a new phrase for a save and returns it', async () => {
    const db = createRecoveryDbMock();

    const response = await app.request('/api/recovery/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'user-1' }),
    }, { DB: db });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.code).toMatch(/^[a-z]+-[a-z]+-[a-z]+-\d{2}$/);
  });

  it('returns the same existing phrase on re-registration', async () => {
    const db = createRecoveryDbMock({ storedCode: 'amber-grove-zephyr-42' });

    const response = await app.request('/api/recovery/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'user-1' }),
    }, { DB: db });

    const body = await response.json();
    expect(body.code).toBe('amber-grove-zephyr-42');
  });

  it('restores a save from a valid phrase', async () => {
    const db = createRecoveryDbMock({ storedCode: 'amber-grove-zephyr-42' });

    const response = await app.request('/api/recovery/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phrase: 'Amber Grove Zephyr 42' }),
    }, { DB: db });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.user_id).toBe('user-1');
  });

  it('rejects unknown phrases without leaking whether the format was fine', async () => {
    const db = createRecoveryDbMock({ storedCode: 'amber-grove-zephyr-42' });

    const response = await app.request('/api/recovery/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phrase: 'nope-word-word-99' }),
    }, { DB: db });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toMatch(/no save found/i);
  });
});
