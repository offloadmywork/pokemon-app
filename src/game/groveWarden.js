/**
 * The Grove Warden is Verdant Path's authored boss. It reuses the legacy
 * battle screen's boss conventions (`isBoss`, `boss-<name>` ids) so victory
 * rewards, XP, and boss-clear persistence keep working unchanged.
 */
export const GROVE_WARDEN = Object.freeze({
  name: 'Grove Warden',
  pokemonType: 'Grass',
  rarity: 'Epic',
  description: 'An ancient sentinel coiled around the moonwell. Its fall unseals the cache.',
  rewardXP: 160,
  isBoss: true,
});

export function getWardenBattleId() {
  return `boss-${GROVE_WARDEN.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

/** A warden victory is a won battle against exactly the warden's battle id. */
export function isWardenVictory(battleResult) {
  return Boolean(
    battleResult
    && battleResult.battleWon
    && battleResult.pokemon?.isBoss
    && battleResult.pokemon.id === getWardenBattleId()
  );
}
