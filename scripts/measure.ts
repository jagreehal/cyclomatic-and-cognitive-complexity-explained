/**
 * Measure every named function in a directory three ways:
 * modified cyclomatic and cognitive (both enforced by the ratchet), and classic
 * cyclomatic (for comparison only). Used by the examples scripts.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assignCognitive,
  COMPLEXITY_RE,
  functionNameAt,
  runBiomeCognitive,
  runOxlint,
  type FunctionSpan,
} from '../src/collect.js';
import { parseFunctionName } from '../src/identity.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export type Measurement = {
  functionName: string;
  modified: number;
  classic: number;
  /** Biome only reports scores above 1, so "≤1" means 0 or 1. */
  cognitive: number | '≤1';
};

type Scored = { at: string; span: FunctionSpan; score: number; name?: string };

function oxlintScores(dir: string, config: string): Scored[] {
  return runOxlint([dir], config).flatMap((d) => {
    const match = d.message.match(COMPLEXITY_RE);
    const span = d.labels?.[0]?.span;
    if (!match?.groups || !d.filename || span?.line === undefined) return [];
    const file = path.resolve(root, d.filename);
    const name =
      (span.offset === undefined ? undefined : functionNameAt(file, span.offset)) ??
      parseFunctionName(match.groups.label);
    return [
      {
        at: `${file}:${span.offset}`,
        span: { file, offset: span.offset ?? -1, length: span.length ?? 0 },
        score: Number(match.groups.score),
        name,
      },
    ];
  });
}

export function measureDirectory(dir: string): Measurement[] {
  const abs = path.resolve(dir);
  const classic = new Map(
    oxlintScores(abs, path.join(root, 'config/oxlint-classic.json')).map((s) => [s.at, s.score]),
  );
  const modified = oxlintScores(abs, path.join(root, 'config/oxlint-cyclomatic.json'));
  const { scores: cognitive } = assignCognitive(modified.map((s) => s.span), runBiomeCognitive([abs]));

  return modified.flatMap((s, i) =>
    s.name === undefined
      ? []
      : [
          {
            functionName: s.name,
            modified: s.score,
            classic: classic.get(s.at) ?? s.score,
            cognitive: cognitive[i] ?? ('≤1' as const),
          },
        ],
  );
}
