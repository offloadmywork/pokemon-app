import { describe, expect, it } from 'vitest';
import {
  calculatePvpRewards,
  calculatePvpTeamPower,
  canEnterPvpQueue,
  resolvePvpBattleResult,
  selectPvpOpponent,
} from './pvp';

describe('PvP matchmaking', () => {
  it('calculates team power from living team members only', () => {
    const team = [
      { pokemon_id: 'p1', power_level: 40, currentHP: 20 },
      { pokemon_id: 'p2', power_level: 30, currentHP: 0 },
      { pokemon_id: 'p3', power_level: 25, currentHP: 10 },
    ];

    expect(calculatePvpTeamPower(team)).toBe(65);
  });

  it('requires at least one living team member to enter matchmaking', () => {
    expect(canEnterPvpQueue([{ pokemon_id: 'p1', power_level: 20, currentHP: 1 }])).toEqual({
      eligible: true,
      teamPower: 20,
      reason: null,
    });

    expect(canEnterPvpQueue([{ pokemon_id: 'p1', power_level: 20, currentHP: 0 }])).toEqual({
      eligible: false,
      teamPower: 0,
      reason: 'Add a living Pokemon to your team before entering PvP.',
    });
  });

  it('selects the closest opponent within the fair power range', () => {
    const playerTeam = [
      { pokemon_id: 'p1', power_level: 50, currentHP: 80 },
      { pokemon_id: 'p2', power_level: 30, currentHP: 60 },
    ];
    const opponents = [
      { user_id: 'too-low', team_power: 40 },
      { user_id: 'close-low', team_power: 70 },
      { user_id: 'close-high', team_power: 86 },
      { user_id: 'too-high', team_power: 130 },
    ];

    expect(selectPvpOpponent(playerTeam, opponents)).toEqual({
      matched: true,
      playerPower: 80,
      opponent: { user_id: 'close-high', team_power: 86 },
    });
  });

  it('returns an unmatched result when no fair opponent exists', () => {
    const result = selectPvpOpponent(
      [{ pokemon_id: 'p1', power_level: 50, currentHP: 80 }],
      [{ user_id: 'too-high', team_power: 120 }]
    );

    expect(result).toEqual({
      matched: false,
      playerPower: 50,
      opponent: null,
      reason: 'No fair PvP opponent is available right now.',
    });
  });

  it('resolves a PvP win when the opponent team is wiped', () => {
    const result = resolvePvpBattleResult({
      playerTeam: [{ pokemon_id: 'p1', power_level: 50, currentHP: 12 }],
      opponentTeam: [{ pokemon_id: 'o1', power_level: 45, currentHP: 0 }],
    });

    expect(result).toEqual({
      status: 'complete',
      outcome: 'win',
      winner: 'player',
      loser: 'opponent',
      playerRemainingPokemon: 1,
      opponentRemainingPokemon: 0,
    });
  });

  it('resolves a PvP loss when the player team is wiped', () => {
    const result = resolvePvpBattleResult({
      playerTeam: [{ pokemon_id: 'p1', power_level: 50, currentHP: 0 }],
      opponentTeam: [{ pokemon_id: 'o1', power_level: 45, currentHP: 9 }],
    });

    expect(result).toEqual(expect.objectContaining({
      status: 'complete',
      outcome: 'loss',
      winner: 'opponent',
      loser: 'player',
    }));
  });

  it('keeps PvP in progress while both teams still have living Pokemon', () => {
    const result = resolvePvpBattleResult({
      playerTeam: [{ pokemon_id: 'p1', power_level: 50, currentHP: 1 }],
      opponentTeam: [{ pokemon_id: 'o1', power_level: 45, currentHP: 1 }],
    });

    expect(result).toEqual({
      status: 'in_progress',
      outcome: null,
      winner: null,
      loser: null,
      playerRemainingPokemon: 1,
      opponentRemainingPokemon: 1,
    });
  });

  it('resolves a PvP draw when both teams are wiped', () => {
    const result = resolvePvpBattleResult({
      playerTeam: [{ pokemon_id: 'p1', power_level: 50, currentHP: 0 }],
      opponentTeam: [{ pokemon_id: 'o1', power_level: 45, currentHP: 0 }],
    });

    expect(result).toEqual(expect.objectContaining({
      status: 'complete',
      outcome: 'draw',
      winner: null,
      loser: null,
    }));
  });

  it('calculates deterministic PvP rewards from the match outcome', () => {
    expect(calculatePvpRewards('win')).toEqual({ xp: 50, coins: 20 });
    expect(calculatePvpRewards('draw')).toEqual({ xp: 20, coins: 10 });
    expect(calculatePvpRewards('loss')).toEqual({ xp: 10, coins: 5 });
  });
});
