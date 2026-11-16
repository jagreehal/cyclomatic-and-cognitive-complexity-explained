/**
 * Keeps the README honest: fixture scores and quoted report lines must match.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { compare, measure, type Snapshot } from './autoratchet.js';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const oxlint = path.join(path.dirname(require.resolve('oxlint/package.json')), 'bin/oxlint');

// Cognitive scores the README quotes for the opening story.
const expectedCognitive = {
  base: { processPayment: 28, validateCustomer: 14 },
  headFail: { processPayment: 38, validateCustomer: 15 },
} as const;

const expectedBase = {
  processPayment: 19,
  validateCustomer: 12,
  createOrder: 5,
  nested: 4,
  flat: 4,
} as const;

const expectedHeadFail = {
  processPayment: 24,
  validateCustomer: 13,
  createOrder: 8,
  createRefund: 14,
} as const;

const expectedHeadPass = {
  processPayment: 13,
  validateCustomer: 9,
  createOrder: 8,
} as const;

function find(snapshots: Snapshot[], filePath: string, name: string): Snapshot | undefined {
  return snapshots.find((s) => s.filePath === filePath && s.functionName === name);
}

function assertScores(
  label: string,
  snapshots: Snapshot[],
  expected: Record<string, number>,
  filePath: string,
) {
  for (const [name, cyclomatic] of Object.entries(expected)) {
    const key = `${name === 'createRefund' ? 'refunds.ts' : filePath}::${name}`;
    const actual = find(snapshots, name === 'createRefund' ? 'refunds.ts' : filePath, name);
    if (!actual) throw new Error(`${label}: missing ${key}`);
    if (actual.cyclomatic !== cyclomatic) {
      throw new Error(`${label}: ${key} expected ${cyclomatic}, got ${actual.cyclomatic}`);
    }
  }
}

function assertCognitive(label: string, snapshots: Snapshot[], expected: Record<string, number>) {
  for (const [name, cognitive] of Object.entries(expected)) {
    const actual = find(snapshots, 'payments.ts', name)?.cognitive;
    if (actual !== cognitive) {
      throw new Error(`${label}: ${name} cognitive expected ${cognitive}, got ${actual}`);
    }
  }
}

const base = measure(path.join(root, 'fixtures/base'));
assertScores('base', base, expectedBase, 'payments.ts');
assertCognitive('base', base, expectedCognitive.base);

const headFail = measure(path.join(root, 'fixtures/head-fail'));
assertScores('head-fail', headFail, expectedHeadFail, 'payments.ts');
assertCognitive('head-fail', headFail, expectedCognitive.headFail);

const headPass = measure(path.join(root, 'fixtures/head-pass'));
assertScores('head-pass', headPass, expectedHeadPass, 'payments.ts');

const suppressions = JSON.parse(
  fs.readFileSync(path.join(root, 'fixtures/oxlint-suppressions.json'), 'utf8'),
) as { 'payments.ts': { complexity: { count: number } } };

if (suppressions['payments.ts'].complexity.count !== 2) {
  throw new Error('suppressions complexity count must stay 2');
}

const failReport = compare(
  path.join(root, 'fixtures/base'),
  path.join(root, 'fixtures/head-fail'),
).report;
for (const needle of [
  'processPayment\n    cyclomatic: 19 → 24 (+5)\n    cognitive: 28 → 38 (+10)',
  'validateCustomer\n    cyclomatic: 12 → 13 (+1)',
  'createRefund (new function)\n    cyclomatic: 14 (maximum for new code: 10)\n    cognitive: 18 (maximum for new code: 15)',
  'Quality gate failed.',
]) {
  if (!failReport.includes(needle)) {
    throw new Error(`ratchet-fail report missing: ${needle}\n\n${failReport}`);
  }
}

const passCompare = compare(path.join(root, 'fixtures/base'), path.join(root, 'fixtures/head-pass'));
if (passCompare.verdict !== 'pass') {
  throw new Error('head-pass must have zero regressions');
}

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'complexity-oxlint-check-'));
fs.copyFileSync(path.join(root, 'fixtures/head-fail/payments.ts'), path.join(work, 'payments.ts'));
fs.copyFileSync(
  path.join(root, 'fixtures/oxlint-suppressions.json'),
  path.join(work, 'oxlint-suppressions.json'),
);
fs.copyFileSync(path.join(root, 'oxlint.fixtures.json'), path.join(work, '.oxlintrc.json'));
const lint = spawnSync(process.execPath, [oxlint, 'payments.ts'], {
  cwd: work,
  encoding: 'utf8',
});
fs.rmSync(work, { recursive: true, force: true });
if (lint.status !== 0) {
  throw new Error(`oxlint baseline check failed:\n${lint.stdout}\n${lint.stderr}`);
}

console.log('demo:check passed: fixture scores and report lines match the README contract.');
