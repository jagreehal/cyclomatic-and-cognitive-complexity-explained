/** Refactored — scores drop; ratchet passes and the new floor sticks. */
export function applyDiscount(total: number, vip: boolean, coupon: boolean): number {
  if (total <= 0) return 0;
  if (vip && coupon) return total * 0.7;
  if (vip) return total * 0.85;
  if (coupon) return total * 0.9;
  if (total > 200) return total * 0.95;
  return total;
}
