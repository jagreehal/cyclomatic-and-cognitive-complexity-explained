/**
 * Assert examples/* still match examples/expected-results.json (and thus the README).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { measureExamples } from './run-examples.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const expected = JSON.parse(
  fs.readFileSync(path.join(root, 'examples/expected-results.json'), 'utf8'),
);

const { scores, ratchets } = await measureExamples();
const actual = { scores, ratchets: ratchets.map(({ report: _report, ...r }) => r) };

if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  console.error('examples drifted from examples/expected-results.json.');
  console.error(
    'Run `pnpm examples` to see current scores, then update the README and `pnpm examples:write`.',
  );
  console.error(
    `expected:\n${JSON.stringify(expected, null, 2)}\n\nactual:\n${JSON.stringify(actual, null, 2)}`,
  );
  process.exit(1);
}

console.log(
  `check-examples passed: ${scores.length} scores, ${ratchets.length} ratchet scenarios.`,
);
