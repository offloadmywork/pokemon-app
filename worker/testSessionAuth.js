import { createSessionToken } from './sessionTokens';

// Shared helper for worker route tests that hit session-protected endpoints.
export const TEST_SESSION_SECRET = '***';

export async function sessionAuthHeader(userId = 'user-1') {
  const token = await createSessionToken(userId, TEST_SESSION_SECRET);
  return { Authorization: `Bearer ${token}` };
}

export function sessionEnv(db) {
  return { DB: db, SESSION_SECRET: TEST_SESSION_SECRET };
}
