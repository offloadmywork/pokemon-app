import { describe, expect, it, vi } from 'vitest';
import {
  createCoopRaidRoom,
  getCoopRaidRoom,
  joinCoopRaidRoom,
  recordCoopRaidAttempt,
} from './coopRaids';

function createDbMock({ raidRows = [], participantRows = [] } = {}) {
  const calls = [];
  const db = {
    prepare: vi.fn((sql) => ({
      bind: vi.fn((...params) => ({
        run: vi.fn(async () => {
          calls.push({ type: 'run', sql, params });
          return { success: true };
        }),
        all: vi.fn(async () => {
          calls.push({ type: 'all', sql, params });
          if (sql.includes('FROM coop_raid_rooms')) {
            return { results: raidRows };
          }
          if (sql.includes('FROM coop_raid_participants')) {
            return { results: participantRows };
          }
          return { results: [] };
        }),
      })),
    })),
  };

  return { db, calls };
}

describe('co-op raid persistence', () => {
  it('creates a raid room and joins the host as the first participant', async () => {
    const { db, calls } = createDbMock();
    const boss = {
      id: 'verdant-titan',
      name: 'Verdant Titan',
      level: 1,
      maxHP: 180,
      currentHP: 180,
      power: 70,
      reward_xp: 80,
      reward_coins: 30,
    };

    const result = await createCoopRaidRoom(db, {
      raidId: 'raid-1',
      hostUserId: 'user-1',
      teamPower: 75,
      boss,
    });

    expect(result).toEqual({
      raid: {
        id: 'raid-1',
        host_user_id: 'user-1',
        boss_id: 'verdant-titan',
        boss_name: 'Verdant Titan',
        level: 1,
        max_hp: 180,
        current_hp: 180,
        power: 70,
        reward_xp: 80,
        reward_coins: 30,
        status: 'waiting',
      },
      participants: [{ raid_id: 'raid-1', user_id: 'user-1', team_power: 75 }],
      ready: false,
    });
    expect(calls).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'run',
        sql: expect.stringContaining('INSERT INTO coop_raid_rooms'),
      }),
      expect.objectContaining({
        type: 'run',
        sql: expect.stringContaining('INSERT INTO coop_raid_participants'),
        params: ['raid-1', 'user-1', 75],
      }),
    ]));
  });

  it('joins another trainer to an existing raid room', async () => {
    const { db, calls } = createDbMock({
      raidRows: [{
        id: 'raid-1',
        host_user_id: 'user-1',
        boss_id: 'verdant-titan',
        boss_name: 'Verdant Titan',
        level: 1,
        max_hp: 180,
        current_hp: 180,
        power: 70,
        reward_xp: 80,
        reward_coins: 30,
        status: 'waiting',
      }],
      participantRows: [
        { raid_id: 'raid-1', user_id: 'user-1', team_power: 75 },
        { raid_id: 'raid-1', user_id: 'user-2', team_power: 60 },
      ],
    });

    const result = await joinCoopRaidRoom(db, {
      raidId: 'raid-1',
      userId: 'user-2',
      teamPower: 60,
    });

    expect(result).toEqual({
      raid: expect.objectContaining({ id: 'raid-1', status: 'waiting' }),
      participants: [
        { raid_id: 'raid-1', user_id: 'user-1', team_power: 75 },
        { raid_id: 'raid-1', user_id: 'user-2', team_power: 60 },
      ],
      ready: true,
    });
    expect(calls).toContainEqual(expect.objectContaining({
      type: 'run',
      sql: expect.stringContaining('INSERT INTO coop_raid_participants'),
      params: ['raid-1', 'user-2', 60],
    }));
  });

  it('loads a raid room with participant readiness', async () => {
    const { db } = createDbMock({
      raidRows: [{ id: 'raid-1', host_user_id: 'user-1', status: 'waiting' }],
      participantRows: [
        { raid_id: 'raid-1', user_id: 'user-1', team_power: 75 },
        { raid_id: 'raid-1', user_id: 'user-2', team_power: 60 },
      ],
    });

    await expect(getCoopRaidRoom(db, 'raid-1')).resolves.toEqual({
      raid: { id: 'raid-1', host_user_id: 'user-1', status: 'waiting' },
      participants: [
        { raid_id: 'raid-1', user_id: 'user-1', team_power: 75 },
        { raid_id: 'raid-1', user_id: 'user-2', team_power: 60 },
      ],
      ready: true,
    });
  });

  it('records a co-op raid attack attempt and persists boss HP', async () => {
    const { db, calls } = createDbMock({
      raidRows: [{
        id: 'raid-1',
        host_user_id: 'user-1',
        boss_id: 'verdant-titan',
        boss_name: 'Verdant Titan',
        level: 1,
        max_hp: 180,
        current_hp: 180,
        power: 70,
        reward_xp: 80,
        reward_coins: 30,
        status: 'waiting',
      }],
      participantRows: [
        { raid_id: 'raid-1', user_id: 'user-1', team_power: 75 },
        { raid_id: 'raid-1', user_id: 'user-2', team_power: 60 },
      ],
    });

    const result = await recordCoopRaidAttempt(db, {
      raidId: 'raid-1',
      damageDealt: 90,
    });

    expect(result).toEqual({
      raid: expect.objectContaining({
        id: 'raid-1',
        current_hp: 90,
        status: 'in_progress',
      }),
      participants: [
        { raid_id: 'raid-1', user_id: 'user-1', team_power: 75 },
        { raid_id: 'raid-1', user_id: 'user-2', team_power: 60 },
      ],
      ready: true,
      attempt: expect.objectContaining({
        status: 'in_progress',
        outcome: null,
        partyPower: 135,
      }),
    });
    expect(calls).toContainEqual(expect.objectContaining({
      type: 'run',
      sql: expect.stringContaining('UPDATE coop_raid_rooms'),
      params: [90, 'in_progress', 'raid-1'],
    }));
  });

  it('records co-op raid victory and returns shared rewards', async () => {
    const { db } = createDbMock({
      raidRows: [{
        id: 'raid-1',
        host_user_id: 'user-1',
        boss_id: 'verdant-titan',
        boss_name: 'Verdant Titan',
        level: 1,
        max_hp: 180,
        current_hp: 80,
        power: 70,
        reward_xp: 80,
        reward_coins: 30,
        status: 'in_progress',
      }],
      participantRows: [
        { raid_id: 'raid-1', user_id: 'user-1', team_power: 75 },
        { raid_id: 'raid-1', user_id: 'user-2', team_power: 60 },
      ],
    });

    const result = await recordCoopRaidAttempt(db, {
      raidId: 'raid-1',
      damageDealt: 100,
    });

    expect(result.raid).toEqual(expect.objectContaining({
      current_hp: 0,
      status: 'complete',
    }));
    expect(result.attempt).toEqual(expect.objectContaining({
      status: 'complete',
      outcome: 'win',
      rewards: [
        { user_id: 'user-1', xp: 80, coins: 30 },
        { user_id: 'user-2', xp: 80, coins: 30 },
      ],
    }));
  });
});
