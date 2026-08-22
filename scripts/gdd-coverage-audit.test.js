import { describe, expect, it } from 'vitest';
import {
  GDD_COVERAGE_TARGETS,
  auditCheckedInGddCoverage,
  auditGddCoverage,
} from './gdd-coverage-audit';

describe('GDD coverage audit', () => {
  it('flags roadmap areas that do not cover required GDD markers', () => {
    const audit = auditGddCoverage({
      roadmap: `
        ## Current Feature: Daily Quests
        ### Next
        - Daily Quests Phase 1 slice complete
      `,
      targets: [
        {
          area: 'phase_1',
          label: 'Phase 1',
          requiredMarkers: [
            'Daily Quests Phase 1 slice complete',
            'Zone boss signals complete for now',
          ],
        },
      ],
    });

    expect(audit.status).toBe('incomplete');
    expect(audit.areas).toEqual([
      {
        area: 'phase_1',
        label: 'Phase 1',
        status: 'incomplete',
        missingMarkers: ['Zone boss signals complete for now'],
      },
    ]);
  });

  it('tracks checked-in roadmap coverage for all major GDD groups', () => {
    const audit = auditCheckedInGddCoverage();

    expect(audit.status).toBe('complete');
    expect(audit.areas).toHaveLength(GDD_COVERAGE_TARGETS.length);
    expect(audit.areas).toEqual(expect.arrayContaining([
      expect.objectContaining({ area: 'phase_1', status: 'complete', missingMarkers: [] }),
      expect.objectContaining({ area: 'phase_2', status: 'complete', missingMarkers: [] }),
      expect.objectContaining({ area: 'phase_3', status: 'complete', missingMarkers: [] }),
      expect.objectContaining({ area: 'ux', status: 'complete', missingMarkers: [] }),
      expect.objectContaining({ area: 'economy_monetization', status: 'complete', missingMarkers: [] }),
      expect.objectContaining({ area: 'kpis_and_risks', status: 'complete', missingMarkers: [] }),
    ]));
  });
});
