export const SEASONAL_EVENTS = [
  {
    key: 'summer-splash',
    name: 'Summer Splash',
    startsOn: '06-01',
    endsOn: '08-31',
    boostedTypes: ['Water', 'Ice'],
    encounterTypeWeight: 0.35,
    catchRateMultiplier: 1.15,
    xpMultiplier: 1.1,
  },
];

function getMonthDay(dateInput) {
  const date = typeof dateInput === 'string' ? new Date(`${dateInput}T00:00:00Z`) : new Date(dateInput);
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${month}-${day}`;
}

function isMonthDayInWindow(monthDay, startsOn, endsOn) {
  if (startsOn <= endsOn) {
    return monthDay >= startsOn && monthDay <= endsOn;
  }
  return monthDay >= startsOn || monthDay <= endsOn;
}

export function getActiveSeasonalEvent(dateInput = new Date()) {
  const monthDay = getMonthDay(dateInput);
  return SEASONAL_EVENTS.find((event) => (
    isMonthDayInWindow(monthDay, event.startsOn, event.endsOn)
  )) || null;
}

export function getSeasonalEncounterBonus(event, pokemon) {
  const isBoosted = Boolean(event && pokemon && event.boostedTypes.includes(pokemon.type));
  return {
    catchRateMultiplier: isBoosted ? event.catchRateMultiplier : 1,
    xpMultiplier: isBoosted ? event.xpMultiplier : 1,
  };
}

export function getSeasonalCatchRate(baseCatchRate, event, pokemon) {
  const { catchRateMultiplier } = getSeasonalEncounterBonus(event, pokemon);
  return Math.min(0.95, baseCatchRate * catchRateMultiplier);
}

export function getSeasonalXpReward(baseXp, event, pokemon) {
  const { xpMultiplier } = getSeasonalEncounterBonus(event, pokemon);
  return Math.round(baseXp * xpMultiplier);
}

export function selectSeasonalEncounterType(event, roll = Math.random()) {
  if (!event || !event.boostedTypes?.length || roll >= event.encounterTypeWeight) {
    return null;
  }

  const bucketSize = event.encounterTypeWeight / event.boostedTypes.length;
  const typeIndex = Math.min(
    event.boostedTypes.length - 1,
    Math.floor(roll / bucketSize)
  );
  return event.boostedTypes[typeIndex];
}
