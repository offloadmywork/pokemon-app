import { describe, expect, it, vi } from 'vitest';
import app from './index';

function createEncounterDbMock({ pool = [], emptyPool = [] } = {}) {
  const calls = [];
  let randomQueryCount = 0;
  const db = {
    prepare: vi.fn((sql) => ({
      bind: vi.fn((...params) => ({
        run: vi.fn(async () => {
          calls.push({ type: 'run', sql, params });
          return { success: true };
        }),
        all: vi.fn(async () => {
          calls.push({ type: 'all', sql, params });
          if (sql.includes('FROM users')) return { results: [{ id: params[0] }] };
          if (sql.includes('ORDER BY RANDOM()')) {
            // First selection attempt draws from pool; fallbacks from emptyPool.
            randomQueryCount += 1;
            const source = randomQueryCount === 1 ? pool : emptyPool;
            return { results: source.length ? [source[0]] : [] };
          }
          return { results: [] };
        }),
      })),
    })),
  };
  return { db, calls };
}

const PIKACHU = { id: 'p1', name: 'Pikachu', type: 'Electric', rarity: 'Common', power_level: 20 };

describe('Server-side encounter roll API', () => {
  it('requires user_id', async () => {
    const { db } = createEncounterDbMock();
    const response = await app.request('/api/encounters/roll?level=2', { method: 'GET' }, { DB: db });
    expect(response.status).toBe(400);
  });

  it('returns a pokemon rolled server-side within the level rarity table', async () => {
    const { db, calls } = createEncounterDbMock({ pool: [PIKACHU] });

    const response = await app.request('/api/encounters/roll?user_id=user-1&level=1', { method: 'GET' }, { DB: db });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.name).toBe('Pikachu');

    // Rarity must come from the server-side roll for the trainer's level,
    // and the selection query must filter on it.
    const selectCalls = calls.filter((c) => c.type === 'all' && c.sql.includes('ORDER BY RANDOM()'));
    expect(selectCalls.length).toBeGreaterThan(0);
    expect(selectCalls[0].sql).toContain('rarity = ?');
  });

  it('applies lure type hints as a filter when provided', async () => {
    const { db } = createEncounterDbMock({ pool: [{ ...PIKACHU, type: 'Water', name: 'Squirtle' }] });

    const response = await app.request(
      '/api/encounters/roll?user_id=user-1&level=1&lure_type=Water',
      { method: 'GET' },
      { DB: db }
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.type).toBe('Water');
  });

  it('falls back to an unfiltered pick when the filtered pool is empty', async () => {
    const { db } = createEncounterDbMock({ pool: [], emptyPool: [PIKACHU] });

    const response = await app.request('/api/encounters/roll?user_id=user-1&level=9', { method: 'GET' }, { DB: db });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.name).toBe('Pikachu');
  });
});
