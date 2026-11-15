/** Mixed PR: one function improves, one stays cold, one new function is fine. */
export function processPayment(amount: number, vip: boolean, refund: boolean): string {
  if (amount <= 0) return 'invalid';
  if (vip && refund) return 'vip-refund';
  if (vip) return 'vip';
  if (refund) return 'refund';
  if (amount > 1000) return 'large';
  return 'ok';
}

export function formatCurrency(amount: number): string {
  if (amount < 0) return `-£${(-amount).toFixed(2)}`;
  return `£${amount.toFixed(2)}`;
}

export function paymentEmoji(status: string): string {
  if (status === 'ok') return 'ok';
  if (status === 'refund') return 'refund';
  return 'other';
}
