export async function getPlayerWallet(db, userId) {
  if (!userId) {
    return { user_id: null, coins: 0, shards: 0 };
  }

  const { results } = await db.prepare(
    'SELECT user_id, coins, shards FROM player_wallet WHERE user_id = ?'
  ).bind(userId).all();

  return results?.[0] || {
    user_id: userId,
    coins: 0,
    shards: 0,
  };
}

export async function grantPlayerCoins(db, userId, coins = 0) {
  if (!userId || coins <= 0) return null;

  const { results } = await db.prepare(
    'SELECT coins FROM player_wallet WHERE user_id = ?'
  ).bind(userId).all();

  const currentCoins = results?.[0]?.coins || 0;
  const nextCoins = currentCoins + coins;

  if (results?.[0]) {
    await db.prepare(
      `UPDATE player_wallet
       SET coins = ?, updated_at = datetime('now')
       WHERE user_id = ?`
    ).bind(nextCoins, userId).run();
  } else {
    await db.prepare(
      `INSERT INTO player_wallet (user_id, coins, updated_at)
       VALUES (?, ?, datetime('now'))`
    ).bind(userId, nextCoins).run();
  }

  return { coins: nextCoins };
}
