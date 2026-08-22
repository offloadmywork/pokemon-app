import { v4 as uuidv4 } from 'uuid';
import { calculateDailyQuestStreak } from '../src/game/dailyQuestStreak.js';

export async function ensureDailyQuestStreak(db, userId) {
  await db.prepare(
    `INSERT INTO daily_quest_streaks (user_id, current_streak, longest_streak, updated_at)
     VALUES (?, 0, 0, datetime('now'))
     ON CONFLICT(user_id) DO NOTHING`
  ).bind(userId).run();

  const { results } = await db.prepare(
    'SELECT * FROM daily_quest_streaks WHERE user_id = ?'
  ).bind(userId).all();

  return results[0];
}

export async function grantUserItem(db, userId, itemId, quantity, idFactory = uuidv4) {
  if (!itemId || quantity <= 0) return null;

  const { results: existing } = await db.prepare(
    'SELECT id, quantity FROM user_items WHERE user_id = ? AND item_id = ?'
  ).bind(userId, itemId).all();

  if (existing.length > 0) {
    const nextQuantity = existing[0].quantity + quantity;
    await db.prepare(
      'UPDATE user_items SET quantity = ?, updated_at = datetime(\'now\') WHERE id = ?'
    ).bind(nextQuantity, existing[0].id).run();

    return { item_id: itemId, quantity: nextQuantity };
  }

  await db.prepare(
    'INSERT INTO user_items (id, user_id, item_id, quantity) VALUES (?, ?, ?, ?)'
  ).bind(idFactory(), userId, itemId, quantity).run();

  return { item_id: itemId, quantity };
}

export async function applyDailyQuestStreakAfterClaim(
  db,
  userId,
  quests,
  claimDate = new Date().toISOString().slice(0, 10),
  idFactory = uuidv4
) {
  const existing = await ensureDailyQuestStreak(db, userId);
  const result = calculateDailyQuestStreak({
    quests,
    currentStreak: existing.current_streak ?? 0,
    lastClaimDate: existing.last_claim_date,
    claimDate,
  });

  if (!result.changed) {
    return {
      streak: result.streak,
      longest_streak: existing.longest_streak ?? result.streak,
      bonus: null,
      changed: false,
    };
  }

  const longestStreak = Math.max(existing.longest_streak ?? 0, result.streak);
  await db.prepare(
    `UPDATE daily_quest_streaks
     SET current_streak = ?,
         longest_streak = ?,
         last_claim_date = ?,
         updated_at = datetime('now')
     WHERE user_id = ?`
  ).bind(result.streak, longestStreak, claimDate, userId).run();

  let grantedBonus = null;
  if (result.bonus) {
    grantedBonus = await grantUserItem(
      db,
      userId,
      result.bonus.item_id,
      result.bonus.quantity,
      idFactory
    );
  }

  return {
    streak: result.streak,
    longest_streak: longestStreak,
    bonus: grantedBonus,
    changed: true,
  };
}
