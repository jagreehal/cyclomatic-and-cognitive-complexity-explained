/**
 * Libraries that favour discriminated unions + exhaustive switches
 * (e.g. Awaitly-style Result handling) want modified cyclomatic complexity.
 */

export type PaymentError =
  | { type: 'insufficient_funds' }
  | { type: 'card_declined'; code: string }
  | { type: 'network'; retryable: boolean }
  | { type: 'fraud' }
  | { type: 'unknown'; message: string };

export function describePaymentError(error: PaymentError): string {
  switch (error.type) {
    case 'insufficient_funds':
      return 'Insufficient funds';
    case 'card_declined':
      return `Card declined (${error.code})`;
    case 'network':
      return error.retryable ? 'Network error — retry' : 'Network error';
    case 'fraud':
      return 'Flagged for fraud review';
    case 'unknown':
      return error.message;
  }
}

/** Same domain logic without a switch — penalised more under modified CC. */
export function describePaymentErrorIfs(error: PaymentError): string {
  if (error.type === 'insufficient_funds') return 'Insufficient funds';
  if (error.type === 'card_declined') return `Card declined (${error.code})`;
  if (error.type === 'network') {
    return error.retryable ? 'Network error — retry' : 'Network error';
  }
  if (error.type === 'fraud') return 'Flagged for fraud review';
  if (error.type === 'unknown') return error.message;
  return 'Unhandled';
}
