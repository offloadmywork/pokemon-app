import { describe, expect, it } from 'vitest';
import {
  buildCoopRaidBoss,
  calculateCoopRaidPartyPower,
  calculateCoopRaidTeamPower,
  canStartCoopRaid,
  resolveCoopRaidAttempt,
} from './coopRaids';

const livingTeam = [
  { pokemon_id: 'p1', power_level: 40, currentHP: 80 },
  { pokemon_id: 'p2', power_level: 25, currentHP: 0 },
  { pokemon_id: 'p3', power_level: 35, currentHP: 20 },
];

describe('Co-op raid domain rules', () => {
  it('calculates raid team power from living Pokemon only', () => {
    expect(calculateCoopRaidTeamPower(livingTeam)).toBe(75);
  });

  it('calculates party power across eligible raid participants', () => {
    const participants = [
      { user_id: 'player-1', team: livingTeam },
      { user_id: 'player-2', team: [{ pokemon_id: 'p4', power_level: 60, currentHP: 100 }] },
      { user_id: 'player-3', team: [{ pokemon_id: 'p5', power_level: 99, currentHP: 0 }] },
    ];

    expect(calculateCoopRaidPartyPower(participants)).toBe(135);
  });

  it('requires at least two trainers with living Pokemon to start a co-op raid', () => {
    expect(canStartCoopRaid([
      { user_id: 'player-1', team: livingTeam },
      { user_id: 'player-2', team: [{ pokemon_id: 'p4', power_level: 60, currentHP: 100 }] },
    ])).toEqual({
      eligible: true,
      eligibleTrainerCount: 2,
      partyPower: 135,
      reason: null,
    });

    expect(canStartCoopRaid([
      { user_id: 'player-1', team: livingTeam },
      { user_id: 'player-2', team: [{ pokemon_id: 'p4', power_level: 60, currentHP: 0 }] },
    ])).toEqual({
      eligible: false,
      eligibleTrainerCount: 1,
      partyPower: 75,
      reason: 'Invite at least two trainers with living Pokemon to start a co-op raid.',
    });
  });

  it('builds a deterministic raid boss that scales by level', () => {
    expect(buildCoopRaidBoss({ level: 1 })).toEqual({
      id: 'verdant-titan',
      name: 'Verdant Titan',
      level: 1,
      maxHP: 180,
      currentHP: 180,
      power: 70,
      reward_xp: 80,
      reward_coins: 30,
    });

    expect(buildCoopRaidBoss({ level: 5 })).toEqual(expect.objectContaining({
      level: 5,
      maxHP: 420,
      currentHP: 420,
      power: 150,
      reward_xp: 160,
      reward_coins: 70,
    }));
  });

  it('resolves raid victory and grants rewards to eligible participants', () => {
    const participants = [
      { user_id: 'player-1', team: livingTeam },
      { user_id: 'player-2', team: [{ pokemon_id: 'p4', power_level: 60, currentHP: 100 }] },
      { user_id: 'player-3', team: [{ pokemon_id: 'p5', power_level: 99, currentHP: 0 }] },
    ];
    const boss = buildCoopRaidBoss({ level: 1 });

    expect(resolveCoopRaidAttempt({ participants, boss, damageDealt: 200 })).toEqual({
      status: 'complete',
      outcome: 'win',
      boss: expect.objectContaining({ currentHP: 0 }),
      partyPower: 135,
      rewards: [
        { user_id: 'player-1', xp: 80, coins: 30 },
        { user_id: 'player-2', xp: 80, coins: 30 },
      ],
    });
  });

  it('keeps the raid in progress when the boss survives', () => {
    const boss = buildCoopRaidBoss({ level: 2 });

    expect(resolveCoopRaidAttempt({
      participants: [
        { user_id: 'player-1', team: livingTeam },
        { user_id: 'player-2', team: [{ pokemon_id: 'p4', power_level: 60, currentHP: 100 }] },
      ],
      boss,
      damageDealt: 90,
    })).toEqual({
      status: 'in_progress',
      outcome: null,
      boss: expect.objectContaining({ currentHP: 150 }),
      partyPower: 135,
      rewards: [],
    });
  });
});
