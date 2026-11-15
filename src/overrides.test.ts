import { describe, expect, it } from 'vitest';
import { newOverrides, OVERRIDE_RE, type Override } from './overrides';

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
  });

  it('ignores overrides that only moved, reports added ones', () => {
    expect(newOverrides([o('a.ts', 3)], [o('a.ts', 9)])).toEqual([]);
    expect(newOverrides([o('a.ts', 3)], [o('a.ts', 3), o('a.ts', 20)])).toEqual([o('a.ts', 20)]);
    expect(newOverrides([], [o('b.ts', 1)])).toEqual([o('b.ts', 1)]);
  });
});
