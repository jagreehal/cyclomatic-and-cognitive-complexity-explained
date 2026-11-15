/**
 * Brand-new file on the PR. Complexity above the new-function threshold.
 * ESLint bulk suppressions fail here if the file is linted without a new
 * suppression entry — the ratchet fails either way when compared to base.
 */

export type Refund = {
  amount: number;
  reason: string;
  vip: boolean;
  international: boolean;
  partial: boolean;
};

export function createRefund(refund: Refund): string {
  if (refund.amount <= 0) return 'invalid';
  if (refund.reason === 'fraud') {
    if (refund.vip) return 'fraud-vip';
    return 'fraud';
  }
  if (refund.partial) {
    if (refund.international) return 'partial-intl';
    if (refund.amount > 100) return 'partial-large';
    return 'partial';
  }
  if (refund.international) {
    if (refund.vip) return 'intl-vip';
    if (refund.amount > 500) return 'intl-large';
    return 'intl';
  }
  if (refund.vip && refund.amount > 1000) return 'vip-large';
  if (refund.vip) return 'vip';
  if (refund.amount > 1000) return 'large';
  return 'ok';
}
