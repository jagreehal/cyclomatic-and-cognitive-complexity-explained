import { describe, expect, it } from 'vitest';
import { analyseFile, namedFunctions } from './functions.js';

const names = (source: string) => namedFunctions('x.ts', source).map((f) => f.name);

describe('namedFunctions', () => {
  it('qualifies methods by class, so same-named methods do not collide', () => {
    expect(
      names(`
        class PaymentService { validate(a) { return a; } handle = (x) => x; }
        class CustomerService { validate(a) { return a; } }
      `),
    ).toEqual(['PaymentService.validate', 'PaymentService.handle', 'CustomerService.validate']);
  });

  it('names arrows from their variable and nested functions from their parent', () => {
    expect(
      names(`
        export const applyDiscount = async (a) => a;
        function outer() { const helper = () => 1; function inner() {} }
        function other() { const helper = () => 2; }
      `),
    ).toEqual(['applyDiscount', 'outer', 'outer>helper', 'outer>inner', 'other', 'other>helper']);
  });

  it('names callbacks by the call they are passed to, numbering repeats', () => {
    expect(
      names(`
        function render(items) { return items.map((i) => i).filter((i) => i > 0); }
        items.forEach(() => {}); items.forEach(() => {});
      `),
        ).toEqual([
      'render',
      'render>items.map()',
      'render>items.map().filter()',
      'items.forEach()',
      'items.forEach()#2',
    ]);
  });

  it('names object methods, array entries and default exports', () => {
    expect(
      names(`
        export const handlers = { onSubmit(e) {}, nested: { deep: () => 1 } };
        const RULES = [['a', (p) => p.x], ['b', (p) => p.y]];
        const PLAIN = [(p) => 1, (p) => 2];
        const BY_ID = [{ id: 'gold', test: (c) => c > 9 }];
        export default function () {}
      `),
    ).toEqual([
      'handlers.onSubmit',
      'handlers.nested.deep',
      'RULES["a"]',
      'RULES["b"]',
      'PLAIN[0]',
      'PLAIN[1]',
      'BY_ID["gold"].test',
      'default',
    ]);
  });

  it('keeps a keyed rule\'s name when the table is reordered', () => {
    const before = names(`const R = [['a', (p) => p.x], ['b', (p) => p.y > 1 ? 1 : 0]];`);
    const after = names(`const R = [['new', (p) => 0], ['b', (p) => p.y > 1 ? 1 : 0], ['a', (p) => p.x]];`);
    expect(before).toEqual(['R["a"]', 'R["b"]']);
    expect(after).toEqual(['R["new"]', 'R["b"]', 'R["a"]']);
  });

  it('reports parse errors instead of guessing', () => {
    const result = analyseFile('x.ts', 'function (');
    expect(result.functions).toEqual([]);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
