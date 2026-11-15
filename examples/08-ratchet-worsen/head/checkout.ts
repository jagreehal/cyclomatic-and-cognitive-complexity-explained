/** Same function, more branches — classic silent ESLint-suppression miss. */
export function applyDiscount(
  total: number,
  vip: boolean,
  coupon: boolean,
  employee: boolean,
): number {
  if (total <= 0) return 0;
  if (employee && vip && coupon) return total * 0.5;
  if (vip && coupon) return total * 0.7;
  if (employee && vip) return total * 0.75;
  if (vip) return total * 0.85;
  if (employee && coupon) return total * 0.8;
  if (coupon) return total * 0.9;
  if (employee) return total * 0.88;
  if (total > 200) return total * 0.95;
  if (total > 100) return total * 0.97;
  return total;
}
