import fs from 'node:fs/promises';
import path from 'node:path';
import { collectFromDirectory, Snapshots } from './collect.js';
import {
  findRegressions,
  findUntracked,
  type FunctionSnapshot,
  type GateOptions,
  type Regression,
} from './gate.js';
import { functionKey } from './identity.js';
import {
  approvalKey,
  findOverrides,
  matchOverrides,
  newOverrides,
  type Approval,
  type Override,
} from './overrides.js';

export type CompareResult = {
  previous: Map<string, FunctionSnapshot>;
  current: Map<string, FunctionSnapshot>;
  regressions: Regression[];
  untracked: FunctionSnapshot[];
  /** New overrides on a function: each approves one metric's current score, once. Directories only. */
  approvals: Approval[];
  /** New overrides on no single function (file-wide or misplaced). The gate ignores them. */
  unmatchedOverrides: Override[];
  /** With requireOverrideApproval: every new override, each one a gate failure. */
  blockedOverrides: Override[];
  /** Anything either side could not measure. Non-empty means the gate fails. */
  incomplete: string[];
};

/** The three outcomes: measured and clean, measured with failures, or not fully measured. */
export function verdict(result: CompareResult): 'pass' | 'fail' | 'incomplete' {
  if (result.incomplete.length > 0) return 'incomplete';
  if (result.regressions.length > 0 || result.blockedOverrides.length > 0) return 'fail';
  return 'pass';
}

export async function comparePaths(
  basePath: string,
  headPath: string,
  options: GateOptions = {},
): Promise<CompareResult> {
  const previous = await loadSnapshotSource(basePath);
  const current = await loadSnapshotSource(headPath);
  const bothDirs =
    (await fs.stat(path.resolve(basePath))).isDirectory() &&
    (await fs.stat(path.resolve(headPath))).isDirectory();
  const added = bothDirs
    ? newOverrides(findOverrides(path.resolve(basePath)), findOverrides(path.resolve(headPath)))
    : [];
  const strict = options.requireOverrideApproval === true;
  const matched = matchOverrides(added, current);
  const approvals = strict ? [] : matched.approvals;
  const approved = new Set(
    approvals.map((a) => approvalKey(a.override.filePath, a.functionName, a.override.metric)),
  );
  const regressions = findRegressions(previous, current, options, approved);
  const untracked = findUntracked(previous, current, options);
  const problems = (side: string, snaps: Map<string, FunctionSnapshot>) =>
    snaps instanceof Snapshots ? snaps.problems.map((p) => `${side}: ${p}`) : [];
  return {
    previous,
    current,
    regressions,
    untracked,
    approvals,
    unmatchedOverrides: strict ? [] : matched.unmatched,
    blockedOverrides: strict ? added : [],
    incomplete: [...problems('base', previous), ...problems('head', current)],
  };
}

async function loadSnapshotSource(
  target: string,
): Promise<Map<string, FunctionSnapshot>> {
  const abs = path.resolve(target);
  const stat = await fs.stat(abs);
  if (stat.isDirectory()) {
    return collectFromDirectory(abs);
  }
  if (abs.endsWith('.json')) {
    return loadJsonSnapshots(abs);
  }
  throw new Error(
    `Expected a directory of sources or a .json snapshot file, got: ${target}`,
  );
}

async function loadJsonSnapshots(
  filePath: string,
): Promise<Map<string, FunctionSnapshot>> {
  const raw = JSON.parse(await fs.readFile(filePath, 'utf8')) as FunctionSnapshot[];
  const map = new Map<string, FunctionSnapshot>();
  for (const snap of raw) {
    map.set(functionKey(snap.filePath, snap.functionName), snap);
  }
  return map;
}
