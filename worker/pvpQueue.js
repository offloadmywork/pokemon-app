import { selectPvpOpponent } from '../src/game/pvp.js';

const DEFAULT_POWER_TOLERANCE = 0.25;

export async function upsertPvpQueueEntry(db, userId, teamPower) {
  await db.prepare(
    `INSERT INTO pvp_queue (user_id, team_power, queued_at, updated_at)
     VALUES (?, ?, datetime('now'), datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET
       team_power = excluded.team_power,
       queued_at = datetime('now'),
       updated_at = datetime('now')`
  ).bind(userId, teamPower).run();

  return {
    user_id: userId,
    team_power: teamPower,
  };
}

export async function findQueuedPvpOpponent(db, userId, teamPower, options = {}) {
  const tolerance = options.powerTolerance ?? DEFAULT_POWER_TOLERANCE;
  const minPower = Math.floor(teamPower * (1 - tolerance));
  const maxPower = Math.ceil(teamPower * (1 + tolerance));

  const { results } = await db.prepare(
    `SELECT user_id, team_power, queued_at
     FROM pvp_queue
     WHERE user_id != ?
       AND team_power >= ?
       AND team_power <= ?
     ORDER BY ABS(team_power - ?) ASC, queued_at ASC
     LIMIT 10`
  ).bind(userId, minPower, maxPower, teamPower).all();

  return selectPvpOpponent([{ power_level: teamPower, currentHP: 1 }], results);
}

export async function getPvpOpponentTeam(db, userId) {
  const { results } = await db.prepare(
    `SELECT pokemon_id, name, type, power_level, rarity, image_url, maxHP, currentHP, position
     FROM team
     WHERE user_id = ?
     ORDER BY position ASC`
  ).bind(userId).all();

  return results || [];
}

export async function leavePvpQueue(db, userId) {
  await db.prepare(
    'DELETE FROM pvp_queue WHERE user_id = ?'
  ).bind(userId).run();

  return { queued: false };
}
