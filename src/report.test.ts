import { describe, expect, it } from 'vitest';
import type { Regression } from './gate';
import { formatReport } from './report';

describe('formatReport', () => {
  it('formats the passing message', () => {
    expect(formatReport([])).toBe(
      'No complexity regressions detected.\nQuality gate passed.',
    );
  });

  it('warns about hot functions that stopped being measured, without failing', () => {
    const report = formatReport(
      [],
      [{ filePath: 'checkout.ts', functionName: 'applyDiscount', cyclomatic: 16 }],
    );
    expect(report).toContain('Quality gate passed.');
    expect(report).toContain('checkout.ts::applyDiscount (was cyclomatic 16)');
  });

  it('lists new overrides with their location and reason', () => {
    const report = formatReport([], [], [
      { filePath: 'charts.ts', line: 20, text: '// oxlint-disable-next-line complexity -- options bag' },
    ]);
    expect(report).toContain('Quality gate passed.');
    expect(report).toContain('charts.ts:20  // oxlint-disable-next-line complexity -- options bag');
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

    expect(formatReport(regressions)).toBe(
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
