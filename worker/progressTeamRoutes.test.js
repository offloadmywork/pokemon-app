import { describe, expect, it, vi } from 'vitest';
import app from './index';
import { sessionAuthHeader, sessionEnv } from './testSessionAuth';

// BDD: Player progress and battle teams are per-trainer state. The acting
// trainer must come from the signed session token — never the request body.

function createProgressDbMock({ existingProgress = false } = {}) {
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
          if (sql.includes('FROM player_progress')) {
            return { results: existingProgress ? [{ id: 7 }] : [] };
          }
          return { results: [] };
        }),
      })),
    })),
  };

  return { db, calls };
}

describe('Player progress session enforcement', () => {
  it('rejects unauthenticated progress updates', async () => {
    const { db } = createProgressDbMock({});
    const response = await app.request('/api/player/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ xp: 100, level: 5, user_id: 'user-1' }),
    }, { DB: db });

    expect(response.status).toBe(401);
  });

  it('binds progress writes to the token identity even when the body claims another', async () => {
    const { db, calls } = createProgressDbMock({ existingProgress: true });
    const response = await app.request('/api/player/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await sessionAuthHeader('token-user')) },
      body: JSON.stringify({ xp: 200, level: 6, user_id: 'spoofed-user' }),
    }, sessionEnv(db));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ xp: 200, level: 6 });

    const update = calls.find(
      (call) => call.type === 'run' && call.sql.includes('UPDATE player_progress')
    );
    expect(update.params).toEqual([200, 6, 'token-user']);
  });

  it('creates a progress row for a first-time trainer under their token identity', async () => {
    const { db, calls } = createProgressDbMock({ existingProgress: false });
    const response = await app.request('/api/player/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await sessionAuthHeader('new-trainer')) },
      body: JSON.stringify({ xp: 10, level: 1 }),
    }, sessionEnv(db));

    expect(response.status).toBe(200);
    const insert = calls.find(
      (call) => call.type === 'run' && call.sql.includes('INSERT INTO player_progress')
    );
    expect(insert.params).toContain('new-trainer');
  });
});

function createTeamDbMock() {
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
          return { results: [] };
        }),
      })),
    })),
  };

  return { db, calls };
}

describe('Team route session enforcement', () => {
  it('rejects unauthenticated team saves', async () => {
    const { db } = createTeamDbMock();
    const response = await app.request('/api/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team: [], user_id: 'user-1' }),
    }, { DB: db });

    expect(response.status).toBe(401);
  });

  it('saves the team under the token identity and ignores the body user_id', async () => {
    const { db, calls } = createTeamDbMock();
    const member = { pokemon_id: 'poke-1', name: 'Sparky' };
    const response = await app.request('/api/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await sessionAuthHeader('token-user')) },
      body: JSON.stringify({ team: [member], user_id: 'spoofed-user' }),
    }, sessionEnv(db));

    expect(response.status).toBe(200);

    // Existing team cleared only for the token user.
    const clear = calls.find(
      (call) => call.type === 'run' && call.sql.includes('DELETE FROM team')
    );
    expect(clear.params).toEqual(['token-user']);

    // New members inserted with the token identity.
    const insert = calls.find(
      (call) => call.type === 'run' && call.sql.includes('INSERT INTO team')
    );
    expect(insert.params[1]).toBe('token-user');
  });

  it('scopes team removal to the token identity without a query user_id', async () => {
    const { db, calls } = createTeamDbMock();
    const response = await app.request('/api/team/poke-9?user_id=spoofed-user', {
      method: 'DELETE',
      headers: { ...(await sessionAuthHeader('token-user')) },
    }, sessionEnv(db));

    expect(response.status).toBe(200);
    const del = calls.find(
      (call) => call.type === 'run' && call.sql.includes('DELETE FROM team WHERE pokemon_id')
    );
    expect(del.sql).toContain('AND user_id = ?');
    expect(del.params).toEqual(['poke-9', 'token-user']);
  });

  it('rejects unauthenticated team removals', async () => {
    const { db } = createTeamDbMock();
    const response = await app.request('/api/team/poke-9', {
      method: 'DELETE',
    }, { DB: db });

    expect(response.status).toBe(401);
  });
});
