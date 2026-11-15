import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const oxlint = path.join(
  path.dirname(require.resolve('oxlint/package.json')),
  'bin/oxlint',
);

/**
 * Prove Oxlint bulk suppressions stay green when processPayment gets worse
 * but the per-file violation *count* does not increase.
 */
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'complexity-oxlint-'));
fs.copyFileSync(
  path.join(root, 'fixtures/head-fail/payments.ts'),
  path.join(work, 'payments.ts'),
);
fs.copyFileSync(
  path.join(root, 'fixtures/oxlint-suppressions.json'),
  path.join(work, 'oxlint-suppressions.json'),
);
fs.copyFileSync(
  path.join(root, 'oxlint.fixtures.json'),
  path.join(work, '.oxlintrc.json'),
);

const result = spawnSync(process.execPath, [oxlint, 'payments.ts'], {
  cwd: work,
  encoding: 'utf8',
});

fs.rmSync(work, { recursive: true, force: true });

if (result.status !== 0) {
  console.error(result.stdout);
  console.error(result.stderr);
  throw new Error(
    `demo:oxlint-baseline expected exit 0, got ${result.status}`,
  );
}

console.log(
  'demo:oxlint-baseline passed: bulk suppressions still green after processPayment got worse.',
);
