import { v4 as uuidv4 } from 'uuid';

export async function recordPvpMatchResult(db, match, idFactory = uuidv4) {
  const id = match.id || idFactory();
  const winnerUserId = match.winner_user_id ?? null;
  const playerRemainingPokemon = match.player_remaining_pokemon ?? 0;
  const opponentRemainingPokemon = match.opponent_remaining_pokemon ?? 0;

  await db.prepare(
    `INSERT INTO pvp_matches (
       id,
       player_user_id,
       opponent_user_id,
       outcome,
       winner_user_id,
       player_remaining_pokemon,
       opponent_remaining_pokemon,
       completed_at
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  ).bind(
    id,
    match.player_user_id,
    match.opponent_user_id,
    match.outcome,
    winnerUserId,
    playerRemainingPokemon,
    opponentRemainingPokemon
  ).run();

  const { results } = await db.prepare(
    `SELECT id,
            player_user_id,
            opponent_user_id,
            outcome,
            winner_user_id,
            player_remaining_pokemon,
            opponent_remaining_pokemon,
            completed_at
     FROM pvp_matches
     WHERE id = ?`
  ).bind(id).all();

  return results[0] || {
    id,
    player_user_id: match.player_user_id,
    opponent_user_id: match.opponent_user_id,
    outcome: match.outcome,
    winner_user_id: winnerUserId,
    player_remaining_pokemon: playerRemainingPokemon,
    opponent_remaining_pokemon: opponentRemainingPokemon,
  };
}

export async function listPvpMatchHistory(db, userId, limit = 5) {
  const safeLimit = Math.max(1, Math.min(20, Number(limit) || 5));
  const { results } = await db.prepare(
    `SELECT id,
            player_user_id,
            opponent_user_id,
            outcome,
            winner_user_id,
            player_remaining_pokemon,
            opponent_remaining_pokemon,
            completed_at
     FROM pvp_matches
     WHERE player_user_id = ? OR opponent_user_id = ?
     ORDER BY completed_at DESC
     LIMIT ?`
  ).bind(userId, userId, safeLimit).all();

  return results || [];
}
