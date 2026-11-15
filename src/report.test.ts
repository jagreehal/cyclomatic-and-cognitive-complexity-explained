import { describe, expect, it } from 'vitest';
import type { Regression } from './gate.js';
import { formatReport } from './report.js';

describe('formatReport', () => {
  it('formats the passing message', () => {
    expect(formatReport({ regressions: [] })).toBe(
      'No complexity regressions detected.\nQuality gate passed.',
    );
  });

  it('warns about hot functions that stopped being measured, without failing', () => {
    const report = formatReport({
      regressions: [],
      untracked: [{ filePath: 'checkout.ts', functionName: 'applyDiscount', cyclomatic: 16 }],
    });
    expect(report).toContain('Quality gate passed.');
    expect(report).toContain('checkout.ts::applyDiscount (was cyclomatic 16)');
    expect(report).toContain('deleted, renamed or moved');
  });

  it('lists approvals with the function, metric, score and reason', () => {
    const override = {
      filePath: 'charts.ts',
      line: 20,
      text: '// oxlint-disable-next-line complexity -- options bag',
      metric: 'cyclomatic' as const,
    };
    const report = formatReport({
      regressions: [],
      approvals: [{ override, functionName: 'createChart', score: 12 }],
      unmatchedOverrides: [{ ...override, line: 1, text: '/* oxlint-disable complexity */' }],
    });
    expect(report).toContain('Quality gate passed.');
    expect(report).toContain('  charts.ts::createChart cyclomatic 12\n    line 20: // oxlint-disable-next-line complexity -- options bag');
    expect(report).toContain('charts.ts:1  /* oxlint-disable complexity */');
  });

  it('fails on incomplete measurement even with no regressions', () => {
    const report = formatReport({ regressions: [], incomplete: ['head: a.ts: does not parse (Unexpected token)'] });
    expect(report).toContain('Measurement incomplete.');
    expect(report).toContain('  head: a.ts: does not parse (Unexpected token)');
    expect(report).toContain('Quality gate failed.');
    expect(report).not.toContain('passed');
  });

  it('fails on blocked overrides in strict mode', () => {
    const report = formatReport({
      regressions: [],
      blockedOverrides: [{ filePath: 'a.ts', line: 3, text: '// eslint-disable-next-line complexity', metric: 'cyclomatic' }],
    });
    expect(report).toContain('New overrides need approval (--require-override-approval):\n  a.ts:3  // eslint-disable-next-line complexity');
    expect(report).toContain('Quality gate failed.');
  });

  it('groups failing metrics under each function', () => {
    const base = { filePath: 'payments.ts', functionName: 'processPayment', kind: 'worsened' } as const;
    const regressions: Regression[] = [
      { ...base, metric: 'cyclomatic', previous: 19, current: 24, threshold: 10 },
      { ...base, metric: 'cognitive', previous: 28, current: 38, threshold: 15 },
      {
        filePath: 'refunds.ts',
        functionName: 'createRefund',
        metric: 'cyclomatic',
        previous: undefined,
        current: 14,
        threshold: 10,
        kind: 'new',
      },
    ];

    expect(formatReport({ regressions })).toBe(
      [
        'Complexity regressions detected:',
        '',
        'payments.ts',
        '  processPayment',
        '    cyclomatic: 19 → 24 (+5)',
        '    cognitive: 28 → 38 (+10)',
        '',
        'refunds.ts',
        '  createRefund (new function)',
        '    cyclomatic: 14 (maximum for new code: 10)',
        '',
        'Quality gate failed.',
      ].join('\n'),
    );
  });
});
