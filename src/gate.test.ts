import { describe, expect, it } from 'vitest';
import {
  findRegressions,
  findUntracked,
  passesComplexityGate,
  type FunctionSnapshot,
} from './gate.js';
import { functionKey } from './identity.js';

describe('passesComplexityGate', () => {
  it('allows new functions up to the threshold', () => {
    expect(passesComplexityGate(undefined, 10, 10)).toBe(true);
    expect(passesComplexityGate(undefined, 11, 10)).toBe(false);
  });

  it('allows existing hot functions to improve or stay flat', () => {
    expect(passesComplexityGate(24, 20, 10)).toBe(true);
    expect(passesComplexityGate(24, 24, 10)).toBe(true);
  });

  it('rejects existing hot functions that get worse', () => {
    expect(passesComplexityGate(15, 17, 10)).toBe(false);
  });

  it('allows cold functions to rise up to the threshold', () => {
    expect(passesComplexityGate(4, 8, 10)).toBe(true);
    expect(passesComplexityGate(4, 11, 10)).toBe(false);
  });
});

describe('findRegressions with cognitive scores', () => {
  const snap = (cyclomatic: number, cognitive?: number): Map<string, FunctionSnapshot> =>
    new Map([[functionKey('a.ts', 'f'), { filePath: 'a.ts', functionName: 'f', cyclomatic, cognitive }]]);

  it('fails on cognitive alone when nesting grows and paths do not', () => {
    const regressions = findRegressions(snap(6, 5), snap(6, 19));
    expect(regressions).toEqual([
      expect.objectContaining({ metric: 'cognitive', previous: 5, current: 19, threshold: 15 }),
    ]);
  });

  it('applies the same ratchet rules to cognitive', () => {
    expect(findRegressions(snap(4, 20), snap(4, 20))).toEqual([]); // hot, unchanged
    expect(findRegressions(snap(4, 2), snap(4, 15))).toEqual([]); // cold, rose to the limit
    expect(findRegressions(snap(4), snap(4, 30))).toEqual([]); // base predates cognitive: nothing to compare
    expect(findRegressions(new Map(), snap(4, 16))).toEqual([
      expect.objectContaining({ metric: 'cognitive', kind: 'new', current: 16 }),
    ]);
  });
});

describe('findRegressions with approvals', () => {
  it('skips only the approved function and metric', () => {
    const head = new Map([
      [functionKey('a.ts', 'f'), { filePath: 'a.ts', functionName: 'f', cyclomatic: 12, cognitive: 20 }],
    ]);
    const approved = new Set([`${functionKey('a.ts', 'f')}\0cyclomatic`]);
    expect(findRegressions(new Map(), head, {}, approved)).toEqual([
      expect.objectContaining({ metric: 'cognitive', current: 20 }),
    ]);
  });
});

describe('findUntracked', () => {
  it('lists base functions over the threshold that head no longer reports', () => {
    const snap = (functionName: string, cyclomatic: number): [string, FunctionSnapshot] => [
      functionKey('a.ts', functionName),
      { filePath: 'a.ts', functionName, cyclomatic },
    ];
    const previous = new Map([snap('hot', 16), snap('cold', 4), snap('kept', 12)]);
    const current = new Map([snap('kept', 12)]);
    expect(findUntracked(previous, current).map((s) => s.functionName)).toEqual(['hot']);
  });
});

describe('findRegressions', () => {
  it('reports cyclomatic failures for worsened and new functions', () => {
    const previous = new Map<string, FunctionSnapshot>([
      [
        functionKey('payments.ts', 'processPayment'),
        {
          filePath: 'payments.ts',
          functionName: 'processPayment',
          cyclomatic: 19,
        },
      ],
    ]);
    const current = new Map<string, FunctionSnapshot>([
      [
        functionKey('payments.ts', 'processPayment'),
        {
          filePath: 'payments.ts',
          functionName: 'processPayment',
          cyclomatic: 24,
        },
      ],
      [
        functionKey('refunds.ts', 'createRefund'),
        {
          filePath: 'refunds.ts',
          functionName: 'createRefund',
          cyclomatic: 14,
        },
      ],
    ]);

    const regressions = findRegressions(previous, current);
    expect(regressions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          functionName: 'processPayment',
          previous: 19,
          current: 24,
          kind: 'worsened',
        }),
        expect.objectContaining({
          functionName: 'createRefund',
          kind: 'new',
          current: 14,
        }),
      ]),
    );
  });
});
