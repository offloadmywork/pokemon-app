import { v4 as uuidv4 } from 'uuid';
import {
  getWeekKey,
  getWeeklyMissionsForWeek,
  resolveWeeklyMissionRewards,
} from '../src/game/weeklyMissions.js';

export async function getTrainerLevel(db, userId) {
  const { results } = await db.prepare(
    'SELECT level FROM player_progress WHERE user_id = ?'
  ).bind(userId).all();

  const parsed = Number(results?.[0]?.level);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
}

export async function listWeeklyMissions(db, userId, weekKey = getWeekKey()) {
  const { results } = await db.prepare(
    `SELECT mission_key, event, title, description, target, progress,
            reward_xp, reward_coins, claimed_at
     FROM weekly_missions
     WHERE user_id = ? AND week_key = ?
     ORDER BY created_at, mission_key`
  ).bind(userId, weekKey).all();

  return results || [];
}

export async function ensureWeeklyMissions(db, userId, weekKey = getWeekKey(), idFactory = uuidv4) {
  const existing = await listWeeklyMissions(db, userId, weekKey);
  if (existing.length > 0) return existing;

  const trainerLevel = await getTrainerLevel(db, userId);
  const missions = getWeeklyMissionsForWeek(trainerLevel, weekKey);

  for (const mission of missions) {
    await db.prepare(
      `INSERT INTO weekly_missions (
        id, user_id, week_key, mission_key, event, title, description,
        target, progress, reward_xp, reward_coins, claimed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, NULL)
      ON CONFLICT(user_id, week_key, mission_key) DO NOTHING`
    ).bind(
      idFactory(),
      userId,
      weekKey,
      mission.key,
      mission.event,
      mission.title,
      mission.description,
      mission.target,
      Math.round(mission.reward_xp),
      Math.round(mission.reward_coins),
    ).run();
  }

  return listWeeklyMissions(db, userId, weekKey);
}

export async function incrementWeeklyMissionProgress(db, userId, event, amount = 1, weekKey = getWeekKey()) {
  const safeAmount = Number(amount);
  if (!Number.isFinite(safeAmount) || safeAmount <= 0) {
    return { updated: [] };
  }

  // Only bump missions for the current week that are not already complete.
  await db.prepare(
    `UPDATE weekly_missions
     SET progress = MIN(target, progress + ?),
         updated_at = datetime('now')
     WHERE user_id = ?
       AND week_key = ?
       AND event = ?
       AND progress < target`
  ).bind(Math.floor(safeAmount), userId, weekKey, event).run();

  return { updated: await listWeeklyMissions(db, userId, weekKey) };
}

export async function claimWeeklyMissionRewards(db, userId, weekKey = getWeekKey(), grantXp, addWalletReward, grantUserItem) {
  const missions = await ensureWeeklyMissions(db, userId, weekKey);
  const result = resolveWeeklyMissionRewards(
    missions.map((mission) => ({
      ...mission,
      progress: Number(mission.progress) || 0,
      target: Number(mission.target) || 0,
    })),
  );

  if (result.claimedCount === 0) {
    return { ...result, wallet: null };
  }

  const claimedByKey = new Map(missions.map((m) => [m.mission_key, m.claimed_at]));
  const newlyClaimed = result.updated.filter(
    (mission) => mission.claimed_at && !claimedByKey.get(mission.mission_key)
  );

  for (const mission of newlyClaimed) {
    await db.prepare(
      `UPDATE weekly_missions
       SET claimed_at = ?, updated_at = datetime('now')
       WHERE user_id = ? AND week_key = ? AND mission_key = ?`
    ).bind(mission.claimed_at, userId, weekKey, mission.mission_key).run();
  }

  let wallet = null;
  if (typeof grantXp === 'function' && result.totalXp > 0) {
    await grantXp(result.totalXp);
  }
  if (typeof addWalletReward === 'function' && result.totalCoins > 0) {
    wallet = await addWalletReward({ coins: result.totalCoins });
  }
  if (typeof grantUserItem === 'function' && result.chestGranted && result.chest) {
    await grantUserItem(result.chest.item_id, result.chest.quantity);
  }

  return { ...result, wallet };
}
