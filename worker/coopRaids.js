import { resolveCoopRaidAttempt } from '../src/game/coopRaids.js';

const MIN_READY_PARTICIPANTS = 2;

export async function createCoopRaidRoom(db, {
  raidId,
  hostUserId,
  teamPower,
  boss,
}) {
  const raid = {
    id: raidId,
    host_user_id: hostUserId,
    boss_id: boss.id,
    boss_name: boss.name,
    level: boss.level,
    max_hp: boss.maxHP,
    current_hp: boss.currentHP,
    power: boss.power,
    reward_xp: boss.reward_xp,
    reward_coins: boss.reward_coins,
    status: 'waiting',
  };

  await db.prepare(
    `INSERT INTO coop_raid_rooms (
       id, host_user_id, boss_id, boss_name, level, max_hp, current_hp,
       power, reward_xp, reward_coins, status, created_at, updated_at
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
  ).bind(
    raid.id,
    raid.host_user_id,
    raid.boss_id,
    raid.boss_name,
    raid.level,
    raid.max_hp,
    raid.current_hp,
    raid.power,
    raid.reward_xp,
    raid.reward_coins,
    raid.status,
  ).run();

  const participant = await joinRaidParticipant(db, {
    raidId,
    userId: hostUserId,
    teamPower,
  });

  return {
    raid,
    participants: [participant],
    ready: false,
  };
}

export async function joinCoopRaidRoom(db, { raidId, userId, teamPower }) {
  await joinRaidParticipant(db, { raidId, userId, teamPower });
  return getCoopRaidRoom(db, raidId);
}

export async function getCoopRaidRoom(db, raidId) {
  const { results: raidRows } = await db.prepare(
    `SELECT id, host_user_id, boss_id, boss_name, level, max_hp, current_hp,
            power, reward_xp, reward_coins, status, created_at, updated_at
     FROM coop_raid_rooms
     WHERE id = ?`
  ).bind(raidId).all();

  const raid = raidRows?.[0] || null;
  if (!raid) {
    return null;
  }

  const { results: participants } = await db.prepare(
    `SELECT raid_id, user_id, team_power, joined_at
     FROM coop_raid_participants
     WHERE raid_id = ?
     ORDER BY joined_at ASC`
  ).bind(raidId).all();

  return {
    raid,
    participants: participants || [],
    ready: isCoopRaidReady(participants || []),
  };
}

export async function recordCoopRaidAttempt(db, { raidId, damageDealt = 0 }) {
  const room = await getCoopRaidRoom(db, raidId);
  if (!room) {
    return null;
  }

  const attempt = resolveCoopRaidAttempt({
    participants: room.participants.map((participant) => ({
      user_id: participant.user_id,
      team: [{
        pokemon_id: `${participant.user_id}-raid-team`,
        power_level: participant.team_power || 0,
        currentHP: participant.team_power > 0 ? 1 : 0,
      }],
    })),
    boss: mapRaidRowToBoss(room.raid),
    damageDealt,
  });
  const nextStatus = attempt.status === 'complete' ? 'complete' : 'in_progress';

  await db.prepare(
    `UPDATE coop_raid_rooms
     SET current_hp = ?, status = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).bind(attempt.boss.currentHP, nextStatus, raidId).run();

  return {
    ...room,
    raid: {
      ...room.raid,
      current_hp: attempt.boss.currentHP,
      status: nextStatus,
    },
    attempt,
  };
}

async function joinRaidParticipant(db, { raidId, userId, teamPower }) {
  await db.prepare(
    `INSERT INTO coop_raid_participants (raid_id, user_id, team_power, joined_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(raid_id, user_id) DO UPDATE SET
       team_power = excluded.team_power,
       joined_at = datetime('now')`
  ).bind(raidId, userId, teamPower).run();

  return {
    raid_id: raidId,
    user_id: userId,
    team_power: teamPower,
  };
}

function isCoopRaidReady(participants = []) {
  return participants.filter((participant) => (participant.team_power ?? 0) > 0).length >= MIN_READY_PARTICIPANTS;
}

function mapRaidRowToBoss(raid) {
  return {
    id: raid.boss_id,
    name: raid.boss_name,
    level: raid.level,
    maxHP: raid.max_hp,
    currentHP: raid.current_hp,
    power: raid.power,
    reward_xp: raid.reward_xp,
    reward_coins: raid.reward_coins,
  };
}
