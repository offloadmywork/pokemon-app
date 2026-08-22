import { describe, expect, it } from 'vitest';
import { PvpBattleViewModel, createPvpBattleViewModel } from './PvpBattleViewModel';

const playerTeam = [
  { pokemon_id: 'p1', name: 'Pikachu', power_level: 50, maxHP: 100, currentHP: 100 },
  { pokemon_id: 'p2', name: 'Charmander', power_level: 30, maxHP: 90, currentHP: 0 },
];

const opponentTeam = [
  { pokemon_id: 'o1', name: 'Squirtle', power_level: 45, maxHP: 95, currentHP: 95 },
];

describe('PvpBattleViewModel', () => {
  it('initializes both teams and selects the first living active Pokemon', () => {
    const vm = createPvpBattleViewModel({ playerTeam, opponentTeam });

    expect(vm.playerTeam).toEqual(playerTeam);
    expect(vm.opponentTeam).toEqual(opponentTeam);
    expect(vm.activePlayerPokemon.name).toBe('Pikachu');
    expect(vm.activeOpponentPokemon.name).toBe('Squirtle');
    expect(vm.result.status).toBe('in_progress');
  });

  it('applies player damage to the active opponent and resolves a win', () => {
    const vm = createPvpBattleViewModel({ playerTeam, opponentTeam });

    const result = vm.damageOpponent(120);

    expect(vm.opponentTeam[0].currentHP).toBe(0);
    expect(result).toEqual(expect.objectContaining({
      status: 'complete',
      outcome: 'win',
      winner: 'player',
    }));
    expect(vm.canSubmitResult).toBe(true);
  });

  it('runs a player attack turn with opponent retaliation and turn log', () => {
    const vm = createPvpBattleViewModel({ playerTeam, opponentTeam });

    const result = vm.playerAttack();

    expect(result.status).toBe('in_progress');
    expect(vm.turnNumber).toBe(2);
    expect(vm.playerEnergy).toBe(1);
    expect(vm.opponentTeam[0].currentHP).toBe(45);
    expect(vm.playerTeam[0].currentHP).toBe(55);
    expect(vm.turnLog).toEqual([
      'Pikachu hit Squirtle for 50 damage.',
      'Squirtle hit Pikachu for 45 damage.',
    ]);
  });

  it('does not retaliate after the player defeats the active opponent', () => {
    const vm = createPvpBattleViewModel({
      playerTeam,
      opponentTeam: [{ ...opponentTeam[0], currentHP: 20 }],
    });

    const result = vm.playerAttack();

    expect(result).toEqual(expect.objectContaining({
      status: 'complete',
      outcome: 'win',
    }));
    expect(vm.turnNumber).toBe(1);
    expect(vm.playerTeam[0].currentHP).toBe(100);
    expect(vm.turnLog).toEqual([
      'Pikachu hit Squirtle for 50 damage.',
      'Squirtle fainted.',
      'Battle complete: win.',
    ]);
  });

  it('requires energy before using a PvP special attack', () => {
    const vm = createPvpBattleViewModel({ playerTeam, opponentTeam });

    expect(vm.canUseSpecialAttack).toBe(false);
    expect(vm.specialAttack()).toEqual({
      used: false,
      reason: 'Build 2 energy with basic attacks before using a special move.',
    });
    expect(vm.turnLog).toEqual([]);
  });

  it('uses energy for a stronger PvP special attack', () => {
    const vm = createPvpBattleViewModel({
      playerTeam: [
        { ...playerTeam[0], power_level: 20, currentHP: 100 },
      ],
      opponentTeam: [
        { ...opponentTeam[0], power_level: 5, currentHP: 100 },
      ],
    });

    vm.playerAttack();
    vm.playerAttack();

    expect(vm.playerEnergy).toBe(2);
    expect(vm.canUseSpecialAttack).toBe(true);

    const result = vm.specialAttack();

    expect(result.status).toBe('in_progress');
    expect(vm.playerEnergy).toBe(0);
    expect(vm.opponentTeam[0].currentHP).toBe(20);
    expect(vm.turnLog).toContain('Pikachu used Special Strike on Squirtle for 40 damage.');
  });

  it('guards to build energy and reduce opponent retaliation damage', () => {
    const vm = createPvpBattleViewModel({
      playerTeam: [
        { ...playerTeam[0], power_level: 20, currentHP: 100 },
      ],
      opponentTeam: [
        { ...opponentTeam[0], power_level: 24, currentHP: 100 },
      ],
    });

    const result = vm.playerGuard();

    expect(result.status).toBe('in_progress');
    expect(vm.playerEnergy).toBe(1);
    expect(vm.playerTeam[0].currentHP).toBe(88);
    expect(vm.opponentTeam[0].currentHP).toBe(100);
    expect(vm.turnNumber).toBe(2);
    expect(vm.turnLog).toEqual([
      'Pikachu guarded and built energy.',
      'Squirtle hit Pikachu for 12 guarded damage.',
    ]);
  });

  it('applies PvP type effectiveness to attacks and retaliation', () => {
    const vm = createPvpBattleViewModel({
      playerTeam: [
        { ...playerTeam[0], type: 'Electric', power_level: 20, currentHP: 100 },
      ],
      opponentTeam: [
        { ...opponentTeam[0], type: 'Water', power_level: 10, currentHP: 100 },
      ],
    });

    const result = vm.playerAttack();

    expect(result.status).toBe('in_progress');
    expect(vm.opponentTeam[0].currentHP).toBe(70);
    expect(vm.playerTeam[0].currentHP).toBe(94);
    expect(vm.turnLog).toEqual([
      "Pikachu hit Squirtle for 30 damage. It's super effective!",
      "Squirtle hit Pikachu for 6 damage. It's not very effective.",
    ]);
  });

  it('hands off to the next opponent Pokemon when the active opponent faints', () => {
    const vm = createPvpBattleViewModel({
      playerTeam,
      opponentTeam: [
        { ...opponentTeam[0], currentHP: 20 },
        { pokemon_id: 'o2', name: 'Bulbasaur', power_level: 30, maxHP: 85, currentHP: 85 },
      ],
    });

    const result = vm.playerAttack();

    expect(result.status).toBe('in_progress');
    expect(vm.opponentTeam[0].currentHP).toBe(0);
    expect(vm.activeOpponentPokemon.name).toBe('Bulbasaur');
    expect(vm.playerTeam[0].currentHP).toBe(70);
    expect(vm.turnLog).toEqual([
      'Pikachu hit Squirtle for 50 damage.',
      'Squirtle fainted.',
      'Bulbasaur entered the battle.',
      'Bulbasaur hit Pikachu for 30 damage.',
    ]);
  });

  it('hands off to the next player Pokemon when the active player faints', () => {
    const vm = createPvpBattleViewModel({
      playerTeam: [
        { ...playerTeam[0], currentHP: 20 },
        { ...playerTeam[1], currentHP: 90 },
      ],
      opponentTeam,
    });

    const result = vm.playerAttack();

    expect(result.status).toBe('in_progress');
    expect(vm.playerTeam[0].currentHP).toBe(0);
    expect(vm.activePlayerPokemon.name).toBe('Charmander');
    expect(vm.turnLog).toEqual([
      'Pikachu hit Squirtle for 50 damage.',
      'Squirtle hit Pikachu for 45 damage.',
      'Pikachu fainted.',
      'Charmander entered the battle.',
    ]);
  });

  it('switches to a living bench Pokemon and records the handoff', () => {
    const vm = createPvpBattleViewModel({
      playerTeam: [
        playerTeam[0],
        { ...playerTeam[1], currentHP: 90 },
      ],
      opponentTeam,
    });

    const switchResult = vm.switchPlayerPokemon(1);

    expect(switchResult).toEqual({
      switched: true,
      activePokemon: expect.objectContaining({ name: 'Charmander' }),
    });
    expect(vm.activePlayerPokemon.name).toBe('Charmander');
    expect(vm.turnLog).toEqual([
      'Pikachu switched out.',
      'Charmander entered the battle.',
    ]);
  });

  it('rejects switching to a fainted or already active Pokemon', () => {
    const vm = createPvpBattleViewModel({ playerTeam, opponentTeam });

    expect(vm.switchPlayerPokemon(1)).toEqual({
      switched: false,
      reason: 'Choose a living Pokemon.',
    });
    expect(vm.switchPlayerPokemon(0)).toEqual({
      switched: false,
      reason: 'Pikachu is already active.',
    });
    expect(vm.activePlayerPokemon.name).toBe('Pikachu');
    expect(vm.turnLog).toEqual([]);
  });

  it('forfeits an in-progress PvP battle as a player loss', () => {
    const vm = createPvpBattleViewModel({ playerTeam, opponentTeam });

    const result = vm.forfeit();

    expect(result).toEqual(expect.objectContaining({
      status: 'complete',
      outcome: 'loss',
      winner: 'opponent',
    }));
    expect(vm.playerTeam.every((pokemon) => pokemon.currentHP === 0)).toBe(true);
    expect(vm.turnLog).toEqual([
      'Pikachu forfeited the battle.',
      'Battle complete: loss.',
    ]);
    expect(vm.buildMatchResultPayload('opponent-1')).toEqual({
      opponent_user_id: 'opponent-1',
      player_team: vm.playerTeam,
      opponent_team: vm.opponentTeam,
    });
  });

  it('applies opponent damage to the active player and resolves a loss', () => {
    const vm = createPvpBattleViewModel({ playerTeam, opponentTeam });

    const result = vm.damagePlayer(120);

    expect(vm.playerTeam[0].currentHP).toBe(0);
    expect(result).toEqual(expect.objectContaining({
      status: 'complete',
      outcome: 'loss',
      winner: 'opponent',
    }));
  });

  it('does not build a submission payload while both teams still have living Pokemon', () => {
    const vm = createPvpBattleViewModel({ playerTeam, opponentTeam });

    expect(vm.buildMatchResultPayload('opponent-1')).toBe(null);
  });

  it('builds the PvP match result payload after battle completion', () => {
    const vm = createPvpBattleViewModel({ playerTeam, opponentTeam });

    vm.damageOpponent(120);

    expect(vm.buildMatchResultPayload('opponent-1')).toEqual({
      opponent_user_id: 'opponent-1',
      player_team: vm.playerTeam,
      opponent_team: vm.opponentTeam,
    });
  });

  it('constructs a ViewModel directly', () => {
    expect(new PvpBattleViewModel({ playerTeam, opponentTeam })).toBeInstanceOf(PvpBattleViewModel);
  });

  it('starts PvP battles on turn one', () => {
    const vm = createPvpBattleViewModel({ playerTeam, opponentTeam });

    expect(vm.turnNumber).toBe(1);
  });
});
