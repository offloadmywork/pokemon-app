// Shared mapping of gameplay events -> daily quest template keys

/**
 * @typedef {'catch'|'battleWin'|'useItem'|'healTeam'|'rareCatch'|'evolvePokemon'|'towerFloorComplete'} DailyQuestEvent
 */

/**
 * Returns the daily quest template keys that should progress for a given gameplay event.
 * Keep this file shared between frontend logic/tests and Worker logic.
 *
 * @param {DailyQuestEvent} event
 * @returns {string[]}
 */
export function getDailyQuestTemplateKeysForEvent(event) {
  switch (event) {
    case 'catch':
      return ['catch-1', 'catch-2', 'catch-3'];
    case 'battleWin':
      return ['battle-1', 'battle-2', 'battle-3'];
    case 'useItem':
      return ['use-item', 'use-item-2'];
    case 'healTeam':
      return ['heal-team'];
    case 'rareCatch':
      return ['rare-catch'];
    case 'evolvePokemon':
      return ['evolve-pokemon'];
    case 'towerFloorComplete':
      return ['tower-floor'];
    default:
      return [];
  }
}
