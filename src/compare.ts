import fs from 'node:fs/promises';
import path from 'node:path';
import { collectFromDirectory } from './collect';
import {
  findRegressions,
  findUntracked,
  type FunctionSnapshot,
  type GateOptions,
  type Regression,
} from './gate';
import { functionKey } from './identity';
import { findOverrides, newOverrides, type Override } from './overrides';

export type CompareResult = {
  previous: Map<string, FunctionSnapshot>;
  current: Map<string, FunctionSnapshot>;
  regressions: Regression[];
  untracked: FunctionSnapshot[];
  /** Complexity overrides added on head. Only computed when both sides are directories. */
  overrides: Override[];
};

export async function comparePaths(
  basePath: string,
  headPath: string,
  options: GateOptions = {},
): Promise<CompareResult> {
  const previous = await loadSnapshotSource(basePath);
  const current = await loadSnapshotSource(headPath);
  const regressions = findRegressions(previous, current, options);
  const untracked = findUntracked(previous, current, options);
  const bothDirs = (await fs.stat(path.resolve(basePath))).isDirectory() &&
    (await fs.stat(path.resolve(headPath))).isDirectory();
  const overrides = bothDirs
    ? newOverrides(findOverrides(path.resolve(basePath)), findOverrides(path.resolve(headPath)))
    : [];
  return { previous, current, regressions, untracked, overrides };
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
