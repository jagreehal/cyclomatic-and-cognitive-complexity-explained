import fs from 'node:fs';
import path from 'node:path';
import type { FunctionSnapshot, Metric } from './gate.js';
import { functionKey, normalizePath } from './identity.js';

/** Comments that switch off a complexity rule: Oxlint, ESLint and Biome spellings. */
export const OVERRIDE_RE =
  /(?:oxlint-disable|eslint-disable)[\w-]*\s+[^\n]*\bcomplexity\b|biome-ignore[^\n]*noExcessiveCognitiveComplexity/;

export type Override = {
  filePath: string;
  line: number;
  text: string;
  /** Oxlint/ESLint `complexity` overrides cover cyclomatic; Biome's cover cognitive. */
  metric: Metric;
};

/** A new override that sits on a function: it approves that function's current score on one metric. */
export type Approval = { override: Override; functionName: string; score: number | undefined };

const SOURCE_RE = /\.(?:[cm]?[jt]sx?)$/;

export function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) return [];
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return SOURCE_RE.test(entry.name) ? [full] : [];
  });
}

export function findOverrides(dir: string): Override[] {
  return sourceFiles(dir).flatMap((file) =>
    fs
      .readFileSync(file, 'utf8')
      .split('\n')
      .flatMap((text, i) =>
        OVERRIDE_RE.test(text)
          ? [
              {
                filePath: normalizePath(path.relative(dir, file)),
                line: i + 1,
                text: text.trim(),
                metric: text.includes('biome-ignore') ? ('cognitive' as const) : ('cyclomatic' as const),
              },
            ]
          : [],
      ),
  );
}

/**
 * Overrides in head that base did not have, matched by file and comment text,
 * so moving an existing comment down a few lines is not reported as new.
 */
export function newOverrides(base: Override[], head: Override[]): Override[] {
  const remaining = new Map<string, number>();
  for (const o of base) {
    const key = `${o.filePath}\0${o.text}`;
    remaining.set(key, (remaining.get(key) ?? 0) + 1);
  }
  return head.filter((o) => {
    const key = `${o.filePath}\0${o.text}`;
    const left = remaining.get(key) ?? 0;
    if (left === 0) return true;
    remaining.set(key, left - 1);
    return false;
  });
}

/**
 * Match each new override to the function on its line or the next one
 * (`disable-line` / `disable-next-line` / `biome-ignore`). File-wide or misplaced
 * overrides match nothing: the gate ignores them, and the report says so.
 */
// Overrides that target one line. A block `oxlint-disable` comment, `biome-ignore-all` and `-start` cover more.
const FUNCTION_LEVEL_RE = /-disable-next-line|-disable-line|biome-ignore\s/;

export function matchOverrides(
  overrides: Override[],
  current: Map<string, FunctionSnapshot>,
): { approvals: Approval[]; unmatched: Override[] } {
  const approvals: Approval[] = [];
  const unmatched: Override[] = [];
  const snaps = [...current.values()];
  for (const o of overrides) {
    if (!FUNCTION_LEVEL_RE.test(o.text)) {
      unmatched.push(o);
      continue;
    }
    const fn =
      snaps.find((s) => s.filePath === o.filePath && s.line === o.line + 1) ??
      snaps.find((s) => s.filePath === o.filePath && s.line === o.line);
    if (fn) approvals.push({ override: o, functionName: fn.functionName, score: fn[o.metric] });
    else unmatched.push(o);
  }
  return { approvals, unmatched };
}

export function approvalKey(filePath: string, functionName: string, metric: Metric): string {
  return `${functionKey(filePath, functionName)}\0${metric}`;
}
