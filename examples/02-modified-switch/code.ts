/**
 * Classic cyclomatic counts every case. Modified counts the switch once.
 * This repo's collector uses variant: "modified".
 */

export type Status = 'draft' | 'open' | 'paid' | 'void' | 'refunded';

/** Exhaustive status mapping — friendly under modified complexity. */
export function statusLabelModified(status: Status): string {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'open':
      return 'Open';
    case 'paid':
      return 'Paid';
    case 'void':
      return 'Void';
    case 'refunded':
      return 'Refunded';
  }
}

/** Same branching expressed as if/else — higher modified score. */
export function statusLabelIfElse(status: Status): string {
  if (status === 'draft') return 'Draft';
  if (status === 'open') return 'Open';
  if (status === 'paid') return 'Paid';
  if (status === 'void') return 'Void';
  if (status === 'refunded') return 'Refunded';
  return 'Unknown';
}
