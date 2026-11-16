/**
 * Measure every named function in a directory three ways: modified cyclomatic and cognitive
 * (both enforced by the ratchet), and classic cyclomatic (for comparison only). Used by the
 * examples scripts.
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { measure } from './autoratchet.js';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const oxlint = path.join(path.dirname(require.resolve('oxlint/package.json')), 'bin/oxlint');

export type Measurement = {
  functionName: string;
  modified: number;
  classic: number;
  /** AutoRatchet records cognitive scores of 0 and 1 as 1, so "≤1" means 0 or 1. */
  cognitive: number | '≤1';
};

/** Classic cyclomatic scores from Oxlint, by file and line. */
function classicScores(dir: string): Map<string, number> {
  const result = spawnSync(
    process.execPath,
    [oxlint, '-c', path.join(root, 'config/oxlint-classic.json'), '-f', 'json', dir],
    { encoding: 'utf8', maxBuffer: 1 << 30 },
  );
  const diagnostics = JSON.parse(result.stdout).diagnostics as Array<{
    message: string;
    filename: string;
    labels: Array<{ span: { line: number } }>;
  }>;
  const scores = new Map<string, number>();
  for (const d of diagnostics) {
    const score = Number(d.message.match(/complexity of (\d+)/)?.[1]);
    // Oxlint prints paths relative to its working directory.
    const key = `${path.relative(dir, path.resolve(d.filename))}:${d.labels[0]!.span.line}`;
    // Two functions on one line would make the pairing ambiguous: none of the examples has one.
    if (scores.has(key)) throw new Error(`${key}: two functions on one line`);
    scores.set(key, score);
  }
  return scores;
}

export function measureDirectory(dir: string): Measurement[] {
  const abs = path.resolve(dir);
  const classic = classicScores(abs);
  return measure(abs).map((s) => {
    const classicScore = classic.get(`${s.filePath}:${s.line}`);
    if (classicScore === undefined) throw new Error(`${s.filePath}:${s.line}: no classic score`);
    return {
      functionName: s.functionName,
      modified: s.cyclomatic,
      classic: classicScore,
      cognitive: s.cognitive > 1 ? s.cognitive : ('≤1' as const),
    };
  });
}
