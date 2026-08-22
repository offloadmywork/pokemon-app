import { describe, expect, it } from 'vitest';
import {
  PHASE_1_ROSTER_MAX,
  PHASE_1_ROSTER_MIN,
  auditRosterCoverage,
  countPokemonInSql,
  auditSeedFile,
} from './roster-audit.js';

describe('Phase 1 roster coverage audit', () => {
  it('counts pokemon inserts in SQL seed content', () => {
    const sql = `
      INSERT INTO pokemon (id, name) VALUES ('1', 'A');
      INSERT INTO pokemon (id, name) VALUES ('2', 'B');
      INSERT INTO users (id) VALUES ('u1');
    `;

    expect(countPokemonInSql(sql)).toBe(2);
  });

  it('reports whether a roster is inside the Phase 1 target range', () => {
    expect(auditRosterCoverage(20)).toEqual({
      count: 20,
      min: PHASE_1_ROSTER_MIN,
      max: PHASE_1_ROSTER_MAX,
      status: 'below-target',
      missing: 30,
      overage: 0,
    });

    expect(auditRosterCoverage(60)).toMatchObject({
      status: 'on-target',
      missing: 0,
      overage: 0,
    });
  });

  it('audits the checked-in D1 seed against the Phase 1 target', () => {
    expect(auditSeedFile('seed-data.sql')).toEqual(expect.objectContaining({
      file: 'seed-data.sql',
      count: 50,
      status: 'on-target',
      missing: 0,
    }));
  });
});
