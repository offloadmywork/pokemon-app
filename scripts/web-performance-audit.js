import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { gzipSync } from 'zlib';

export const PERFORMANCE_BUDGET_TARGETS = {
  dependencies: {
    forbidden: [
      'framer-motion',
      'gsap',
      'lottie-web',
      '@lottiefiles/react-lottie-player',
      'three',
      '@react-three/fiber',
    ],
  },
  motion: {
    maxInfiniteAnimationsPerFile: 12,
  },
  assets: {
    maxJavaScriptGzipBytes: 110 * 1024,
    maxCssGzipBytes: 16 * 1024,
    maxTotalGzipBytes: 140 * 1024,
  },
};

export function auditDependencies(packageJson = {}, targets = PERFORMANCE_BUDGET_TARGETS.dependencies) {
  const groups = ['dependencies', 'devDependencies'];
  const forbiddenFound = groups.flatMap((group) => {
    const dependencies = packageJson[group] || {};
    return targets.forbidden
      .filter((name) => dependencies[name])
      .map((name) => ({ name, group }));
  });

  return {
    status: forbiddenFound.length ? 'needs-attention' : 'on-target',
    forbidden: targets.forbidden,
    forbiddenFound,
  };
}

export function auditSourceMotionBudget(sourceByFile = {}, targets = PERFORMANCE_BUDGET_TARGETS.motion) {
  const files = Object.entries(sourceByFile).map(([file, source]) => {
    const infiniteAnimations = countInfiniteAnimations(source);
    return {
      file,
      infiniteAnimations,
      maxInfiniteAnimationsPerFile: targets.maxInfiniteAnimationsPerFile,
    };
  });
  const filesOverBudget = files.filter((file) => file.infiniteAnimations > targets.maxInfiniteAnimationsPerFile);

  return {
    status: filesOverBudget.length ? 'needs-attention' : 'on-target',
    maxInfiniteAnimationsPerFile: targets.maxInfiniteAnimationsPerFile,
    files,
    filesOverBudget,
  };
}

export function auditBuildAssetBudget({
  assets = null,
  distDir = 'dist/assets',
  targets = PERFORMANCE_BUDGET_TARGETS.assets,
} = {}) {
  const assetEntries = assets
    ? Object.entries(assets)
    : readBuildAssets(distDir);

  if (!assetEntries.length) {
    return {
      status: 'skipped',
      reason: 'No built assets found. Run npm run build before enforcing asset budgets.',
      files: [],
      filesOverBudget: [],
      totalGzipBytes: 0,
      maxTotalGzipBytes: targets.maxTotalGzipBytes,
    };
  }

  const files = assetEntries.map(([file, contents]) => {
    const buffer = Buffer.isBuffer(contents) ? contents : Buffer.from(String(contents));
    const type = getAssetType(file);
    const gzipBytes = gzipSync(buffer).length;

    return {
      file,
      type,
      rawBytes: buffer.length,
      gzipBytes,
      maxGzipBytes: getAssetBudget(type, targets),
    };
  });
  const totalGzipBytes = files.reduce((total, file) => total + file.gzipBytes, 0);
  const filesOverBudget = files.filter((file) => file.maxGzipBytes && file.gzipBytes > file.maxGzipBytes);
  const totalOverBudget = totalGzipBytes > targets.maxTotalGzipBytes;

  return {
    status: filesOverBudget.length || totalOverBudget ? 'needs-attention' : 'on-target',
    files,
    filesOverBudget,
    totalGzipBytes,
    maxTotalGzipBytes: targets.maxTotalGzipBytes,
    totalOverBudget,
  };
}

export function auditWebPerformance({
  packageJsonFile = 'package.json',
  sourceGlobs = ['src/**/*.js', 'src/**/*.jsx', 'src/**/*.css'],
  distDir = 'dist/assets',
  targets = PERFORMANCE_BUDGET_TARGETS,
} = {}) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonFile, 'utf8'));
  const sourceByFile = readSources(sourceGlobs);
  const dependencies = auditDependencies(packageJson, targets.dependencies);
  const motion = auditSourceMotionBudget(sourceByFile, targets.motion);
  const assets = auditBuildAssetBudget({ distDir, targets: targets.assets });
  const status = [dependencies.status, motion.status, assets.status].every((value) => value === 'on-target' || value === 'skipped')
    ? 'on-target'
    : 'needs-attention';

  return {
    status,
    dependencies,
    motion,
    assets,
  };
}

function countInfiniteAnimations(source = '') {
  return (String(source).match(/\binfinite\b/g) || []).length;
}

function readSources(globs) {
  return globs.reduce((sources, glob) => {
    for (const file of expandSourceGlob(glob)) {
      sources[file] = fs.readFileSync(file, 'utf8');
    }
    return sources;
  }, {});
}

function readBuildAssets(distDir) {
  if (!fs.existsSync(distDir)) return [];

  const files = [];
  walkFiles(distDir, files);
  return files
    .filter((file) => fs.statSync(file).isFile())
    .sort()
    .map((file) => [file, fs.readFileSync(file)]);
}

function getAssetType(file) {
  const extension = path.extname(file);
  if (extension === '.js') return 'javascript';
  if (extension === '.css') return 'css';
  return 'asset';
}

function getAssetBudget(type, targets) {
  if (type === 'javascript') return targets.maxJavaScriptGzipBytes;
  if (type === 'css') return targets.maxCssGzipBytes;
  return null;
}

function expandSourceGlob(glob) {
  const match = glob.match(/^(.+?)\/\*\*\/\*\.\{?([a-z,]+)\}?$/i)
    || glob.match(/^(.+?)\/\*\*\/\*\.([a-z]+)$/i);
  if (!match) return fs.existsSync(glob) ? [glob] : [];

  const root = match[1];
  const extensions = match[2].split(',').map((extension) => `.${extension}`);
  const files = [];
  walkFiles(root, files);
  return files
    .filter((file) => extensions.includes(path.extname(file)))
    .sort();
}

function walkFiles(currentPath, files) {
  if (!fs.existsSync(currentPath)) return;

  const stat = fs.statSync(currentPath);
  if (stat.isFile()) {
    files.push(currentPath);
    return;
  }

  for (const entry of fs.readdirSync(currentPath)) {
    walkFiles(path.join(currentPath, entry), files);
  }
}

function printAudit(audit) {
  console.log(`Web performance audit: ${audit.status}`);
  console.log(`Forbidden heavy dependencies: ${audit.dependencies.forbiddenFound.map((dependency) => dependency.name).join(', ') || 'none'}`);
  console.log(`Animation files over budget: ${audit.motion.filesOverBudget.map((file) => file.file).join(', ') || 'none'}`);
  console.log(`Built assets: ${audit.assets.status} (${audit.assets.totalGzipBytes} gzip bytes / ${audit.assets.maxTotalGzipBytes} budget)`);
  console.log(`Asset files over budget: ${audit.assets.filesOverBudget.map((file) => file.file).join(', ') || 'none'}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  printAudit(auditWebPerformance());
}
