import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import type { FunctionSnapshot } from './gate.js';
import { functionKey, normalizePath } from './identity.js';
import { analyseFile } from './functions.js';
import { sourceFiles } from './overrides.js';

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

/** Collect cyclomatic and cognitive scores for every function under a directory. */
export async function collectFromDirectory(directory: string): Promise<Snapshots> {
  const absDir = path.resolve(directory);
  return collectFrom(absDir, sourceFiles(absDir));
}

export async function collectFromFiles(filePaths: string[]): Promise<Snapshots> {
  const absPaths = filePaths.map((p) => path.resolve(p));
  return collectFrom(longestCommonDirectory(absPaths), absPaths);
}

/**
 * Turn every disable/ignore directive into an ordinary comment of the same length,
 * so offsets stay put and no override can hide a function from measurement.
 * Overrides decide what the gate enforces (see compare.ts), never what it measures.
 */
export function defuseDirectives(source: string): string {
  return source
    .replace(/\b(oxlint|eslint)-disable/g, '$1_disable')
    .replace(/\bbiome-ignore/g, 'biome_ignore');
}

async function collectFrom(root: string, files: string[]): Promise<Snapshots> {
  functionsByFile.clear();
  // Nothing to measure (a base with no copy of a brand-new file): an empty, complete result.
  if (files.length === 0) return new Snapshots();
  const copy = fs.mkdtempSync(path.join(os.tmpdir(), 'complexity-ratchet-'));
  try {
    const copies: string[] = [];
    for (const file of files) {
      const dest = path.join(copy, path.relative(root, file));
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, defuseDirectives(fs.readFileSync(file, 'utf8')));
      copies.push(dest);
    }
    const snapshots = snapshotsFromDiagnostics(runOxlint([copy]), copy, runBiomeCognitive([copy]));
    for (const file of copies) {
      const { errors } = parsed(file);
      if (errors.length > 0) {
        snapshots.problems.push(`${normalizePath(path.relative(copy, file))}: does not parse (${errors[0]})`);
      }
    }
    return snapshots;
  } finally {
    fs.rmSync(copy, { recursive: true, force: true });
  }
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
 * `scores` has one entry per span: the score, or undefined (Biome scored it 0 or 1).
 * `unmatched` lists Biome scores that fit no function: a measurement problem.
 */
export function assignCognitive(
  spans: FunctionSpan[],
  hits: CognitiveHit[],
): { scores: Array<number | undefined>; unmatched: CognitiveHit[] } {
  const unmatched: CognitiveHit[] = [];
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
    else unmatched.push(hit);
  }
  return { scores, unmatched };
}

function collectorConfigPath(): string {
  return path.join(repoRoot, 'config/oxlint-cyclomatic.json');
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

type ParsedFile = { bytes: Buffer; byStart: Map<number, string>; errors: string[] };
const functionsByFile = new Map<string, ParsedFile>();

function parsed(absoluteFile: string): ParsedFile {
  let entry = functionsByFile.get(absoluteFile);
  if (!entry) {
    const bytes = fs.readFileSync(absoluteFile);
    const { functions, errors } = analyseFile(absoluteFile, bytes.toString('utf8'));
    entry = { bytes, byStart: new Map(functions.map((f) => [f.start, f.name])), errors };
    functionsByFile.set(absoluteFile, entry);
  }
  return entry;
}

/** Qualified name of the function Oxlint reports at this UTF-8 byte offset. */
export function functionNameAt(absoluteFile: string, byteOffset: number): string | undefined {
  const entry = parsed(absoluteFile);
  // The parser counts UTF-16 code units; Oxlint counts bytes.
  const charOffset = entry.bytes.subarray(0, byteOffset).toString('utf8').length;
  return entry.byStart.get(charOffset);
}

/**
 * Scores for every function, plus anything that could not be measured.
 * A gate must treat a non-empty `problems` list as a failure: an unmeasured
 * function is not evidence that the function is fine.
 */
export class Snapshots extends Map<string, FunctionSnapshot> {
  problems: string[] = [];
}

type Scored = { snap: FunctionSnapshot; span: FunctionSpan };

/** One Oxlint diagnostic: a scored function, a measurement problem, or nothing to measure. */
function readDiagnostic(
  diagnostic: OxlintDiagnostic,
  rootDir: string,
): Scored | { problem: string } | undefined {
  const match = diagnostic.code?.includes('complexity') ? diagnostic.message.match(COMPLEXITY_RE) : null;
  if (!match?.groups) return undefined;

  const absolute = diagnostic.filename ? path.resolve(repoRoot, diagnostic.filename) : rootDir;
  const span = diagnostic.labels?.[0]?.span;
  const filePath = relativeTo(rootDir, absolute);
  // Oxlint names some functions (`method \`quote\``) and not others (arrows, callbacks).
  // The parser names all of them, qualified by class, object or enclosing function.
  const functionName = span?.offset === undefined ? undefined : functionNameAt(absolute, span.offset);
  if (functionName) {
    return {
      snap: { filePath, functionName, cyclomatic: Number(match.groups.score), line: span?.line },
      span: { file: absolute, offset: span?.offset ?? -1, length: span?.length ?? 0 },
    };
  }
  // Oxlint also scores class field initialisers that are not functions (`x = a ? 1 : 2`): those
  // belong to no function. A file that does not parse is reported once, by collectFrom.
  if (match.groups.label.startsWith('class field initializer') || parsed(absolute).errors.length > 0) {
    return undefined;
  }
  return { problem: `${filePath}:${span?.line ?? '?'}: Oxlint scored ${match.groups.label} but no function was found there` };
}

function relativeTo(rootDir: string, absolute: string): string {
  const relative = normalizePath(path.relative(rootDir, absolute));
  return relative === '' ? path.basename(absolute) : relative;
}

export function snapshotsFromDiagnostics(
  diagnostics: OxlintDiagnostic[],
  rootDir: string,
  cognitiveHits?: CognitiveHit[],
): Snapshots {
  const snapshots = new Snapshots();
  const found: Scored[] = [];
  const seen = new Set<string>();

  for (const diagnostic of diagnostics) {
    const read = readDiagnostic(diagnostic, rootDir);
    if (!read) continue;
    if ('problem' in read) {
      snapshots.problems.push(read.problem);
      continue;
    }
    // Oxlint reports a class field arrow twice (as the field and as the method): keep one.
    const at = `${read.span.file}:${read.span.offset}`;
    if (seen.has(at)) continue;
    seen.add(at);
    found.push(read);
  }

  if (cognitiveHits) {
    const { scores, unmatched } = assignCognitive(found.map((f) => f.span), cognitiveHits);
    found.forEach((f, i) => {
      f.snap.cognitive = scores[i] ?? 1;
    });
    for (const hit of unmatched) {
      snapshots.problems.push(
        `${relativeTo(rootDir, hit.file)}:${hit.line}: Biome scored cognitive ${hit.score} for a function the collector could not find`,
      );
    }
  }

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
