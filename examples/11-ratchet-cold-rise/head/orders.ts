/**
 * Was under the threshold; grew but stayed ≤ 10 cyclomatic / ≤ 15 cognitive.
 * Ratchet should pass.
 */
export function createOrder(itemCount: number, member: boolean): string {
  if (itemCount <= 0) return 'empty';
  if (member && itemCount > 10) return 'member-bulk';
  if (member && itemCount > 5) return 'member-mid';
  if (itemCount > 10) return 'bulk';
  if (itemCount > 5) return 'mid';
  return 'ok';
}
