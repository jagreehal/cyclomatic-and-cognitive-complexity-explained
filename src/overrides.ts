import fs from 'node:fs';
import path from 'node:path';
import { normalizePath } from './identity';

/** Comments that switch off a complexity rule: Oxlint, ESLint and Biome spellings. */
export const OVERRIDE_RE =
  /(?:oxlint-disable|eslint-disable)[\w-]*\s+[^\n]*\bcomplexity\b|biome-ignore[^\n]*noExcessiveCognitiveComplexity/;

export type Override = { filePath: string; line: number; text: string };

const SOURCE_RE = /\.(?:[cm]?[jt]sx?)$/;

function sourceFiles(dir: string): string[] {
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
          ? [{ filePath: normalizePath(path.relative(dir, file)), line: i + 1, text: text.trim() }]
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
