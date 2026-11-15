export function processPayment(amount: number, vip: boolean, refund: boolean): string {
  if (amount <= 0) return 'invalid';
  if (vip) {
    if (refund) {
      if (amount > 1000) return 'vip-refund-large';
      return 'vip-refund';
    }
    if (amount > 1000) return 'vip-large';
    return 'vip';
  }
  if (refund) {
    if (amount > 500) return 'refund-large';
    return 'refund';
  }
  if (amount > 1000) return 'large';
  if (amount > 100) return 'medium';
  return 'ok';
}

export function formatCurrency(amount: number): string {
  if (amount < 0) return `-£${(-amount).toFixed(2)}`;
  return `£${amount.toFixed(2)}`;
}
