import { generateRecoveryPhrase, isValidRecoveryPhrase, normalizeRecoveryPhrase } from '../src/game/recoveryPhrase.js';

// Recovery phrase persistence (Epic E4: Save Safety).
// One phrase per save; registering twice returns the same phrase.

export async function getOrCreateRecoveryPhrase(db, userId) {
  const { results } = await db.prepare(
    'SELECT code FROM recovery_codes WHERE user_id = ?'
  ).bind(userId).all();

  if (results?.[0]?.code) {
    return { code: results[0].code };
  }

  // Retry on the (rare) collision path.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateRecoveryPhrase();
    try {
      await db.prepare(
        `INSERT INTO recovery_codes (code, user_id)
         VALUES (?, ?)
         ON CONFLICT(user_id) DO NOTHING`
      ).bind(code, userId).run();

      const { results: check } = await db.prepare(
        'SELECT code FROM recovery_codes WHERE user_id = ?'
      ).bind(userId).all();
      if (check?.[0]?.code) return { code: check[0].code };
    } catch {
      // Code collision — loop and try a new phrase.
    }
  }

  return { error: 'Could not generate a recovery phrase. Try again.' };
}

export async function findUserIdByRecoveryPhrase(db, phrase) {
  const normalized = normalizeRecoveryPhrase(phrase);
  if (!isValidRecoveryPhrase(normalized)) {
    // Uniform rejection: never reveal whether the phrase was malformed vs unknown.
    return { error: 'No save found for that recovery phrase.' };
  }

  const { results } = await db.prepare(
    'SELECT user_id FROM recovery_codes WHERE code = ?'
  ).bind(normalized).all();

  if (results?.[0]?.user_id) {
    return { user_id: results[0].user_id };
  }
  return { error: 'No save found for that recovery phrase.' };
}
