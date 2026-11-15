import { functionKey } from './identity.js';

export const DEFAULT_CYCLOMATIC_THRESHOLD = 10;
export const DEFAULT_COGNITIVE_THRESHOLD = 15;

export type Metric = 'cyclomatic' | 'cognitive';
export const METRICS: readonly Metric[] = ['cyclomatic', 'cognitive'];

/**
 * A function passes when its score does not exceed the higher of
 * its previous score and the threshold. New functions use previous=undefined,
 * so they must be ≤ threshold.
 */
export function passesComplexityGate(
  previous: number | undefined,
  current: number,
  threshold: number,
): boolean {
  return current <= Math.max(previous ?? 0, threshold);
}

export type FunctionSnapshot = {
  filePath: string;
  functionName: string;
  cyclomatic: number;
  /** Biome cognitive complexity. Absent in JSON snapshots that predate it: not gated. */
  cognitive?: number;
  /** Line Oxlint reports the function on. Used to match override comments to functions. */
  line?: number;
};

export type Regression = {
  filePath: string;
  functionName: string;
  metric: Metric;
  previous: number | undefined;
  current: number;
  threshold: number;
  kind: 'worsened' | 'new';
};

export type GateOptions = {
  cyclomaticThreshold?: number;
  cognitiveThreshold?: number;
  /**
   * Strict mode: a new override approves nothing and fails the gate instead.
   * Use it where approval has to come from somewhere an author cannot grant
   * themselves, such as a protected PR label (README, Part 6).
   */
  requireOverrideApproval?: boolean;
};

export function thresholds(options: GateOptions = {}): Record<Metric, number> {
  return {
    cyclomatic: options.cyclomaticThreshold ?? DEFAULT_CYCLOMATIC_THRESHOLD,
    cognitive: options.cognitiveThreshold ?? DEFAULT_COGNITIVE_THRESHOLD,
  };
}

/**
 * @param approved `functionKey\0metric` entries a new override approved on this PR.
 *   Those skip the gate once. Measurement continues, so the next PR that makes
 *   the function worse fails like any other.
 */
export function findRegressions(
  previous: Map<string, FunctionSnapshot>,
  current: Map<string, FunctionSnapshot>,
  options: GateOptions = {},
  approved: ReadonlySet<string> = new Set(),
): Regression[] {
  const limits = thresholds(options);
  const regressions: Regression[] = [];

  for (const [key, head] of current) {
    const base = previous.get(key) ?? previous.get(functionKey(head.filePath, head.functionName));
    const kind = base ? 'worsened' : 'new';

    for (const metric of METRICS) {
      const now = head[metric];
      // A base snapshot without this metric (older JSON) gives nothing to compare against.
      if (now === undefined || (base && base[metric] === undefined)) continue;
      if (approved.has(`${functionKey(head.filePath, head.functionName)}\0${metric}`)) continue;
      if (passesComplexityGate(base?.[metric], now, limits[metric])) continue;
      regressions.push({
        filePath: head.filePath,
        functionName: head.functionName,
        metric,
        previous: base?.[metric],
        current: now,
        threshold: limits[metric],
        kind,
      });
    }
  }

  return regressions;
}

/**
 * Functions over either threshold on base that head no longer reports.
 * Deleted or renamed is fine. A new disable comment is the case a reviewer must see.
 */
export function findUntracked(
  previous: Map<string, FunctionSnapshot>,
  current: Map<string, FunctionSnapshot>,
  options: GateOptions = {},
): FunctionSnapshot[] {
  const limits = thresholds(options);
  const hot = (s: FunctionSnapshot) =>
    s.cyclomatic > limits.cyclomatic || (s.cognitive ?? 0) > limits.cognitive;
  return [...previous]
    .filter(([key, snap]) => hot(snap) && !current.has(key))
    .map(([, snap]) => snap);
}
