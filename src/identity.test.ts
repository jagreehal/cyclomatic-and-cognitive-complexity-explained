import { describe, expect, it } from 'vitest';
import {
  functionKey,
  normalizePath,
  parseFunctionName,
} from './identity.js';

describe('identity', () => {
  it('builds a stable file::name key', () => {
    expect(functionKey('src\\payments\\a.ts', 'processPayment')).toBe(
      'src/payments/a.ts::processPayment',
    );
  });

  it('normalizes windows separators', () => {
    expect(normalizePath('a\\b\\c.ts')).toBe('a/b/c.ts');
  });

  it('parses Oxlint and ESLint function labels', () => {
    expect(parseFunctionName('function `processPayment`')).toBe(
      'processPayment',
    );
    expect(parseFunctionName('method `quote`')).toBe('quote');
    expect(parseFunctionName("Function 'processPayment'")).toBe(
      'processPayment',
    );
    expect(parseFunctionName('Arrow function')).toBeUndefined();
  });
});
