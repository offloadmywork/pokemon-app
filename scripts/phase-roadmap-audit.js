import fs from 'fs';
import { pathToFileURL } from 'url';

export function normalizeFeatureName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function extractPhaseFeatures(gdd, phase = 'Phase 3') {
  const phasePattern = new RegExp(`\\*\\*${escapeRegExp(phase)}:\\*\\*([\\s\\S]*?)(?:\\n\\s*---|\\n\\s*##|$)`, 'i');
  const match = String(gdd || '').match(phasePattern);

  if (!match) return [];

  return match[1]
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2).trim().replace(/[‐‑‒–—]/g, '-'))
    .filter(Boolean);
}

export function auditPhaseRoadmap({
  gdd,
  roadmap,
  gddFile,
  roadmapFile,
  phase = 'Phase 3',
}) {
  const gddContent = gdd ?? fs.readFileSync(gddFile, 'utf8');
  const roadmapContent = roadmap ?? fs.readFileSync(roadmapFile, 'utf8');
  const features = extractPhaseFeatures(gddContent, phase).map((feature) => {
    const section = findRoadmapFeatureSection(roadmapContent, feature);
    const implementedText = section ? extractRoadmapSubsection(section.text, 'Implemented') : '';
    const implementedCount = section
      ? (implementedText.match(/^\s*-\s+(?:✅|\[x\]|done\b|.+)/gim) || []).length
      : 0;
    const complete = Boolean(section && /complete for now/i.test(section.text));

    return {
      feature,
      roadmapHeading: section?.heading || null,
      implementedCount,
      complete,
    };
  });

  return {
    phase,
    status: features.length > 0 && features.every((feature) => feature.complete)
      ? 'complete'
      : 'incomplete',
    features,
  };
}

function extractRoadmapSubsection(sectionText, heading) {
  const pattern = new RegExp(`^\\s*###\\s+${escapeRegExp(heading)}\\s*\\n([\\s\\S]*?)(?=^\\s*###\\s+|\\s*$)`, 'im');
  return sectionText.match(pattern)?.[1] || '';
}

function findRoadmapFeatureSection(roadmap, feature) {
  const target = normalizeFeatureName(feature);
  const sectionPattern = /^\s*## Current Feature:\s*(.+)$/gm;
  const sections = [];
  let match;

  while ((match = sectionPattern.exec(roadmap)) !== null) {
    sections.push({
      heading: match[1].trim(),
      start: match.index,
    });
  }

  for (let index = 0; index < sections.length; index += 1) {
    const section = sections[index];
    const next = sections[index + 1];
    const sectionText = roadmap.slice(section.start, next?.start ?? roadmap.length);
    const heading = normalizeFeatureName(section.heading);

    if (heading === target || heading.includes(target) || target.includes(heading)) {
      return {
        heading: section.heading,
        text: sectionText,
      };
    }
  }

  return null;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function printAudit(audit) {
  console.log(`${audit.phase} roadmap audit: ${audit.status}`);
  for (const feature of audit.features) {
    console.log(`${feature.complete ? '✓' : 'x'} ${feature.feature} (${feature.implementedCount} implemented items)`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  printAudit(auditPhaseRoadmap({
    gddFile: process.argv[2] || 'docs/GDD.md',
    roadmapFile: process.argv[3] || 'docs/ROADMAP.md',
    phase: process.argv[4] || 'Phase 3',
  }));
}
