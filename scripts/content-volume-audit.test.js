import { describe, expect, it } from 'vitest';
import {
  CONTENT_VOLUME_TARGETS,
  auditContentVolume,
  auditSeedContentVolume,
  parsePokemonSeedRows,
} from './content-volume-audit.js';

describe('content volume management audit', () => {
  it('parses Pokemon seed rows with type and rarity metadata', () => {
    const sql = `
      INSERT INTO pokemon (id, name, type, description, image_url, rarity, power_level)
      VALUES ('p1', 'Aqua', 'Water', 'Splash', 'url', 'Common', 25);
      INSERT INTO pokemon (id, name, type, description, image_url, rarity, power_level)
      VALUES ('p2', 'Blaze', 'Fire', 'Warm', 'url', 'Rare', 75);
    `;

    expect(parsePokemonSeedRows(sql)).toEqual([
      expect.objectContaining({ id: 'p1', name: 'Aqua', type: 'Water', rarity: 'Common' }),
      expect.objectContaining({ id: 'p2', name: 'Blaze', type: 'Fire', rarity: 'Rare' }),
    ]);
  });

  it('flags missing type coverage and weak rarity spread', () => {
    const audit = auditContentVolume([
      { id: 'p1', type: 'Fire', rarity: 'Common' },
      { id: 'p2', type: 'Fire', rarity: 'Common' },
      { id: 'p3', type: 'Water', rarity: 'Rare' },
    ]);

    expect(audit.status).toBe('needs-attention');
    expect(audit.count.status).toBe('below-target');
    expect(audit.typeCoverage.missingTypes).toContain('Grass');
    expect(audit.typeCoverage.underrepresentedTypes).toEqual(expect.arrayContaining(['Water']));
    expect(audit.raritySpread.underrepresentedRarities).toEqual(expect.arrayContaining(['Uncommon', 'Epic', 'Legendary']));
  });

  it('keeps the checked-in seed content inside the GDD content volume guardrails', () => {
    const audit = auditSeedContentVolume('seed-data.sql');

    expect(audit.status).toBe('on-target');
    expect(audit.count).toMatchObject({
      total: 50,
      min: CONTENT_VOLUME_TARGETS.count.min,
      max: CONTENT_VOLUME_TARGETS.count.max,
      status: 'on-target',
    });
    expect(audit.typeCoverage.missingTypes).toEqual([]);
    expect(audit.typeCoverage.underrepresentedTypes).toEqual([]);
    expect(audit.raritySpread.underrepresentedRarities).toEqual([]);
  });
});
