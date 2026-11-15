import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { collectFromDirectory, collectFromFiles } from './collect.js';
import { functionKey } from './identity.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('collectFromDirectory', () => {
  it('reads cyclomatic and cognitive scores from the base fixtures', async () => {
    const snapshots = await collectFromDirectory(
      path.join(root, 'fixtures/base'),
    );

    expect(
      snapshots.get(functionKey('payments.ts', 'processPayment'))?.cyclomatic,
    ).toBeTypeOf('number');
    expect(snapshots.get(functionKey('payments.ts', 'nested'))).toMatchObject({
      filePath: 'payments.ts',
      functionName: 'nested',
      cyclomatic: 4,
      cognitive: 6,
    });
    expect(snapshots.get(functionKey('payments.ts', 'flat'))).toMatchObject({
      filePath: 'payments.ts',
      functionName: 'flat',
      cyclomatic: 4,
      cognitive: 3,
    });
  });
});

describe('collectFromFiles cognitive matching', () => {
  it('pairs Biome scores with nested arrows and class methods', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'collect-'));
    const file = path.join(dir, 'nest.ts');
    fs.writeFileSync(
      file,
      `export function outer(xs: number[]) {
  const inner = (
    x: number,
  ) => {
    if (x > 0) { if (x > 1) { if (x > 2) return 3; } }
    return 0;
  };
  if (xs.length) { for (const x of xs) { if (inner(x)) return 1; } }
  return 0;
}
export class K { m(a: boolean, b: boolean) { if (a) { if (b) return 1; } return 0; } }
`,
    );
    const snaps = [...(await collectFromFiles([file])).values()];
    fs.rmSync(dir, { recursive: true, force: true });

    const cognitive = Object.fromEntries(snaps.map((s) => [s.functionName, s.cognitive]));
    expect(cognitive).toEqual({ outer: 6, 'outer>inner': 9, 'K.m': 3 });
  });

  it('returns an empty, complete result for a directory with no source files', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'collect-empty-'));
    const snaps = await collectFromDirectory(dir);
    fs.rmSync(dir, { recursive: true, force: true });
    expect(snaps.size).toBe(0);
    expect(snaps.problems).toEqual([]);
  });
});
