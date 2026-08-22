import fs from 'fs';
import { describe, expect, it } from 'vitest';
import {
  PERFORMANCE_BUDGET_TARGETS,
  auditBuildAssetBudget,
  auditDependencies,
  auditSourceMotionBudget,
  auditWebPerformance,
} from './web-performance-audit';

describe('web performance audit', () => {
  it('flags heavyweight animation/rendering dependencies', () => {
    const audit = auditDependencies({
      dependencies: {
        react: '^18.2.0',
        'framer-motion': '^12.0.0',
      },
      devDependencies: {
        gsap: '^3.0.0',
      },
    });

    expect(audit.status).toBe('needs-attention');
    expect(audit.forbiddenFound).toEqual([
      { name: 'framer-motion', group: 'dependencies' },
      { name: 'gsap', group: 'devDependencies' },
    ]);
  });

  it('flags source files with too many unbounded animations', () => {
    const audit = auditSourceMotionBudget({
      'src/pages/Browse.jsx': 'animation: "float 2s ease-in-out infinite";\n'.repeat(13),
      'src/pages/Home.jsx': 'transition: "opacity 0.2s";',
    }, { maxInfiniteAnimationsPerFile: 12 });

    expect(audit.status).toBe('needs-attention');
    expect(audit.filesOverBudget).toEqual([
      {
        file: 'src/pages/Browse.jsx',
        infiniteAnimations: 13,
        maxInfiniteAnimationsPerFile: 12,
      },
    ]);
  });

  it('flags built assets that exceed mobile gzip budgets', () => {
    const audit = auditBuildAssetBudget({
      assets: {
        'dist/assets/index-over.js': 'x'.repeat(115 * 1024),
        'dist/assets/index.css': 'body{}',
      },
      targets: {
        maxJavaScriptGzipBytes: 1,
        maxCssGzipBytes: 1024,
        maxTotalGzipBytes: 2 * 1024,
      },
    });

    expect(audit.status).toBe('needs-attention');
    expect(audit.filesOverBudget).toEqual([
      expect.objectContaining({
        file: 'dist/assets/index-over.js',
        type: 'javascript',
      }),
    ]);
  });

  it('keeps checked-in source inside the GDD web-friendly performance guardrails', () => {
    const audit = auditWebPerformance({
      packageJsonFile: 'package.json',
      sourceGlobs: ['src/**/*.js', 'src/**/*.jsx', 'src/**/*.css'],
    });

    expect(audit.status).toBe('on-target');
    expect(audit.dependencies.forbiddenFound).toEqual([]);
    expect(audit.motion.filesOverBudget).toEqual([]);
    expect(audit.assets.status).toMatch(/on-target|skipped/);
    expect(audit.assets.filesOverBudget).toEqual([]);
    expect(audit.motion.maxInfiniteAnimationsPerFile).toBe(PERFORMANCE_BUDGET_TARGETS.motion.maxInfiniteAnimationsPerFile);
    expect(fs.existsSync('package.json')).toBe(true);
  });
});
