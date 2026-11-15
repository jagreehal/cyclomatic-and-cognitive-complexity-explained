import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { comparePaths } from './compare';

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
});
