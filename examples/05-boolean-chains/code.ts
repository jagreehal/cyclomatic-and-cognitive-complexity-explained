/** Boolean operators add cognitive / cyclomatic cost. */

export function eligibleAnd(a: boolean, b: boolean, c: boolean, d: boolean): boolean {
  return a && b && c && d;
}

export function eligibleOr(a: boolean, b: boolean, c: boolean, d: boolean): boolean {
  // Force a reported cognitive score (pure || chains can sit at 0).
  if (!(a || b || c || d)) return false;
  return true;
}

export function eligibleMixed(
  a: boolean,
  b: boolean,
  c: boolean,
  d: boolean,
): boolean {
  return (a && b) || (c && d);
}

export function eligibleNestedIf(
  a: boolean,
  b: boolean,
  c: boolean,
  d: boolean,
): boolean {
  if (a) {
    if (b) {
      return true;
    }
  }
  if (c) {
    if (d) {
      return true;
    }
  }
  return false;
}
