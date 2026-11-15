import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import type { FunctionSnapshot } from './gate';
import {
  functionKey,
  normalizePath,
  parseFunctionName,
  variableNameBefore,
} from './identity';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');

export const COMPLEXITY_RE =
  /^(?<label>.+?) has a complexity of (?<score>\d+)\. Maximum allowed is \d+\.?$/i;

export type OxlintDiagnostic = {
  message: string;
  code?: string;
  filename?: string;
  labels?: Array<{
    span?: { offset?: number; length?: number; line?: number; column?: number };
  }>;
};

type OxlintJson = {
  diagnostics?: OxlintDiagnostic[];
};

/** Collect per-function modified cyclomatic scores for a directory of TS/JS. */
export async function collectFromDirectory(
  directory: string,
): Promise<Map<string, FunctionSnapshot>> {
  const absDir = path.resolve(directory);
  const results = runOxlint([absDir]);
  return snapshotsFromDiagnostics(results, absDir, runBiomeCognitive([absDir]));
}

export async function collectFromFiles(
  filePaths: string[],
): Promise<Map<string, FunctionSnapshot>> {
  const absPaths = filePaths.map((p) => path.resolve(p));
  const results = runOxlint(absPaths);
  const commonRoot = longestCommonDirectory(absPaths);
  return snapshotsFromDiagnostics(results, commonRoot, runBiomeCognitive(absPaths));
}

function oxlintBin(): string {
  const pkg = path.dirname(require.resolve('oxlint/package.json'));
  return path.join(pkg, 'bin/oxlint');
}

/** One Biome cognitive diagnostic. Biome points at a function's name, or at `=>` for arrows. */
export type CognitiveHit = { file: string; line: number; column: number; score: number };

/** A function's extent as Oxlint reports it: UTF-8 byte offset and length. */
export type FunctionSpan = { file: string; offset: number; length: number };

/**
 * Biome's lowest allowed maximum is 1, so it never reports functions scoring 0 or 1.
 * Callers treat a function with no hit as 1.
 */
export function runBiomeCognitive(targets: string[]): CognitiveHit[] {
  const bin = path.join(path.dirname(require.resolve('@biomejs/biome/package.json')), 'bin/biome');
  const result = spawnSync(
    process.execPath,
    [
      bin,
      'lint',
      `--config-path=${path.join(repoRoot, 'config/biome-cognitive.json')}`,
      '--reporter=json',
      '--max-diagnostics=none',
      ...targets,
    ],
    { encoding: 'utf8', cwd: repoRoot },
  );
  if (result.error) throw result.error;

  let parsed: {
    diagnostics?: Array<{
      message: string;
      location?: { path?: string; start?: { line: number; column: number } };
    }>;
  };
  try {
    parsed = JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`Failed to parse Biome JSON output:\n${result.stdout}\n${result.stderr}\n${String(error)}`);
  }

  return (parsed.diagnostics ?? []).flatMap((d) => {
    const score = d.message.match(/complexity of (\d+)/)?.[1];
    const file = d.location?.path;
    const start = d.location?.start;
    if (!score || !file || !start) return [];
    return [{ file: path.resolve(repoRoot, file), line: start.line, column: start.column, score: Number(score) }];
  });
}

/**
 * Give each Oxlint function the Biome score that falls inside it. When functions nest,
 * the innermost one wins, because Biome reports each function separately.
 * Returns one entry per span: the score, or undefined (Biome scored it 0 or 1).
 */
export function assignCognitive(spans: FunctionSpan[], hits: CognitiveHit[]): Array<number | undefined> {
  const scores: Array<number | undefined> = spans.map(() => undefined);
  const lineStarts = new Map<string, number[]>();
  const bytes = new Map<string, Buffer>();

  for (const hit of hits) {
    if (!bytes.has(hit.file)) {
      const buf = fs.readFileSync(hit.file);
      bytes.set(hit.file, buf);
      const starts = [0];
      buf.forEach((b, i) => {
        if (b === 10) starts.push(i + 1);
      });
      lineStarts.set(hit.file, starts);
    }
    const buf = bytes.get(hit.file)!;
    const lineStart = lineStarts.get(hit.file)![hit.line - 1] ?? 0;
    // Biome columns count characters from 1; convert to a byte offset.
    const lineText = buf.subarray(lineStart).toString('utf8').split('\n')[0] ?? '';
    const at = lineStart + Buffer.byteLength(lineText.slice(0, hit.column - 1));

    let best = -1;
    spans.forEach((span, i) => {
      const inside = span.file === hit.file && span.offset <= at && at < span.offset + span.length;
      if (inside && (best === -1 || span.length < spans[best]!.length)) best = i;
    });
    if (best === -1) {
      // Methods: Oxlint's span starts after the name, where Biome points. Take the next span on this line.
      const lineEnd = lineStart + Buffer.byteLength(lineText);
      spans.forEach((span, i) => {
        const after = span.file === hit.file && span.offset >= at && span.offset <= lineEnd;
        if (after && (best === -1 || span.offset < spans[best]!.offset)) best = i;
      });
    }
    if (best !== -1) scores[best] = hit.score;
  }
  return scores;
}

function collectorConfigPath(): string {
  return path.join(repoRoot, '.oxlintrc.json');
}

export function runOxlint(
  targets: string[],
  config = collectorConfigPath(),
): OxlintDiagnostic[] {
  const args = [oxlintBin(), '-c', config, '-f', 'json', ...targets];

  const result = spawnSync(process.execPath, args, {
    encoding: 'utf8',
    cwd: repoRoot,
  });

  const stdout = result.stdout?.trim() ?? '';
  if (!stdout) {
    if (result.error) throw result.error;
    return [];
  }

  try {
    const parsed = JSON.parse(stdout) as OxlintJson;
    return parsed.diagnostics ?? [];
  } catch (error) {
    throw new Error(
      `Failed to parse oxlint JSON output:\n${stdout}\n${String(error)}`,
    );
  }
}

export function snapshotsFromDiagnostics(
  diagnostics: OxlintDiagnostic[],
  rootDir: string,
  cognitiveHits?: CognitiveHit[],
): Map<string, FunctionSnapshot> {
  const found: Array<{ snap: FunctionSnapshot; span: FunctionSpan }> = [];

  for (const diagnostic of diagnostics) {
    if (!diagnostic.code?.includes('complexity')) continue;
    const match = diagnostic.message.match(COMPLEXITY_RE);
    if (!match?.groups) continue;

    const absolute = diagnostic.filename
      ? path.resolve(repoRoot, diagnostic.filename)
      : rootDir;
    const span = diagnostic.labels?.[0]?.span;
    // Oxlint labels `const fn = () => {}` as plain "function"; recover the name from the source.
    const functionName =
      parseFunctionName(match.groups.label) ??
      (span?.offset === undefined
        ? undefined
        : variableNameBefore(fs.readFileSync(absolute), span.offset));
    if (!functionName) continue;

    const relative = normalizePath(path.relative(rootDir, absolute));
    found.push({
      snap: {
        filePath: relative === '' ? path.basename(absolute) : relative,
        functionName,
        cyclomatic: Number(match.groups.score),
      },
      span: { file: absolute, offset: span?.offset ?? -1, length: span?.length ?? 0 },
    });
  }

  if (cognitiveHits) {
    const scores = assignCognitive(found.map((f) => f.span), cognitiveHits);
    found.forEach((f, i) => {
      f.snap.cognitive = scores[i] ?? 1;
    });
  }

  const snapshots = new Map<string, FunctionSnapshot>();
  for (const { snap } of found) snapshots.set(functionKey(snap.filePath, snap.functionName), snap);
  return snapshots;
}

function longestCommonDirectory(paths: string[]): string {
  if (paths.length === 0) return process.cwd();
  const split = paths.map((p) => path.resolve(p).split(path.sep));
  const first = split[0]!;
  let end = first.length - 1;
  for (let i = 1; i < split.length; i++) {
    const parts = split[i]!;
    let j = 0;
    while (j < end && j < parts.length - 1 && parts[j] === first[j]) j++;
    end = j;
  }
  return first.slice(0, end).join(path.sep) || path.sep;
}

/** Ensure the collector config exists (useful in tests). */
export function assertCollectorConfig(): void {
  if (!fs.existsSync(collectorConfigPath())) {
    throw new Error(`Missing oxlint collector config at ${collectorConfigPath()}`);
  }
}
