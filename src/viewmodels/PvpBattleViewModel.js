// PvpBattleViewModel - Browser-free PvP battle state orchestration
// Uses opponent team context from matchmaking and only submits completed battles.

import { getEffectiveness } from '@/game/battle';
import { resolvePvpBattleResult } from '@/game/pvp';

export class PvpBattleViewModel {
  constructor({ playerTeam = [], opponentTeam = [] } = {}) {
    this.playerTeam = normalizeTeam(playerTeam);
    this.opponentTeam = normalizeTeam(opponentTeam);
    this.activePlayerIndex = findFirstLivingIndex(this.playerTeam);
    this.activeOpponentIndex = findFirstLivingIndex(this.opponentTeam);
    this.turnLog = [];
    this.turnNumber = 1;
    this.playerEnergy = 0;
  }

  get activePlayerPokemon() {
    return this.playerTeam[this.activePlayerIndex] || null;
  }

  get activeOpponentPokemon() {
    return this.opponentTeam[this.activeOpponentIndex] || null;
  }

  get switchablePlayerPokemon() {
    return this.playerTeam
      .map((pokemon, index) => ({ ...pokemon, teamIndex: index }))
      .filter((pokemon) => pokemon.teamIndex !== this.activePlayerIndex && (pokemon.currentHP ?? 0) > 0);
  }

  get result() {
    return resolvePvpBattleResult({
      playerTeam: this.playerTeam,
      opponentTeam: this.opponentTeam,
    });
  }

  get canSubmitResult() {
    return this.result.status === 'complete';
  }

  get canUseSpecialAttack() {
    return this.playerEnergy >= 2 && !this.canSubmitResult;
  }

  damageOpponent(amount) {
    this._damageTeamMember(this.opponentTeam, this.activeOpponentIndex, amount);
    this.activeOpponentIndex = findFirstLivingIndex(this.opponentTeam);
    return this.result;
  }

  damagePlayer(amount) {
    this._damageTeamMember(this.playerTeam, this.activePlayerIndex, amount);
    this.activePlayerIndex = findFirstLivingIndex(this.playerTeam);
    return this.result;
  }

  playerAttack() {
    return this._executePlayerAttack({
      damageMultiplier: 1,
      energyGain: 1,
      logAttack: (attacker, defender, damage) => `${attacker.name} hit ${defender.name} for ${damage} damage.`,
    });
  }

  specialAttack() {
    if (!this.canUseSpecialAttack) {
      return {
        used: false,
        reason: 'Build 2 energy with basic attacks before using a special move.',
      };
    }

    this.playerEnergy = Math.max(0, this.playerEnergy - 2);
    return this._executePlayerAttack({
      damageMultiplier: 2,
      energyGain: 0,
      logAttack: (attacker, defender, damage) => `${attacker.name} used Special Strike on ${defender.name} for ${damage} damage.`,
    });
  }

  playerGuard() {
    const player = this.activePlayerPokemon;
    const opponent = this.activeOpponentPokemon;
    if (!player || !opponent || this.canSubmitResult) {
      return this.result;
    }

    this.playerEnergy = Math.min(2, this.playerEnergy + 1);
    this.turnLog.push(`${player.name} guarded and built energy.`);

    const guardDamage = calculatePvpDamage(opponent, player, { baseDamage: Math.ceil((opponent.power_level || 10) / 2) });
    const playerIndex = this.activePlayerIndex;
    const result = this.damagePlayer(guardDamage.damage);
    this.turnLog.push(`${opponent.name} hit ${player.name} for ${guardDamage.damage} guarded damage.${formatEffectivenessSuffix(guardDamage.effectiveness)}`);
    this._logFaintHandoff({
      team: this.playerTeam,
      faintedIndex: playerIndex,
      activeIndex: this.activePlayerIndex,
      result,
    });

    if (result.status === 'complete') {
      this.turnLog.push(`Battle complete: ${result.outcome}.`);
    } else {
      this.turnNumber += 1;
    }

    return result;
  }

  switchPlayerPokemon(index) {
    const nextPokemon = this.playerTeam[index];
    if (!nextPokemon || (nextPokemon.currentHP ?? 0) <= 0) {
      return {
        switched: false,
        reason: 'Choose a living Pokemon.',
      };
    }

    const currentPokemon = this.activePlayerPokemon;
    if (index === this.activePlayerIndex) {
      return {
        switched: false,
        reason: `${currentPokemon?.name || nextPokemon.name} is already active.`,
      };
    }

    if (this.canSubmitResult) {
      return {
        switched: false,
        reason: 'Battle is already complete.',
      };
    }

    this.activePlayerIndex = index;
    if (currentPokemon) {
      this.turnLog.push(`${currentPokemon.name} switched out.`);
    }
    this.turnLog.push(`${nextPokemon.name} entered the battle.`);

    return {
      switched: true,
      activePokemon: nextPokemon,
    };
  }

  forfeit() {
    if (this.canSubmitResult) {
      return this.result;
    }

    const activePokemon = this.activePlayerPokemon;
    this.playerTeam = this.playerTeam.map((pokemon) => ({
      ...pokemon,
      currentHP: 0,
    }));
    this.activePlayerIndex = findFirstLivingIndex(this.playerTeam);
    this.turnLog.push(`${activePokemon?.name || 'Your team'} forfeited the battle.`);

    const result = this.result;
    this.turnLog.push(`Battle complete: ${result.outcome}.`);
    return result;
  }

  buildMatchResultPayload(opponentUserId) {
    if (!this.canSubmitResult || !opponentUserId) {
      return null;
    }

    return {
      opponent_user_id: opponentUserId,
      player_team: this.playerTeam,
      opponent_team: this.opponentTeam,
    };
  }

  _damageTeamMember(team, index, amount) {
    if (!team[index]) return;
    team[index] = {
      ...team[index],
      currentHP: Math.max(0, (team[index].currentHP || 0) - Math.max(0, amount)),
    };
  }

  _executePlayerAttack({ damageMultiplier, energyGain, logAttack }) {
    const attacker = this.activePlayerPokemon;
    const defender = this.activeOpponentPokemon;
    if (!attacker || !defender || this.canSubmitResult) {
      return this.result;
    }

    const playerDamage = calculatePvpDamage(attacker, defender, { damageMultiplier });
    const defenderIndex = this.activeOpponentIndex;
    let result = this.damageOpponent(playerDamage.damage);
    this.turnLog.push(`${logAttack(attacker, defender, playerDamage.damage)}${formatEffectivenessSuffix(playerDamage.effectiveness)}`);
    this._logFaintHandoff({
      team: this.opponentTeam,
      faintedIndex: defenderIndex,
      activeIndex: this.activeOpponentIndex,
      result,
    });

    if (result.status === 'complete') {
      this.turnLog.push(`Battle complete: ${result.outcome}.`);
      return result;
    }

    if (energyGain > 0) {
      this.playerEnergy = Math.min(2, this.playerEnergy + energyGain);
    }

    const opponent = this.activeOpponentPokemon;
    const player = this.activePlayerPokemon;
    if (!opponent || !player) {
      return this.result;
    }

    const opponentDamage = calculatePvpDamage(opponent, player);
    const playerIndex = this.activePlayerIndex;
    result = this.damagePlayer(opponentDamage.damage);
    this.turnLog.push(`${opponent.name} hit ${player.name} for ${opponentDamage.damage} damage.${formatEffectivenessSuffix(opponentDamage.effectiveness)}`);
    this._logFaintHandoff({
      team: this.playerTeam,
      faintedIndex: playerIndex,
      activeIndex: this.activePlayerIndex,
      result,
    });

    if (result.status === 'complete') {
      this.turnLog.push(`Battle complete: ${result.outcome}.`);
    } else {
      this.turnNumber += 1;
    }

    return result;
  }

  _logFaintHandoff({ team, faintedIndex, activeIndex, result }) {
    const faintedPokemon = team[faintedIndex];
    if (!faintedPokemon || faintedPokemon.currentHP > 0) return;

    this.turnLog.push(`${faintedPokemon.name} fainted.`);

    const nextPokemon = result.status === 'in_progress' ? team[activeIndex] : null;
    if (nextPokemon && activeIndex !== faintedIndex && nextPokemon.currentHP > 0) {
      this.turnLog.push(`${nextPokemon.name} entered the battle.`);
    }
  }
}

function normalizeTeam(team) {
  return team.map((member) => {
    const maxHP = member.maxHP || 100;
    return {
      ...member,
      maxHP,
      currentHP: member.currentHP ?? maxHP,
    };
  });
}

function findFirstLivingIndex(team) {
  const index = team.findIndex((member) => (member.currentHP ?? 0) > 0);
  return index >= 0 ? index : 0;
}

function calculatePvpDamage(attacker, defender, options = {}) {
  const effectiveness = getEffectiveness(attacker?.type, defender?.type);
  const baseDamage = options.baseDamage ?? ((attacker?.power_level || 10) * (options.damageMultiplier ?? 1));
  let damage = baseDamage;

  if (effectiveness === 'super-effective') {
    damage = Math.floor(damage * 1.5);
  } else if (effectiveness === 'not-very-effective') {
    damage = Math.floor(damage * 0.6);
  }

  return {
    damage: Math.max(1, damage),
    effectiveness,
  };
}

function formatEffectivenessSuffix(effectiveness) {
  if (effectiveness === 'super-effective') {
    return " It's super effective!";
  }

  if (effectiveness === 'not-very-effective') {
    return " It's not very effective.";
  }

  return '';
}

export function createPvpBattleViewModel(options) {
  return new PvpBattleViewModel(options);
}
