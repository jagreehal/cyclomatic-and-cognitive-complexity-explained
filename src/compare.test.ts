import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import { comparePaths, verdict } from './compare.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('comparePaths', () => {
  it('fails head-fail against base', async () => {
    const result = await comparePaths(
      path.join(root, 'fixtures/base'),
      path.join(root, 'fixtures/head-fail'),
    );
    expect(result.regressions.length).toBeGreaterThan(0);
    expect(result.regressions.map((r) => r.functionName)).toEqual(
      expect.arrayContaining(['processPayment', 'validateCustomer', 'createRefund']),
    );
  });

  it('passes head-pass against base', async () => {
    const result = await comparePaths(
      path.join(root, 'fixtures/base'),
      path.join(root, 'fixtures/head-pass'),
    );
    expect(result.regressions).toEqual([]);
  });

  it('fails closed when a head file does not parse', async () => {
    const head = fs.mkdtempSync(path.join(os.tmpdir(), 'compare-'));
    fs.copyFileSync(path.join(root, 'fixtures/base/payments.ts'), path.join(head, 'payments.ts'));
    fs.writeFileSync(path.join(head, 'broken.ts'), 'export function broken( {');
    const result = await comparePaths(path.join(root, 'fixtures/base'), head);
    fs.rmSync(head, { recursive: true, force: true });

    expect(result.regressions).toEqual([]);
    expect(result.incomplete).toEqual([expect.stringMatching(/^head: broken\.ts: does not parse/)]);
    expect(verdict(result)).toBe('incomplete');
  });

  it('turns a new override into a failure with requireOverrideApproval', async () => {
    const dir = path.join(root, 'examples/20-ratchet-override');
    const lenient = await comparePaths(path.join(dir, 'base'), path.join(dir, 'head'));
    const strict = await comparePaths(path.join(dir, 'base'), path.join(dir, 'head'), {
      requireOverrideApproval: true,
    });
    expect(verdict(lenient)).toBe('pass');
    expect(verdict(strict)).toBe('fail');
    expect(strict.approvals).toEqual([]);
    expect(strict.blockedOverrides.map((o) => o.line)).toEqual([20]);
    // Without the approval, the score itself fails too.
    expect(strict.regressions.map((r) => r.functionName)).toEqual(['createChart']);
  });
});
