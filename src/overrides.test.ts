import { describe, expect, it } from 'vitest';
import { matchOverrides, newOverrides, OVERRIDE_RE, type Override } from './overrides.js';

describe('OVERRIDE_RE', () => {
  it('matches complexity overrides from all three tools', () => {
    expect(OVERRIDE_RE.test('// oxlint-disable-next-line complexity -- options bag')).toBe(true);
    expect(OVERRIDE_RE.test('// eslint-disable-next-line complexity')).toBe(true);
    expect(OVERRIDE_RE.test('/* oxlint-disable complexity */')).toBe(true);
    expect(
      OVERRIDE_RE.test('// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: legacy'),
    ).toBe(true);
  });

  it('ignores other disable comments', () => {
    expect(OVERRIDE_RE.test('// oxlint-disable-next-line no-console')).toBe(false);
    expect(OVERRIDE_RE.test('// biome-ignore lint/complexity/noForEach: fine')).toBe(false);
  });
});

describe('newOverrides', () => {
  const o = (filePath: string, line: number, text = '// eslint-disable-next-line complexity'): Override => ({
    filePath,
    line,
    text,
    metric: 'cyclomatic',
  });

  it('ignores overrides that only moved, reports added ones', () => {
    expect(newOverrides([o('a.ts', 3)], [o('a.ts', 9)])).toEqual([]);
    expect(newOverrides([o('a.ts', 3)], [o('a.ts', 3), o('a.ts', 20)])).toEqual([o('a.ts', 20)]);
    expect(newOverrides([], [o('b.ts', 1)])).toEqual([o('b.ts', 1)]);
  });
});

describe('matchOverrides', () => {
  it('approves the function on the next line for the override\'s metric, and leaves file-wide ones unmatched', () => {
    const current = new Map([
      ['a.ts::createChart', { filePath: 'a.ts', functionName: 'createChart', cyclomatic: 12, cognitive: 1, line: 5 }],
    ]);
    const next: Override = { filePath: 'a.ts', line: 4, text: '// oxlint-disable-next-line complexity', metric: 'cyclomatic' };
    // Even directly above the function, a file-wide disable approves nothing.
    const fileWide: Override = { filePath: 'a.ts', line: 4, text: '/* oxlint-disable complexity */', metric: 'cyclomatic' };
    expect(matchOverrides([next, fileWide], current)).toEqual({
      approvals: [{ override: next, functionName: 'createChart', score: 12 }],
      unmatched: [fileWide],
    });
  });
});
