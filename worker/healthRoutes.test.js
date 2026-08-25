import { describe, expect, it, vi } from 'vitest';
import app from './index';

function createHealthDbMock({ fail = false } = {}) {
  const calls = [];

  const db = {
    prepare: vi.fn((sql) => ({
      bind: vi.fn(() => ({
        all: vi.fn(async () => {
          calls.push({ type: 'all', sql });
          if (fail) {
            throw new Error('D1 unavailable');
          }
          return { results: [] };
        }),
      })),
    })),
  };

  return { db, calls };
}

describe('Health Check Worker API', () => {
  it('reports ok status when the database responds', async () => {
    const { db, calls } = createHealthDbMock();

    const response = await app.request('/api/health', {}, { DB: db });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: 'ok',
      database: 'ok',
    });
    expect(calls).toContainEqual(expect.objectContaining({
      type: 'all',
      sql: expect.stringContaining('SELECT 1'),
    }));
  });

  it('returns a timestamp suitable for uptime monitors', async () => {
    const { db } = createHealthDbMock();

    const response = await app.request('/api/health', {}, { DB: db });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.timestamp).toEqual(expect.any(String));
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);
  });

  it('reports degraded status without leaking errors when the database fails', async () => {
    const { db } = createHealthDbMock({ fail: true });

    const response = await app.request('/api/health', {}, { DB: db });

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body).toMatchObject({
      status: 'degraded',
      database: 'error',
    });
    expect(JSON.stringify(body)).not.toContain('D1 unavailable');
  });

  it('does not require authentication so external uptime monitors can poll it', async () => {
    const { db } = createHealthDbMock();

    const response = await app.request('/api/health', { method: 'GET' }, { DB: db });

    expect(response.status).toBe(200);
  });
});
