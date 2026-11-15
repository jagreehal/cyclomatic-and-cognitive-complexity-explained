import type { FunctionSnapshot, Regression } from './gate.js';
import type { Approval, Override } from './overrides.js';

/** Format regressions the way the README / CI output quotes them. */
export type ReportInput = {
  regressions: Regression[];
  untracked?: FunctionSnapshot[];
  approvals?: Approval[];
  unmatchedOverrides?: Override[];
  blockedOverrides?: Override[];
  incomplete?: string[];
};

export function formatReport({
  regressions,
  untracked = [],
  approvals = [],
  unmatchedOverrides = [],
  blockedOverrides = [],
  incomplete = [],
}: ReportInput): string {
  const lines: string[] = [];
  if (regressions.length > 0) lines.push(formatRegressions(regressions), '');
  if (blockedOverrides.length > 0) {
    lines.push(
      'New overrides need approval (--require-override-approval):',
      ...blockedOverrides.map((o) => `  ${o.filePath}:${o.line}  ${o.text}`),
      '',
    );
  }
  if (incomplete.length > 0) {
    lines.push(
      'Measurement incomplete. The gate fails until every function can be measured:',
      ...incomplete.map((p) => `  ${p}`),
      '',
    );
  }

  if (incomplete.length > 0 || regressions.length > 0 || blockedOverrides.length > 0) {
    lines.push('Quality gate failed.');
  } else {
    lines.push('No complexity regressions detected.', 'Quality gate passed.');
  }

  if (approvals.length > 0) {
    lines.push(
      '',
      'Approved by a new override. A reviewer must accept each reason:',
      ...approvals.flatMap((a) => [
        `  ${a.override.filePath}::${a.functionName} ${a.override.metric} ${a.score ?? '?'}`,
        `    line ${a.override.line}: ${a.override.text}`,
      ]),
      'Still measured: if one of these gets worse in a later PR, the gate fails.',
    );
  }
  if (unmatchedOverrides.length > 0) {
    lines.push(
      '',
      'Warning: new overrides that sit on no single function (file-wide or misplaced). The gate ignores them:',
      ...unmatchedOverrides.map((o) => `  ${o.filePath}:${o.line}  ${o.text}`),
    );
  }
  if (untracked.length > 0) {
    lines.push(
      '',
      'Warning: over a threshold on base, missing on head (deleted, renamed or moved):',
      ...untracked.map(
        (s) =>
          `  ${s.filePath}::${s.functionName} (was cyclomatic ${s.cyclomatic}${s.cognitive === undefined ? '' : `, cognitive ${s.cognitive}`})`,
      ),
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
  return lines.join('\n').trimEnd();
}

function formatMetric(reg: Regression): string {
  if (reg.kind === 'new') {
    return `${reg.metric}: ${reg.current} (maximum for new code: ${reg.threshold})`;
  }
  const delta = reg.current - (reg.previous ?? 0);
  return `${reg.metric}: ${reg.previous} → ${reg.current} (+${delta})`;
}
