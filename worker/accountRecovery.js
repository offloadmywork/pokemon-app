import { generateRecoveryCode, isValidRecoveryCodeFormat, normalizeRecoveryCode } from '../src/game/recoveryCode.js';

// Account recovery persistence (Epic E4 — Save Safety).
// Every trainer gets a stable human-readable code; entering it on a new
// device restores the account mapping without exposing raw user ids.

export async function ensureRecoveryCode(db, userId) {
  const { results } = await db.prepare(
    'SELECT recovery_code FROM account_recovery WHERE user_id = ?'
  ).bind(userId).all();

  if (results?.[0]?.recovery_code) {
    return results[0].recovery_code;
  }

  // Retry on the (rare) chance of an alphabet collision.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateRecoveryCode();
    try {
      await db.prepare(
        `INSERT INTO account_recovery (recovery_code, user_id)
         VALUES (?, ?)`
      ).bind(code, userId).run();
      return code;
    } catch (error) {
      if (!String(error?.message || '').includes('UNIQUE')) throw error;
    }
  }
  throw new Error('Could not allocate a recovery code.');
}

export async function findUserIdByRecoveryCode(db, rawCode) {
  const code = normalizeRecoveryCode(rawCode);
  if (!isValidRecoveryCodeFormat(code)) return null;

  const { results } = await db.prepare(
    'SELECT user_id FROM account_recovery WHERE recovery_code = ?'
  ).bind(code).all();

  return results?.[0]?.user_id || null;
}
