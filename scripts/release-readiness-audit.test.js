import { describe, expect, it } from 'vitest';
import {
  RELEASE_READINESS_COMMANDS,
  auditCiWorkflow,
  auditCiWorkflowFile,
  auditGitHooksPath,
  auditPackageReleaseReadiness,
  auditPrePushHook,
  auditPrePushHookFile,
  auditReleaseReadiness,
} from './release-readiness-audit.js';

describe('release readiness audit', () => {
  it('requires tests, build, audits, and Worker dry-run before release', () => {
    const command = [
      'npm test -- --run',
      'npm run build',
      'node scripts/content-volume-audit.js',
      'node scripts/d1-query-index-audit.js',
      'node scripts/gdd-coverage-audit.js',
      'node scripts/monetization-fairness-audit.js',
      'node scripts/web-performance-audit.js',
      'npx wrangler deploy --dry-run --outdir /tmp/pokemon-worker-dry-run',
    ].join(' && ');

    const audit = auditReleaseReadiness({
      packageJson: { scripts: { 'verify:release': command } },
    });

    expect(audit.status).toBe('ready');
    expect(audit.requiredCommands.map((step) => step.command)).toEqual(
      RELEASE_READINESS_COMMANDS.map((step) => step.command),
    );
    expect(audit.missingCommands).toEqual([]);
  });

  it('flags release scripts that skip mandatory guardrails', () => {
    const audit = auditReleaseReadiness({
      packageJson: {
        scripts: {
          'verify:release': 'npm test -- --run && npm run build',
        },
      },
    });

    expect(audit.status).toBe('needs-attention');
    expect(audit.missingCommands.map((step) => step.command)).toEqual(
      expect.arrayContaining([
        'node scripts/gdd-coverage-audit.js',
        'npx wrangler deploy --dry-run --outdir /tmp/pokemon-worker-dry-run',
      ]),
    );
  });

  it('keeps the checked-in release verification script complete', () => {
    const audit = auditPackageReleaseReadiness('package.json');

    expect(audit.status).toBe('ready');
    expect(audit.scriptName).toBe('verify:release');
    expect(audit.missingCommands).toEqual([]);
  });

  it('requires the pre-push hook to run release verification before automatic deployment', () => {
    const audit = auditPrePushHook('#!/bin/sh\nnpm run verify:release\n');

    expect(audit.status).toBe('ready');
    expect(audit.requiredCommand).toBe('npm run verify:release');
  });

  it('flags pre-push hooks that skip release verification', () => {
    const audit = auditPrePushHook('#!/bin/sh\nnpm test -- --run\n');

    expect(audit.status).toBe('needs-attention');
    expect(audit.missingCommand).toBe('npm run verify:release');
  });

  it('keeps the checked-in pre-push hook wired to release verification', () => {
    const audit = auditPrePushHookFile('.githooks/pre-push');

    expect(audit.status).toBe('ready');
    expect(audit.missingCommand).toBeNull();
  });

  it('requires local Git hooks to point at the tracked hook directory', () => {
    expect(auditGitHooksPath('.githooks')).toEqual({
      status: 'ready',
      expectedHooksPath: '.githooks',
      actualHooksPath: '.githooks',
    });
  });

  it('flags local Git hook paths that skip the tracked release hook directory', () => {
    expect(auditGitHooksPath('')).toMatchObject({
      status: 'needs-attention',
      expectedHooksPath: '.githooks',
      actualHooksPath: '',
    });
  });

  it('requires CI to run release verification before automatic deployment', () => {
    const audit = auditCiWorkflow(`
jobs:
  verify:
    steps:
      - run: npm run verify:release
  deploy:
    needs: [verify]
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: \${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: \${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy --minify
`);

    expect(audit.status).toBe('ready');
    expect(audit.requiredCommand).toBe('npm run verify:release');
    expect(audit.deployNeedsVerification).toBe(true);
    expect(audit.deployRestrictedToMain).toBe(true);
    expect(audit.deployHasCloudflareSecrets).toBe(true);
    expect(audit.deployUsesMinify).toBe(true);
  });

  it('flags CI workflows that skip the release verification chain', () => {
    const audit = auditCiWorkflow('run: npm test\nrun: npm run build\n');

    expect(audit.status).toBe('needs-attention');
    expect(audit.missingCommand).toBe('npm run verify:release');
  });

  it('flags CI workflows where production deploy can bypass release verification', () => {
    const audit = auditCiWorkflow(`
jobs:
  verify:
    steps:
      - run: npm run verify:release
  deploy:
    steps:
      - uses: cloudflare/wrangler-action@v3
`);

    expect(audit.status).toBe('needs-attention');
    expect(audit.missingCommand).toBeNull();
    expect(audit.deployNeedsVerification).toBe(false);
    expect(audit.missingDeployDependency).toBe('verify');
  });

  it('flags CI workflows where production deploy is not limited to main', () => {
    const audit = auditCiWorkflow(`
jobs:
  verify:
    steps:
      - run: npm run verify:release
  deploy:
    needs: [verify]
    steps:
      - uses: cloudflare/wrangler-action@v3
`);

    expect(audit.status).toBe('needs-attention');
    expect(audit.missingCommand).toBeNull();
    expect(audit.deployNeedsVerification).toBe(true);
    expect(audit.deployRestrictedToMain).toBe(false);
  });

  it('flags CI workflows where production deploy is missing Cloudflare secrets', () => {
    const audit = auditCiWorkflow(`
jobs:
  verify:
    steps:
      - run: npm run verify:release
  deploy:
    needs: [verify]
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: cloudflare/wrangler-action@v3
`);

    expect(audit.status).toBe('needs-attention');
    expect(audit.missingCommand).toBeNull();
    expect(audit.deployNeedsVerification).toBe(true);
    expect(audit.deployRestrictedToMain).toBe(true);
    expect(audit.deployHasCloudflareSecrets).toBe(false);
    expect(audit.missingCloudflareSecrets).toEqual([
      'secrets.CLOUDFLARE_API_TOKEN',
      'secrets.CLOUDFLARE_ACCOUNT_ID',
    ]);
  });

  it('flags CI workflows where production deploy skips minification', () => {
    const audit = auditCiWorkflow(`
jobs:
  verify:
    steps:
      - run: npm run verify:release
  deploy:
    needs: [verify]
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: \${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: \${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy
`);

    expect(audit.status).toBe('needs-attention');
    expect(audit.missingCommand).toBeNull();
    expect(audit.deployNeedsVerification).toBe(true);
    expect(audit.deployRestrictedToMain).toBe(true);
    expect(audit.deployHasCloudflareSecrets).toBe(true);
    expect(audit.deployUsesMinify).toBe(false);
    expect(audit.missingDeployCommandFlag).toBe('--minify');
  });

  it('keeps the checked-in GitHub workflow wired to release verification', () => {
    const audit = auditCiWorkflowFile('.github/workflows/ci-cd.yml');

    expect(audit.status).toBe('ready');
    expect(audit.missingCommand).toBeNull();
    expect(audit.deployNeedsVerification).toBe(true);
    expect(audit.deployRestrictedToMain).toBe(true);
    expect(audit.deployHasCloudflareSecrets).toBe(true);
    expect(audit.deployUsesMinify).toBe(true);
  });
});
