import fs from 'fs';
import { pathToFileURL } from 'url';

export const GDD_COVERAGE_TARGETS = [
  {
    area: 'phase_1',
    label: 'Phase 1 roadmap',
    requiredMarkers: [
      'Daily Quests Phase 1 slice complete',
      'Phase 1 onboarding polish complete for now',
      'Zone boss signals complete for now',
      'Phase 1 complete for now',
    ],
  },
  {
    area: 'phase_2',
    label: 'Phase 2 roadmap',
    requiredMarkers: [
      'Seasonal events complete for now',
      'Challenge Tower polish complete for now',
      'Phase 2 GDD feature polish complete for now',
    ],
  },
  {
    area: 'phase_3',
    label: 'Phase 3 roadmap',
    requiredMarkers: [
      'PvP battle slice complete for now',
      'Co-op raids slice complete for now',
      'Trading slice complete for now',
    ],
  },
  {
    area: 'ux',
    label: 'UX and mobile flow polish',
    requiredMarkers: [
      'Mobile navigation polish complete for now',
      'Team management polish slice complete for now',
      'Collection discovery polish slice complete for now',
    ],
  },
  {
    area: 'economy_monetization',
    label: 'Economy and monetization',
    requiredMarkers: [
      'Economy sinks and rewards slice complete for now',
      'Lures and cosmetics slice complete for now',
      'Achievement milestones slice complete for now',
      'Monetization Fairness Guardrails slice complete for now',
    ],
  },
  {
    area: 'kpis_and_risks',
    label: 'KPIs and risks',
    requiredMarkers: [
      'KPI Metrics Snapshot slice complete for now',
      'D1 query performance slice complete for now',
      'Content Volume Management slice complete for now',
      'Web Performance Guardrails slice complete for now',
      'Trainer recovery code slice complete for now',
    ],
  },
];

export function auditGddCoverage({
  roadmap = '',
  targets = GDD_COVERAGE_TARGETS,
} = {}) {
  const areas = targets.map((target) => {
    const missingMarkers = target.requiredMarkers.filter((marker) => !roadmap.includes(marker));

    return {
      area: target.area,
      label: target.label,
      status: missingMarkers.length ? 'incomplete' : 'complete',
      missingMarkers,
    };
  });

  return {
    status: areas.every((area) => area.status === 'complete') ? 'complete' : 'incomplete',
    areas,
  };
}

export function auditCheckedInGddCoverage({
  roadmapFile = 'docs/ROADMAP.md',
  targets = GDD_COVERAGE_TARGETS,
} = {}) {
  return auditGddCoverage({
    roadmap: fs.readFileSync(roadmapFile, 'utf8'),
    targets,
  });
}

function printAudit(audit) {
  console.log(`GDD coverage audit: ${audit.status}`);
  for (const area of audit.areas) {
    console.log(`${area.status === 'complete' ? '✓' : 'x'} ${area.label}`);
    if (area.missingMarkers.length) {
      console.log(`  Missing: ${area.missingMarkers.join('; ')}`);
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  printAudit(auditCheckedInGddCoverage({
    roadmapFile: process.argv[2] || 'docs/ROADMAP.md',
  }));
}
