/**
 * One construct per function. Every function starts at 1; each decision adds to it.
 * Run `pnpm examples` to see what each construct costs under each metric.
 */

export function straightLine(a: number, b: number): number {
  return a + b;
}

export function ifStatement(a: boolean): number {
  if (a) return 1;
  return 0;
}

export function ifElse(a: boolean): number {
  if (a) {
    return 1;
  } else {
    return 0;
  }
}

export function elseIf(a: boolean, b: boolean): number {
  if (a) return 1;
  else if (b) return 2;
  return 0;
}

export function logicalAnd(a: boolean, b: boolean): boolean {
  return a && b;
}

export function logicalOr(a: boolean, b: boolean): boolean {
  return a || b;
}

export function logicalChain(a: boolean, b: boolean, c: boolean, d: boolean): boolean {
  return a && b && c && d;
}

export function nullishCoalescing(a: number | undefined): number {
  return a ?? 0;
}

export function optionalChaining(a: { b?: { c?: number } } | undefined): number | undefined {
  return a?.b?.c;
}

export function ternary(a: boolean): number {
  return a ? 1 : 0;
}

export function defaultParameter(a = 1): number {
  return a;
}

export function logicalAssignment(o: { a?: number }): { a?: number } {
  o.a ??= 1;
  return o;
}

export function forLoop(values: number[]): number {
  let total = 0;
  for (const value of values) total += value;
  return total;
}

export function whileLoop(n: number): number {
  while (n > 0) n--;
  return n;
}

export function tryCatch(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export function tryFinally(log: string[]): number {
  try {
    return 1;
  } finally {
    log.push('done');
  }
}

export function switchFourCases(n: 1 | 2 | 3 | 4): string {
  switch (n) {
    case 1:
      return 'one';
    case 2:
      return 'two';
    case 3:
      return 'three';
    case 4:
      return 'four';
  }
}

export function callbackWithBranch(values: number[]): number[] {
  // The ternary belongs to the arrow function, not to callbackWithBranch.
  return values.map((value) => (value > 0 ? value : 0));
}
