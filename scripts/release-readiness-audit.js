import fs from 'fs';
import { execFileSync } from 'child_process';
import { pathToFileURL } from 'url';

export const RELEASE_READINESS_COMMANDS = [
  {
    id: 'tests',
    label: 'Full Vitest suite',
    command: 'npm test -- --run',
  },
  {
    id: 'build',
    label: 'Production Vite build',
    command: 'npm run build',
  },
  {
    id: 'content-volume',
    label: 'Content volume audit',
    command: 'node scripts/content-volume-audit.js',
  },
  {
    id: 'd1-query-indexes',
    label: 'D1 query index audit',
    command: 'node scripts/d1-query-index-audit.js',
  },
  {
    id: 'gdd-coverage',
    label: 'GDD coverage audit',
    command: 'node scripts/gdd-coverage-audit.js',
  },
  {
    id: 'monetization-fairness',
    label: 'Monetization fairness audit',
    command: 'node scripts/monetization-fairness-audit.js',
  },
  {
    id: 'web-performance',
    label: 'Web performance audit',
    command: 'node scripts/web-performance-audit.js',
  },
  {
    id: 'worker-dry-run',
    label: 'Cloudflare Worker dry-run deploy',
    command: 'npx wrangler deploy --dry-run --outdir /tmp/pokemon-worker-dry-run',
  },
];

export const PRE_PUSH_RELEASE_COMMAND = 'npm run verify:release';
export const EXPECTED_HOOKS_PATH = '.githooks';
export const CI_RELEASE_COMMAND = 'npm run verify:release';
export const CI_CLOUDFLARE_SECRETS = [
  'secrets.CLOUDFLARE_API_TOKEN',
  'secrets.CLOUDFLARE_ACCOUNT_ID',
];
export const CI_DEPLOY_COMMAND_FLAG = '--minify';

export function auditReleaseReadiness({
  packageJson = {},
  scriptName = 'verify:release',
  requiredCommands = RELEASE_READINESS_COMMANDS,
} = {}) {
  const script = packageJson.scripts?.[scriptName] || '';
  const normalizedScript = normalizeCommand(script);
  const missingCommands = requiredCommands.filter((step) => {
    return !normalizedScript.includes(normalizeCommand(step.command));
  });

  return {
    status: missingCommands.length ? 'needs-attention' : 'ready',
    scriptName,
    script,
    requiredCommands,
    missingCommands,
  };
}

export function auditPrePushHook(hookSource = '', {
  requiredCommand = PRE_PUSH_RELEASE_COMMAND,
} = {}) {
  const hasRequiredCommand = normalizeCommand(hookSource).includes(normalizeCommand(requiredCommand));

  return {
    status: hasRequiredCommand ? 'ready' : 'needs-attention',
    requiredCommand,
    missingCommand: hasRequiredCommand ? null : requiredCommand,
  };
}

export function auditPrePushHookFile(hookFile = '.githooks/pre-push') {
  return auditPrePushHook(fs.existsSync(hookFile) ? fs.readFileSync(hookFile, 'utf8') : '');
}

export function auditGitHooksPath(actualHooksPath = '', {
  expectedHooksPath = EXPECTED_HOOKS_PATH,
} = {}) {
  return {
    status: actualHooksPath === expectedHooksPath ? 'ready' : 'needs-attention',
    expectedHooksPath,
    actualHooksPath,
  };
}

export function auditLocalGitHooksPath() {
  return auditGitHooksPath(readGitHooksPath());
}

export function auditCiWorkflow(workflowSource = '', {
  requiredCommand = CI_RELEASE_COMMAND,
  deployJobName = 'deploy',
} = {}) {
  const hasRequiredCommand = normalizeCommand(workflowSource).includes(normalizeCommand(requiredCommand));
  const jobs = extractWorkflowJobs(workflowSource);
  const verificationJobName = Object.entries(jobs).find(([, body]) => {
    return normalizeCommand(body).includes(normalizeCommand(requiredCommand));
  })?.[0] || null;
  const deployBody = jobs[deployJobName] || '';
  const deployNeedsVerification = Boolean(
    verificationJobName && jobNeeds(deployBody, verificationJobName),
  );
  const deployRestrictedToMain = jobHasMainBranchGate(deployBody);
  const missingCloudflareSecrets = CI_CLOUDFLARE_SECRETS.filter((secretName) => {
    return !deployBody.includes(secretName);
  });
  const deployHasCloudflareSecrets = missingCloudflareSecrets.length === 0;
  const deployUsesMinify = deployBody.includes(CI_DEPLOY_COMMAND_FLAG);
  const ready = hasRequiredCommand
    && deployNeedsVerification
    && deployRestrictedToMain
    && deployHasCloudflareSecrets
    && deployUsesMinify;

  return {
    status: ready ? 'ready' : 'needs-attention',
    requiredCommand,
    missingCommand: hasRequiredCommand ? null : requiredCommand,
    deployJobName,
    verificationJobName,
    deployNeedsVerification,
    missingDeployDependency: deployNeedsVerification ? null : verificationJobName,
    deployRestrictedToMain,
    missingDeployBranchGate: deployRestrictedToMain ? null : "github.ref == 'refs/heads/main'",
    deployHasCloudflareSecrets,
    missingCloudflareSecrets,
    deployUsesMinify,
    missingDeployCommandFlag: deployUsesMinify ? null : CI_DEPLOY_COMMAND_FLAG,
  };
}

export function auditCiWorkflowFile(workflowFile = '.github/workflows/ci-cd.yml') {
  return auditCiWorkflow(fs.existsSync(workflowFile) ? fs.readFileSync(workflowFile, 'utf8') : '');
}

export function auditPackageReleaseReadiness(packageJsonFile = 'package.json') {
  return auditReleaseReadiness({
    packageJson: JSON.parse(fs.readFileSync(packageJsonFile, 'utf8')),
  });
}

function normalizeCommand(command = '') {
  return String(command).replace(/\s+/g, ' ').trim();
}

function extractWorkflowJobs(workflowSource = '') {
  const jobs = {};
  const lines = String(workflowSource).split(/\r?\n/);
  let insideJobs = false;
  let currentJob = null;
  let currentBody = [];

  for (const line of lines) {
    if (/^jobs:\s*$/.test(line)) {
      insideJobs = true;
      continue;
    }

    if (!insideJobs) {
      continue;
    }

    if (/^\S/.test(line)) {
      break;
    }

    const jobMatch = line.match(/^  ([A-Za-z0-9_-]+):\s*$/);
    if (jobMatch) {
      if (currentJob) {
        jobs[currentJob] = currentBody.join('\n');
      }
      currentJob = jobMatch[1];
      currentBody = [];
      continue;
    }

    if (currentJob) {
      currentBody.push(line);
    }
  }

  if (currentJob) {
    jobs[currentJob] = currentBody.join('\n');
  }

  return jobs;
}

function jobNeeds(jobBody = '', neededJobName = '') {
  const lines = String(jobBody).split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const needsMatch = line.match(/^(\s*)needs:\s*(.*)$/);
    if (!needsMatch) {
      continue;
    }

    const [, indent, value] = needsMatch;
    if (needsValueIncludesJob(value, neededJobName)) {
      return true;
    }

    for (let nextIndex = index + 1; nextIndex < lines.length; nextIndex += 1) {
      const nextLine = lines[nextIndex];
      const nextIndent = nextLine.match(/^(\s*)/)?.[1] || '';
      if (nextLine.trim() && nextIndent.length <= indent.length) {
        break;
      }
      if (nextLine.trim().startsWith('-') && needsValueIncludesJob(nextLine, neededJobName)) {
        return true;
      }
    }
  }

  return false;
}

function needsValueIncludesJob(value = '', jobName = '') {
  return String(value)
    .replace(/[[\],]/g, ' ')
    .split(/\s+/)
    .some((token) => token === jobName || token === `-${jobName}`);
}

function jobHasMainBranchGate(jobBody = '') {
  const normalized = normalizeCommand(jobBody)
    .replace(/"/g, "'")
    .replace(/\s*==\s*/g, ' == ');

  return normalized.includes("if: github.ref == 'refs/heads/main'");
}

function readGitHooksPath() {
  try {
    return execFileSync('git', ['config', '--get', 'core.hooksPath'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function printAudit(audit) {
  console.log(`Release readiness audit: ${audit.status}`);
  console.log(`Script: ${audit.scriptName}`);
  for (const step of audit.requiredCommands) {
    const present = !audit.missingCommands.some((missing) => missing.id === step.id);
    console.log(`${present ? '✓' : 'x'} ${step.label}: ${step.command}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const audit = auditPackageReleaseReadiness(process.argv[2] || 'package.json');
  const hookAudit = auditPrePushHookFile(process.argv[3] || '.githooks/pre-push');
  const hooksPathAudit = auditLocalGitHooksPath();
  const ciAudit = auditCiWorkflowFile(process.argv[4] || '.github/workflows/ci-cd.yml');
  printAudit(audit);
  console.log(`Pre-push hook audit: ${hookAudit.status}`);
  if (hookAudit.missingCommand) {
    console.log(`Missing pre-push command: ${hookAudit.missingCommand}`);
  }
  console.log(`Git hooks path audit: ${hooksPathAudit.status} (${hooksPathAudit.actualHooksPath || 'unset'} -> ${hooksPathAudit.expectedHooksPath})`);
  console.log(`CI workflow audit: ${ciAudit.status}`);
  if (ciAudit.missingCommand) {
    console.log(`Missing CI command: ${ciAudit.missingCommand}`);
  }
  if (ciAudit.missingDeployDependency) {
    console.log(`Missing CI deploy dependency: ${ciAudit.deployJobName} needs ${ciAudit.missingDeployDependency}`);
  }
  if (ciAudit.missingDeployBranchGate) {
    console.log(`Missing CI deploy branch gate: ${ciAudit.deployJobName} if ${ciAudit.missingDeployBranchGate}`);
  }
  for (const secretName of ciAudit.missingCloudflareSecrets) {
    console.log(`Missing CI deploy secret: ${secretName}`);
  }
  if (ciAudit.missingDeployCommandFlag) {
    console.log(`Missing CI deploy command flag: ${ciAudit.missingDeployCommandFlag}`);
  }
  if (
    audit.status !== 'ready'
    || hookAudit.status !== 'ready'
    || hooksPathAudit.status !== 'ready'
    || ciAudit.status !== 'ready'
  ) {
    process.exitCode = 1;
  }
}
