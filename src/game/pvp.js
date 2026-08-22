const DEFAULT_POWER_TOLERANCE = 0.25;

const isLivingTeamMember = (member) => (member.currentHP ?? 0) > 0;

/**
 * Calculate PvP team power from living Pokemon only.
 */
export function calculatePvpTeamPower(team = []) {
  return team
    .filter(isLivingTeamMember)
    .reduce((total, member) => total + (member.power_level || 0), 0);
}

/**
 * Check whether a player can enter the PvP matchmaking queue.
 */
export function canEnterPvpQueue(team = []) {
  const teamPower = calculatePvpTeamPower(team);

  if (teamPower <= 0) {
    return {
      eligible: false,
      teamPower,
      reason: 'Add a living Pokemon to your team before entering PvP.',
    };
  }

  return {
    eligible: true,
    teamPower,
    reason: null,
  };
}

const getOpponentPower = (opponent) => opponent.team_power ?? opponent.teamPower ?? 0;
const countLivingTeamMembers = (team = []) => team.filter(isLivingTeamMember).length;

/**
 * Select the closest fair PvP opponent by team power.
 */
export function selectPvpOpponent(team = [], opponents = [], options = {}) {
  const queueStatus = canEnterPvpQueue(team);

  if (!queueStatus.eligible) {
    return {
      matched: false,
      playerPower: queueStatus.teamPower,
      opponent: null,
      reason: queueStatus.reason,
    };
  }

  const tolerance = options.powerTolerance ?? DEFAULT_POWER_TOLERANCE;
  const minPower = queueStatus.teamPower * (1 - tolerance);
  const maxPower = queueStatus.teamPower * (1 + tolerance);

  const [opponent] = [...opponents]
    .filter((candidate) => {
      const power = getOpponentPower(candidate);
      return power >= minPower && power <= maxPower;
    })
    .sort((a, b) => {
      const aDiff = Math.abs(getOpponentPower(a) - queueStatus.teamPower);
      const bDiff = Math.abs(getOpponentPower(b) - queueStatus.teamPower);
      return aDiff - bDiff;
    });

  if (!opponent) {
    return {
      matched: false,
      playerPower: queueStatus.teamPower,
      opponent: null,
      reason: 'No fair PvP opponent is available right now.',
    };
  }

  return {
    matched: true,
    playerPower: queueStatus.teamPower,
    opponent,
  };
}

/**
 * Resolve PvP battle status from both teams' remaining HP.
 */
export function resolvePvpBattleResult({ playerTeam = [], opponentTeam = [] } = {}) {
  const playerRemainingPokemon = countLivingTeamMembers(playerTeam);
  const opponentRemainingPokemon = countLivingTeamMembers(opponentTeam);

  if (playerRemainingPokemon > 0 && opponentRemainingPokemon > 0) {
    return {
      status: 'in_progress',
      outcome: null,
      winner: null,
      loser: null,
      playerRemainingPokemon,
      opponentRemainingPokemon,
    };
  }

  if (playerRemainingPokemon === 0 && opponentRemainingPokemon === 0) {
    return {
      status: 'complete',
      outcome: 'draw',
      winner: null,
      loser: null,
      playerRemainingPokemon,
      opponentRemainingPokemon,
    };
  }

  const playerWon = playerRemainingPokemon > 0;
  return {
    status: 'complete',
    outcome: playerWon ? 'win' : 'loss',
    winner: playerWon ? 'player' : 'opponent',
    loser: playerWon ? 'opponent' : 'player',
    playerRemainingPokemon,
    opponentRemainingPokemon,
  };
}

/**
 * Calculate deterministic rewards for a completed PvP match.
 */
export function calculatePvpRewards(outcome) {
  if (outcome === 'win') {
    return { xp: 50, coins: 20 };
  }

  if (outcome === 'draw') {
    return { xp: 20, coins: 10 };
  }

  return { xp: 10, coins: 5 };
}
