export async function listBossClears(db, userId) {
  const { results } = await db.prepare(
    `SELECT boss_key, name, reward_xp, cleared_at, updated_at
     FROM boss_clears
     WHERE user_id = ?
     ORDER BY cleared_at DESC`
  ).bind(userId).all();

  return results;
}

export async function recordBossClear(db, userId, clear) {
  const bossKey = clear.boss_key;
  const name = clear.name;
  const rewardXP = clear.reward_xp ?? clear.rewardXP ?? 0;
  const clearedAt = clear.cleared_at || new Date().toISOString();

  await db.prepare(
    `INSERT INTO boss_clears (user_id, boss_key, name, reward_xp, cleared_at, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id, boss_key) DO UPDATE SET
       name = excluded.name,
       reward_xp = excluded.reward_xp,
       cleared_at = excluded.cleared_at,
       updated_at = datetime('now')`
  ).bind(userId, bossKey, name, rewardXP, clearedAt).run();

  const { results } = await db.prepare(
    `SELECT user_id, boss_key, name, reward_xp, cleared_at, updated_at
     FROM boss_clears
     WHERE user_id = ? AND boss_key = ?`
  ).bind(userId, bossKey).all();

  return results[0] || {
    user_id: userId,
    boss_key: bossKey,
    name,
    reward_xp: rewardXP,
    cleared_at: clearedAt,
  };
}
