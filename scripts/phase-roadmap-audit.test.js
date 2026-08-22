import { describe, expect, it } from 'vitest';
import {
  auditPhaseRoadmap,
  extractPhaseFeatures,
  normalizeFeatureName,
} from './phase-roadmap-audit.js';

describe('GDD phase roadmap audit', () => {
  it('extracts feature bullets from a GDD phase', () => {
    const gdd = `
      **Phase 3:**
      - PvP battles
      - Co-op raids
      - Trading

      ---
    `;

    expect(extractPhaseFeatures(gdd, 'Phase 3')).toEqual([
      'PvP battles',
      'Co-op raids',
      'Trading',
    ]);
  });

  it('normalizes feature names for roadmap matching', () => {
    expect(normalizeFeatureName('PvP battles')).toBe('pvp battles');
    expect(normalizeFeatureName('Co-op raids')).toBe('co op raids');
    expect(normalizeFeatureName('Trading')).toBe('trading');
  });

  it('reports missing or incomplete phase features', () => {
    const gdd = `
      **Phase 3:**
      - PvP battles
      - Trading
    `;
    const roadmap = `
      ## Current Feature: PvP Battles
      ### Implemented
      - done
      ### Next
      - PvP battle slice complete for now
    `;

    expect(auditPhaseRoadmap({ gdd, roadmap, phase: 'Phase 3' })).toEqual({
      phase: 'Phase 3',
      status: 'incomplete',
      features: [
        {
          feature: 'PvP battles',
          roadmapHeading: 'PvP Battles',
          implementedCount: 1,
          complete: true,
        },
        {
          feature: 'Trading',
          roadmapHeading: null,
          implementedCount: 0,
          complete: false,
        },
      ],
    });
  });

  it('audits the checked-in Phase 3 roadmap as complete', () => {
    const result = auditPhaseRoadmap({
      gddFile: 'docs/GDD.md',
      roadmapFile: 'docs/ROADMAP.md',
      phase: 'Phase 3',
    });

    expect(result.status).toBe('complete');
    expect(result.features).toEqual([
      expect.objectContaining({ feature: 'PvP battles', complete: true }),
      expect.objectContaining({ feature: 'Co-op raids', complete: true }),
      expect.objectContaining({ feature: 'Trading', complete: true }),
    ]);
  });
});
