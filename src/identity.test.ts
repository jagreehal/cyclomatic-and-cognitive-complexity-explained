import { describe, expect, it } from 'vitest';
import {
  functionKey,
  normalizePath,
  parseFunctionName,
  variableNameBefore,
} from './identity';

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

  it('names arrow functions and function expressions from their variable', () => {
    const at = (src: string, marker: string) => {
      const bytes = Buffer.from(src);
      return variableNameBefore(bytes, bytes.indexOf(marker));
    };
    expect(at('export const applyDiscount = (a) => a;', '(a)')).toBe('applyDiscount');
    expect(at('const f: Handler = async (a) => a;', 'async')).toBe('f');
    expect(at('let g = function () {};', 'function')).toBe('g');
    expect(at('// £ é\nconst h = () => 1;', '()')).toBe('h');
    expect(at('items.map((a) => a);', '(a)')).toBeUndefined();
  });
});
