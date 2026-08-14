#!/usr/bin/env node
/**
 * Phase 1 inventory helper.
 * Run from repository root:
 *   node scripts/ux-repo-inventory.mjs > ux-research/phase-1/repo-inventory.generated.json
 *
 * This script does not decide product semantics. It deterministically enumerates
 * relevant UX surfaces so agents can classify each as reuse/refactor/extend/build/retire.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const includeRoots = ['app', 'components', 'hooks', 'lib', 'styles', 'e2e', 'tests'];
const ignored = new Set(['node_modules', '.next', '.git', 'playwright-report', 'test-results', 'coverage']);

function walk(abs, rel = '') {
  if (!fs.existsSync(abs)) return [];
  const out = [];
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const childAbs = path.join(abs, entry.name);
    const childRel = path.join(rel, entry.name).split(path.sep).join('/');
    if (entry.isDirectory()) out.push(...walk(childAbs, childRel));
    else out.push(childRel);
  }
  return out;
}

function kindFor(file) {
  if (file.startsWith('app/api/')) return 'api';
  if (file.startsWith('app/')) return 'route-or-app';
  if (file.startsWith('components/')) return 'component';
  if (file.startsWith('hooks/')) return 'hook';
  if (file.startsWith('lib/')) return 'service-or-library';
  if (file.startsWith('styles/')) return 'style';
  if (file.startsWith('e2e/')) return 'e2e';
  if (file.startsWith('tests/')) return 'test';
  return 'other';
}

function routeFor(file) {
  if (!file.startsWith('app/') || !/(^|\/)page\.(t|j)sx?$/.test(file)) return null;
  const route = file
    .replace(/^app\//, '/')
    .replace(/\/page\.(t|j)sx?$/, '')
    .replace(/\([^/]+\)\//g, '')
    .replace(/\/+/g, '/');
  return route === '' ? '/' : route;
}

const files = [];
for (const base of includeRoots) {
  for (const relative of walk(path.join(root, base), base)) {
    const stat = fs.statSync(path.join(root, relative));
    files.push({
      path: relative,
      kind: kindFor(relative),
      route: routeFor(relative),
      bytes: stat.size,
      classification: null,
      gasCapabilities: [],
      dependencies: [],
      notes: null
    });
  }
}

const summary = files.reduce((acc, item) => {
  acc[item.kind] = (acc[item.kind] || 0) + 1;
  return acc;
}, {});

console.log(JSON.stringify({
  generatedAt: new Date().toISOString(),
  phase: 1,
  roots: includeRoots,
  summary,
  files
}, null, 2));
