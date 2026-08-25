import { describe, expect, it, vi } from 'vitest';
import app from './index';
import { sessionAuthHeader, sessionEnv } from './testSessionAuth';

// BDD: Captures, renames, releases, and starter claims are roster mutations.
// The acting trainer must come from the signed session token — never the body.

function createRosterDbMock() {
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
          if (sql.includes('FROM pokemon WHERE id = ?')) {
            return { results: [{ rarity: 'Common' }] };
          }
          if (sql.includes('SELECT rarity FROM pokemon WHERE name = ?')
            || sql.includes('FROM pokemon WHERE name = ?')) {
            return { results: [] };
          }
          if (sql.includes('COUNT(*) as count FROM caught_pokemon')) {
            return { results: [{ count: 0 }] };
          }
          return { results: [] };
        }),
      })),
    })),
  };

  return { db, calls };
}

describe('Catch route session enforcement', () => {
  it('rejects captures without a valid session token', async () => {
    const { db } = createRosterDbMock();
    const response = await app.request('/api/caught', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'user-1', pokemon_id: 'poke-1' }),
    }, { DB: db });

    expect(response.status).toBe(401);
  });

  it('binds the capture to the token user even when the body claims another', async () => {
    const { db, calls } = createRosterDbMock();
    const response = await app.request('/api/caught', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await sessionAuthHeader('token-user')) },
      body: JSON.stringify({ user_id: 'spoofed-user', pokemon_id: 'poke-1', nickname: 'Sparky' }),
    }, sessionEnv(db));

    expect(response.status).toBe(201);
    const insert = calls.find(
      (call) => call.type === 'run' && call.sql.includes('INSERT INTO caught_pokemon')
    );
    expect(insert.params[1]).toBe('poke-1');
    expect(insert.params[2]).toBe('token-user');

    const body = await response.json();
    expect(body.user_id).toBe('token-user');
  });

  it('scopes releases to the owning trainer', async () => {
    const { db, calls } = createRosterDbMock();
    const response = await app.request('/api/caught/caught-9', {
      method: 'DELETE',
      headers: { ...(await sessionAuthHeader('token-user')) },
    }, sessionEnv(db));

    expect(response.status).toBe(200);
    const del = calls.find(
      (call) => call.type === 'run' && call.sql.includes('DELETE FROM caught_pokemon')
    );
    expect(del.sql).toContain('AND user_id = ?');
    expect(del.params).toEqual(['caught-9', 'token-user']);
  });

  it('rejects unauthenticated releases', async () => {
    const { db } = createRosterDbMock();
    const response = await app.request('/api/caught/caught-9', {
      method: 'DELETE',
    }, { DB: db });

    expect(response.status).toBe(401);
  });

  it('scopes nickname updates to the owning trainer', async () => {
    const { db, calls } = createRosterDbMock();
    const response = await app.request('/api/caught/caught-9', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...(await sessionAuthHeader('token-user')) },
      body: JSON.stringify({ nickname: 'Newname' }),
    }, sessionEnv(db));

    expect(response.status).toBe(200);
    const update = calls.find(
      (call) => call.type === 'run' && call.sql.includes('UPDATE caught_pokemon SET nickname')
    );
    expect(update.sql).toContain('AND user_id = ?');
    expect(update.params).toContain('token-user');
  });

  it('claims starters into the session-verified roster without a body user_id', async () => {
    const { db, calls } = createRosterDbMock();
    const response = await app.request('/api/starter/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await sessionAuthHeader('new-trainer')) },
      body: JSON.stringify({}),
    }, sessionEnv(db));

    expect(response.status).toBe(201);
    const inserts = calls.filter(
      (call) => call.type === 'run' && call.sql.includes('INSERT INTO caught_pokemon')
    );
    // Three starters land in the new trainer's collection.
    expect(inserts).toHaveLength(3);
    for (const insert of inserts) {
      expect(insert.params[2]).toBe('new-trainer');
    }
  });

  it('rejects unauthenticated starter claims', async () => {
    const { db } = createRosterDbMock();
    const response = await app.request('/api/starter/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'user-1' }),
    }, { DB: db });

    expect(response.status).toBe(401);
  });
});
