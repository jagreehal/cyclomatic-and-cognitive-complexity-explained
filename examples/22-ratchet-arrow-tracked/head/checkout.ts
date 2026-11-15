/**
 * Same body as the other heads, rewritten as an arrow function.
 * Oxlint reports arrows without a name; the collector reads the name from the
 * `const` so the ratchet still sees applyDiscount go from 16 to 21.
 */
export const applyDiscount = (
  total: number,
  vip: boolean,
  coupon: boolean,
  employee: boolean,
  blackFriday: boolean,
): number => {
  if (total <= 0) return 0;
  if (blackFriday && employee) return total * 0.4;
  if (blackFriday && vip) return total * 0.6;
  if (employee && vip && coupon) return total * 0.5;
  if (vip && coupon) return total * 0.7;
  if (employee && vip) return total * 0.75;
  if (vip) return total * 0.85;
  if (employee && coupon) return total * 0.8;
  if (coupon) return total * 0.9;
  if (employee) return total * 0.88;
  if (blackFriday) return total * 0.8;
  if (total > 200) return total * 0.95;
  if (total > 100) return total * 0.97;
  return total;
};
