import fs from 'fs';
import { pathToFileURL } from 'url';

export const PHASE_1_ROSTER_MIN = 50;
export const PHASE_1_ROSTER_MAX = 80;

export function countPokemonInSql(sql) {
  return (sql.match(/\bINSERT\s+INTO\s+pokemon\b/gi) || []).length;
}

export function auditRosterCoverage(count, min = PHASE_1_ROSTER_MIN, max = PHASE_1_ROSTER_MAX) {
  const missing = Math.max(0, min - count);
  const overage = Math.max(0, count - max);
  let status = 'on-target';

  if (missing > 0) {
    status = 'below-target';
  } else if (overage > 0) {
    status = 'above-target';
  }

  return {
    count,
    min,
    max,
    status,
    missing,
    overage,
  };
}

export function auditSeedFile(file = 'seed-data.sql') {
  const sql = fs.readFileSync(file, 'utf8');
  return {
    file,
    ...auditRosterCoverage(countPokemonInSql(sql)),
  };
}

function printAudit(audit) {
  console.log(`Pokemon roster audit: ${audit.count}/${audit.min}-${audit.max}`);
  console.log(`Status: ${audit.status}`);
  if (audit.missing > 0) {
    console.log(`Missing: ${audit.missing} Pokemon to reach Phase 1 minimum`);
  }
  if (audit.overage > 0) {
    console.log(`Over target: ${audit.overage} Pokemon above Phase 1 maximum`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  printAudit(auditSeedFile(process.argv[2] || 'seed-data.sql'));
}
