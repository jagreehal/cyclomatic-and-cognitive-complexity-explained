/**
 * The AutoRatchet CLI from node_modules, as functions: `measure` for every function's scores,
 * `compare` for a ratchet verdict with its JSON and text reports.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bin = path.join(root, 'node_modules', '.bin', 'autoratchet');

export type Snapshot = {
  filePath: string;
  functionName: string;
  cyclomatic: number;
  cognitive: number;
  line: number;
};

export type Regression = {
  filePath: string;
  functionName: string;
  metric: 'cyclomatic' | 'cognitive';
  previous?: number;
  current: number;
  kind: 'worsened' | 'new';
};

export type Comparison = {
  verdict: 'pass' | 'fail' | 'incomplete';
  regressions: Regression[];
  report: string;
};

function run(args: string[]): string {
  const result = spawnSync(bin, args, { encoding: 'utf8', maxBuffer: 1 << 30 });
  // 0 pass, 1 regression, 3 incomplete: all print a report. 2 and 4 mean the command failed.
  if (result.status !== 0 && result.status !== 1 && result.status !== 3) {
    throw new Error(`autoratchet ${args.join(' ')} exited ${result.status}:\n${result.stderr}`);
  }
  return result.stdout;
}

export function measure(dir: string): Snapshot[] {
  return (JSON.parse(run(['measure', dir])) as { functions: Snapshot[] }).functions;
}

export function compare(base: string, head: string): Comparison {
  const json = JSON.parse(run(['compare', '--base', base, '--head', head, '--format', 'json']));
  const report = run(['compare', '--base', base, '--head', head]).trimEnd();
  return { verdict: json.verdict, regressions: json.regressions, report };
}
