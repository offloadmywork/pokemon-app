export const VERDANT_PATH = Object.freeze({
  id: 'verdant-path',
  name: 'Verdant Path',
  tileSize: 32,
  width: 30,
  height: 22,
  spawn: Object.freeze({ x: 4, y: 17 }),
  encounterTiles: Object.freeze([
    Object.freeze({ x: 9, y: 6, width: 6, height: 5 }),
    Object.freeze({ x: 18, y: 13, width: 6, height: 4 }),
  ]),
  landmarks: Object.freeze([
    Object.freeze({ x: 24, y: 5, label: 'Moonwell' }),
    Object.freeze({ x: 25, y: 17, label: 'Grove Gate' }),
  ]),
});

export function isVerdantEncounterTile(x, y, zone = VERDANT_PATH) {
  return zone.encounterTiles.some((area) => (
    x >= area.x && x < area.x + area.width && y >= area.y && y < area.y + area.height
  ));
}

export function isVerdantWalkable(x, y, zone = VERDANT_PATH) {
  if (x < 1 || y < 1 || x >= zone.width - 1 || y >= zone.height - 1) return false;
  // A deliberately placed stream bank creates a readable route choice.
  return !(x >= 15 && x <= 16 && y >= 2 && y <= 14 && y !== 10);
}
