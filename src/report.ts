import type { FunctionSnapshot, Regression } from './gate';
import type { Override } from './overrides';

/** Format regressions the way the README / CI output quotes them. */
export function formatReport(
  regressions: Regression[],
  untracked: FunctionSnapshot[] = [],
  overrides: Override[] = [],
): string {
  const lines = [
    regressions.length === 0
      ? 'No complexity regressions detected.\nQuality gate passed.'
      : formatRegressions(regressions),
  ];
  if (untracked.length > 0) {
    lines.push(
      '',
      'Warning: over the threshold on base, no longer measured on head:',
      ...untracked.map(
        (s) =>
          `  ${s.filePath}::${s.functionName} (was cyclomatic ${s.cyclomatic}${s.cognitive === undefined ? '' : `, cognitive ${s.cognitive}`})`,
      ),
      'Deleted or renamed is fine. A new disable comment needs a reviewer.',
    );
  }
  if (overrides.length > 0) {
    lines.push(
      '',
      'Warning: new complexity overrides. The overridden rule stops measuring these functions:',
      ...overrides.map((o) => `  ${o.filePath}:${o.line}  ${o.text}`),
      'Check each reason. "Legacy" or "will fix later" is not one.',
    );
  }
  return lines.join('\n');
}

function formatRegressions(regressions: Regression[]): string {
  // file → function → that function's failing metrics, in first-seen order
  const byFile = new Map<string, Map<string, Regression[]>>();
  const sorted = [...regressions].sort((a, b) => a.filePath.localeCompare(b.filePath));
  for (const reg of sorted) {
    const fns = byFile.get(reg.filePath) ?? new Map<string, Regression[]>();
    fns.set(reg.functionName, [...(fns.get(reg.functionName) ?? []), reg]);
    byFile.set(reg.filePath, fns);
  }

  const lines: string[] = ['Complexity regressions detected:', ''];
  for (const [filePath, fns] of byFile) {
    lines.push(filePath);
    for (const [functionName, regs] of fns) {
      lines.push(`  ${functionName}${regs[0]!.kind === 'new' ? ' (new function)' : ''}`);
      for (const reg of regs) lines.push(`    ${formatMetric(reg)}`);
    }
    lines.push('');
  }
  lines.push('Quality gate failed.');
  return lines.join('\n');
}

function formatMetric(reg: Regression): string {
  if (reg.kind === 'new') {
    return `${reg.metric}: ${reg.current} (maximum for new code: ${reg.threshold})`;
  }
  const delta = reg.current - (reg.previous ?? 0);
  return `${reg.metric}: ${reg.previous} → ${reg.current} (+${delta})`;
}
