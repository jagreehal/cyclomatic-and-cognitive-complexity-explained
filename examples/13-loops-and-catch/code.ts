/** Loops and catch clauses add structural complexity. */

export function sumPositive(values: number[]): number {
  let total = 0;
  for (const value of values) {
    if (value > 0) total += value;
  }
  return total;
}

export function parseNumbers(raw: string[]): number[] {
  const out: number[] = [];
  for (const item of raw) {
    try {
      const n = Number(item);
      if (Number.isNaN(n)) continue;
      out.push(n);
    } catch {
      continue;
    }
  }
  return out;
}

export function findFirstMatch(
  values: string[],
  needle: string,
  ignoreCase: boolean,
): string | undefined {
  for (const value of values) {
    const left = ignoreCase ? value.toLowerCase() : value;
    const right = ignoreCase ? needle.toLowerCase() : needle;
    if (left === right) return value;
    if (left.includes(right)) return value;
  }
  return undefined;
}
