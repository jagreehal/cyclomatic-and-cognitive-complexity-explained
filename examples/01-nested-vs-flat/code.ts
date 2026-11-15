/** Same cyclomatic score; cognitive prefers early returns. */

export function nested(a: boolean, b: boolean, c: boolean): number {
  if (a) {
    if (b) {
      if (c) {
        return 1;
      }
    }
  }
  return 0;
}

export function flat(a: boolean, b: boolean, c: boolean): number {
  if (!a) return 0;
  if (!b) return 0;
  if (!c) return 0;
  return 1;
}
