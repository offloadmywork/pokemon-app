import fs from 'fs';
import { pathToFileURL } from 'url';

export const CONTENT_VOLUME_TARGETS = {
  count: { min: 50, max: 80 },
  types: {
    expected: ['Fire', 'Water', 'Grass', 'Electric', 'Psychic', 'Dragon', 'Fairy', 'Rock', 'Ice', 'Flying'],
    minPerType: 4,
  },
  rarities: {
    minimums: {
      Common: 10,
      Uncommon: 8,
      Rare: 8,
      Epic: 3,
      Legendary: 2,
    },
  },
};

export function parsePokemonSeedRows(sql = '') {
  return [...sql.matchAll(/INSERT\s+INTO\s+pokemon\b[\s\S]*?VALUES\s*\(([\s\S]*?)\);/gi)]
    .map((match) => parsePokemonValues(match[1]))
    .filter(Boolean);
}

export function auditContentVolume(rows = [], targets = CONTENT_VOLUME_TARGETS) {
  const normalizedRows = Array.isArray(rows) ? rows : [];
  const count = auditCount(normalizedRows.length, targets.count);
  const typeCoverage = auditTypeCoverage(normalizedRows, targets.types);
  const raritySpread = auditRaritySpread(normalizedRows, targets.rarities);
  const status = [
    count.status,
    typeCoverage.status,
    raritySpread.status,
  ].every((value) => value === 'on-target') ? 'on-target' : 'needs-attention';

  return {
    status,
    count,
    typeCoverage,
    raritySpread,
  };
}

export function auditSeedContentVolume(file = 'seed-data.sql') {
  const sql = fs.readFileSync(file, 'utf8');
  return {
    file,
    ...auditContentVolume(parsePokemonSeedRows(sql)),
  };
}

function auditCount(total, target) {
  const missing = Math.max(0, target.min - total);
  const overage = Math.max(0, total - target.max);
  let status = 'on-target';

  if (missing > 0) {
    status = 'below-target';
  } else if (overage > 0) {
    status = 'above-target';
  }

  return {
    total,
    min: target.min,
    max: target.max,
    status,
    missing,
    overage,
  };
}

function auditTypeCoverage(rows, target) {
  const counts = countBy(rows, 'type');
  const missingTypes = target.expected.filter((type) => !counts[type]);
  const underrepresentedTypes = target.expected.filter((type) => {
    const count = counts[type] || 0;
    return count > 0 && count < target.minPerType;
  });

  return {
    status: missingTypes.length || underrepresentedTypes.length ? 'needs-attention' : 'on-target',
    minPerType: target.minPerType,
    counts,
    missingTypes,
    underrepresentedTypes,
  };
}

function auditRaritySpread(rows, target) {
  const counts = countBy(rows, 'rarity');
  const underrepresentedRarities = Object.entries(target.minimums)
    .filter(([rarity, minimum]) => (counts[rarity] || 0) < minimum)
    .map(([rarity]) => rarity);

  return {
    status: underrepresentedRarities.length ? 'needs-attention' : 'on-target',
    minimums: target.minimums,
    counts,
    underrepresentedRarities,
  };
}

function countBy(rows, key) {
  return rows.reduce((counts, row) => {
    const value = row[key];
    if (value) {
      counts[value] = (counts[value] || 0) + 1;
    }
    return counts;
  }, {});
}

function parsePokemonValues(valuesSql) {
  const values = [...valuesSql.matchAll(/'((?:''|[^'])*)'/g)]
    .map((match) => match[1].replace(/''/g, "'"));

  if (values.length < 6) return null;

  return {
    id: values[0],
    name: values[1],
    type: values[2],
    description: values[3],
    image_url: values[4],
    rarity: values[5],
  };
}

function printAudit(audit) {
  console.log(`Content volume audit: ${audit.status}`);
  console.log(`Pokemon count: ${audit.count.total}/${audit.count.min}-${audit.count.max}`);
  console.log(`Missing types: ${audit.typeCoverage.missingTypes.join(', ') || 'none'}`);
  console.log(`Underrepresented types: ${audit.typeCoverage.underrepresentedTypes.join(', ') || 'none'}`);
  console.log(`Underrepresented rarities: ${audit.raritySpread.underrepresentedRarities.join(', ') || 'none'}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  printAudit(auditSeedContentVolume(process.argv[2] || 'seed-data.sql'));
}
