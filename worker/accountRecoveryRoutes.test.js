import { describe, expect, it, vi } from 'vitest';
import app from './index';

function createRecoveryDbMock({ existingCodeRows = [], storedCode = null } = {}) {
  const calls = [];
  const codeRows = [...existingCodeRows];

  const db = {
    prepare: vi.fn((sql) => ({
      bind: vi.fn((...params) => ({
        run: vi.fn(async () => {
          calls.push({ type: 'run', sql, params });
          if (sql.includes('INSERT INTO account_recovery')) {
            codeRows.push({ recovery_code: params[0], user_id: params[1] });
          }
          return { success: true };
        }),
        all: vi.fn(async () => {
          calls.push({ type: 'all', sql, params });
          if (sql.includes('FROM account_recovery WHERE user_id')) {
            return { results: codeRows.filter((row) => row.user_id === params[0]) };
          }
          if (sql.includes('WHERE recovery_code')) {
            return { results: codeRows.filter((row) => row.recovery_code === params[0]) };
          }
          return { results: [] };
        }),
      })),
    })),
  };

  return { db, calls, codeRows, get storedCode() { return storedCode; } };
}

describe('Account Recovery API', () => {
  it('issues a stable human-readable recovery code for a trainer', async () => {
    const { db, codeRows } = createRecoveryDbMock();

    const first = await app.request('/api/recovery/code?user_id=user-1', {
      method: 'GET',
    }, { DB: db });
    expect(first.status).toBe(200);
    const body = await first.json();
    expect(body.recovery_code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);

    // Second call returns the same code (idempotent).
    const second = await app.request('/api/recovery/code?user_id=user-1', {
      method: 'GET',
    }, { DB: db });
    const secondBody = await second.json();
    expect(secondBody.recovery_code).toBe(body.recovery_code);
  });

  it('restores the account from a typed recovery code', async () => {
    const mock = createRecoveryDbMock({
      existingCodeRows: [{ recovery_code: 'ABCD-EFGH', user_id: 'user-42' }],
    });

    const response = await app.request('/api/recovery/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'abcd efgh' }),
    }, { DB: mock.db });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.user_id).toBe('user-42');
  });

  it('rejects unknown or malformed codes without leaking internals', async () => {
    const { db } = createRecoveryDbMock();

    const unknown = await app.request('/api/recovery/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'ZZZZ-ZZZZ' }),
    }, { DB: db });
    expect(unknown.status).toBe(404);

    const malformed = await app.request('/api/recovery/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'ABC' }),
    }, { DB: db });
    expect(malformed.status).toBe(400);
    const malformedBody = await malformed.json();
    expect(malformedBody.error).toMatch(/format/i);
  });
});
