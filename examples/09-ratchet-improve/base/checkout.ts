export function applyDiscount(total: number, vip: boolean, coupon: boolean): number {
  if (total <= 0) return 0;
  if (vip) {
    if (coupon) {
      if (total > 200) return total * 0.65;
      return total * 0.7;
    }
    if (total > 200) return total * 0.8;
    return total * 0.85;
  }
  if (coupon) {
    if (total > 200) return total * 0.85;
    return total * 0.9;
  }
  if (total > 200) return total * 0.95;
  return total;
}
