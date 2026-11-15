/**
 * Measure every examples/* scenario and print README-ready results.
 * Pass --write to refresh examples/expected-results.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectFromDirectory } from '../src/collect';
import { comparePaths } from '../src/compare';
import { formatReport } from '../src/report';
import { measureDirectory } from './measure';

export const scoreExamples = [
  '01-nested-vs-flat',
  '02-modified-switch',
  '03-early-returns',
  '04-deep-nesting',
  '05-boolean-chains',
  '06-exhaustive-error-switch',
  '07-class-methods',
  '13-loops-and-catch',
  '14-ternaries',
  '15-optional-chaining',
  '16-what-counts',
  '17-false-positives',
  '18-refactoring-toolkit',
] as const;

export const ratchetExamples = [
  '08-ratchet-worsen',
  '09-ratchet-improve',
  '10-ratchet-new-hot',
  '11-ratchet-cold-rise',
  '12-ratchet-mixed',
  '19-ratchet-false-positive',
  '20-ratchet-override',
  '21-ratchet-loophole-disable',
  '22-ratchet-arrow-tracked',
  '23-ratchet-loophole-slice',
  '24-ratchet-nesting',
] as const;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const examplesRoot = path.join(root, 'examples');

export async function measureExamples() {
  const scores = scoreExamples.flatMap((example) =>
    measureDirectory(path.join(examplesRoot, example))
      .sort((a, b) => a.functionName.localeCompare(b.functionName))
      .map((m) => ({ example, ...m })),
  );

  const ratchets = [];
  for (const example of ratchetExamples) {
    const result = await comparePaths(
      path.join(examplesRoot, example, 'base'),
      path.join(examplesRoot, example, 'head'),
    );
    ratchets.push({
      example,
      pass: result.regressions.length === 0,
      regressions: result.regressions.map((r) => ({
        functionName: r.functionName,
        metric: r.metric,
        previous: r.previous,
        current: r.current,
        kind: r.kind,
      })),
      report: formatReport(result.regressions, result.untracked, result.overrides),
    });
  }
  return { scores, ratchets };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { scores, ratchets } = await measureExamples();

  console.log('# Example measurements\n');
  console.log('modified = Oxlint modified cyclomatic (enforced), cognitive = Biome (enforced), classic = Oxlint classic (comparison only)\n');
  let current = '';
  for (const row of scores) {
    if (row.example !== current) {
      current = row.example;
      console.log(`\n## ${current}`);
    }
    console.log(
      `- ${row.functionName}: modified=${row.modified} classic=${row.classic} cognitive=${row.cognitive}`,
    );
  }

  console.log('\n# Ratchet scenarios\n');
  for (const r of ratchets) {
    const base = await collectFromDirectory(path.join(examplesRoot, r.example, 'base'));
    const head = await collectFromDirectory(path.join(examplesRoot, r.example, 'head'));
    console.log(`## ${r.example} → ${r.pass ? 'PASS' : 'FAIL'}`);
    const names = new Set([...base.values(), ...head.values()].map((s) => s.functionName));
    for (const name of [...names].sort()) {
      const b = [...base.values()].find((s) => s.functionName === name);
      const h = [...head.values()].find((s) => s.functionName === name);
      console.log(
        `- ${name}: cyclomatic ${b?.cyclomatic ?? 'new'} → ${h?.cyclomatic ?? 'gone'}, cognitive ${b?.cognitive ?? 'new'} → ${h?.cognitive ?? 'gone'}`,
      );
    }
    console.log(`\n\`\`\`text\n${r.report}\n\`\`\`\n`);
  }

  if (process.argv.includes('--write')) {
    const out = path.join(examplesRoot, 'expected-results.json');
    const payload = { scores, ratchets: ratchets.map(({ report: _report, ...r }) => r) };
    fs.writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`);
    console.log(`Wrote ${out}`);
  }
}
