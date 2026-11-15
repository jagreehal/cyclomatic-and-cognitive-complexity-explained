/** Nested ternaries inflate cognitive complexity quickly. */

export function tierNested(amount: number): string {
  return amount > 1000
    ? amount > 5000
      ? 'platinum'
      : 'gold'
    : amount > 100
      ? 'silver'
      : 'bronze';
}

export function tierFlat(amount: number): string {
  if (amount > 5000) return 'platinum';
  if (amount > 1000) return 'gold';
  if (amount > 100) return 'silver';
  return 'bronze';
}
