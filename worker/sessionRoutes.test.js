import { describe, expect, it, vi } from 'vitest';
import app from './index';
import { createSessionToken } from './sessionTokens';

// BDD: Server-bound identity — reward-granting routes act as the user named by
// the server-signed session token, never by a client-supplied user_id.

const SECRET = 'test-session-secret';

function createSessionDbMock({ questRows = [], streakRow = { current_streak: 0, longest_streak: 0, last_claim_date: null } } = {}) {
  const state = {
    quests: questRows.map((quest) => ({ ...quest })),
    streak: streakRow,
  };

  const db = {
    prepare: vi.fn((sql) => ({
      bind: vi.fn((...params) => ({
        run: vi.fn(async () => {
          if (sql.includes('SET claimed_at')) {
            for (const quest of state.quests) {
              if (quest.id === params[0] || (quest.user_id === params[0] && quest.quest_date === params[1])) {
                quest.claimed_at = '2026-08-25 12:00:00';
              }
            }
          }
          if (sql.includes('UPDATE daily_quest_streaks')) {
            state.streak = {
              ...state.streak,
              current_streak: params[0],
              longest_streak: params[1],
              last_claim_date: params[2],
            };
          }
          return { success: true };
        }),
        all: vi.fn(async () => {
          if (sql.includes('INSERT INTO users') || sql.includes('INTO users')) {
            return { results: [] };
          }
          if (sql.includes('FROM daily_quests')) {
            if (sql.includes('WHERE id = ? AND user_id = ?')) {
              return { results: state.quests.filter((q) => q.id === params[0] && q.user_id === params[1]) };
            }
            if (sql.includes('WHERE id IN')) {
              return { results: state.quests.filter((q) => params.includes(q.id)) };
            }
            if (sql.includes('WHERE id = ?')) {
              return { results: state.quests.filter((q) => q.id === params[0]) };
            }
            if (sql.includes('quest_date')) {
              return { results: state.quests.filter((q) => q.user_id === params[0] && q.quest_date === params[1]) };
            }
            return { results: state.quests.filter((q) => q.user_id === params[0]) };
          }
          if (sql.includes('FROM daily_quest_streaks')) {
            return { results: state.streak ? [state.streak] : [] };
          }
          if (sql.includes('FROM player_progress')) {
            return { results: [{ xp: 0, level: 1 }] };
          }
          return { results: [] };
        }),
      })),
    })),
  };

  return { db, state };
}

const completedQuest = (userId) => ({
  id: 'quest-1',
  user_id: userId,
  quest_date: '2026-08-25',
  template_key: 'catch-1',
  title: 'Catch 1',
  description: '',
  target: 1,
  progress: 1,
  reward_xp: 10,
  reward_item_id: null,
  reward_item_quantity: 0,
  completed_at: '2026-08-25 11:00:00',
  claimed_at: null,
});

describe('Session API', () => {
  it('rejects session creation without a user_id', async () => {
    const response = await app.request('/api/session', {
      method: 'POST',
      body: JSON.stringify({}),
    }, { DB: {}, SESSION_SECRET: SECRET });

    expect(response.status).toBe(400);
  });

  it('refuses to issue sessions when the server secret is not configured', async () => {
    const response = await app.request('/api/session', {
      method: 'POST',
      body: JSON.stringify({ user_id: 'user-1' }),
    }, { DB: {} });

    expect(response.status).toBe(503);
  });

  it('issues a signed token bound to the requesting user id', async () => {
    const { db } = createSessionDbMock();
    const response = await app.request('/api/session', {
      method: 'POST',
      body: JSON.stringify({ user_id: 'user-1' }),
    }, { DB: db, SESSION_SECRET: SECRET });

    expect(response.status).toBe(200);
    const { token } = await response.json();
    expect(typeof token).toBe('string');
    // The token round-trips through the same verifier used by protected routes.
    const { verifySessionToken } = await import('./sessionTokens');
    const session = await verifySessionToken(token, SECRET);
    expect(session?.userId).toBe('user-1');
  });
});

describe('Session-protected daily quest claims', () => {
  it('rejects claims without a Bearer session token (401)', async () => {
    const { db } = createSessionDbMock({ questRows: [completedQuest('user-1')] });
    const response = await app.request('/api/daily-quests/quest-1/claim', {
      method: 'POST',
      body: JSON.stringify({ user_id: 'user-1' }),
    }, { DB: db, SESSION_SECRET: SECRET });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Valid session required' });
  });

  it('rejects claims with a tampered or foreign-secret token (401)', async () => {
    const { db } = createSessionDbMock({ questRows: [completedQuest('user-1')] });
    const forged = await createSessionToken('user-1', 'wrong-secret');
    const response = await app.request('/api/daily-quests/quest-1/claim', {
      method: 'POST',
      headers: { authorization: `Bearer ${forged}` },
      body: JSON.stringify({ user_id: 'user-1' }),
    }, { DB: db, SESSION_SECRET: SECRET });

    expect(response.status).toBe(401);
  });

  it('claims as the token subject even when the body names another user', async () => {
    const attackerBody = { user_id: 'victim-user' };
    const { db, state } = createSessionDbMock({ questRows: [completedQuest('token-user')] });
    const token = await createSessionToken('token-user', SECRET);

    const response = await app.request('/api/daily-quests/quest-1/claim', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify(attackerBody),
    }, { DB: db, SESSION_SECRET: SECRET });

    expect(response.status).toBe(200);
    const claimed = await response.json();
    expect(claimed.user_id).toBe('token-user');
    expect(state.quests[0].claimed_at).toBeTruthy();
  });

  it('supports the legacy alias route with a valid session', async () => {
    const { db } = createSessionDbMock({ questRows: [completedQuest('user-9')] });
    const token = await createSessionToken('user-9', SECRET);

    const response = await app.request('/api/quests/daily/quest-1/claim', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ user_id: 'user-9' }),
    }, { DB: db, SESSION_SECRET: SECRET });

    expect(response.status).toBe(200);
  });
});
