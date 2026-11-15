/**
 * Refactors for functions the linter is right about.
 * Pairs: the "before" shape and the "after" shape, behaviour unchanged.
 * examples/refactoring.test.ts proves each pair returns the same answers.
 */

// 1. Lookup table: an if-ladder that maps one value to another is data.

export function shippingZoneLadder(country: string): string {
  if (country === 'GB') return 'domestic';
  if (country === 'IE') return 'eu';
  if (country === 'FR') return 'eu';
  if (country === 'DE') return 'eu';
  if (country === 'ES') return 'eu';
  if (country === 'IT') return 'eu';
  if (country === 'NL') return 'eu';
  if (country === 'US') return 'americas';
  if (country === 'CA') return 'americas';
  if (country === 'AU') return 'apac';
  return 'rest-of-world';
}

// A Map, not an object literal: SHIPPING_ZONES['constructor'] on a plain object
// returns Object's constructor function instead of falling through to the default.
const SHIPPING_ZONES = new Map<string, string>([
  ['GB', 'domestic'],
  ['IE', 'eu'],
  ['FR', 'eu'],
  ['DE', 'eu'],
  ['ES', 'eu'],
  ['IT', 'eu'],
  ['NL', 'eu'],
  ['US', 'americas'],
  ['CA', 'americas'],
  ['AU', 'apac'],
]);

export function shippingZoneLookup(country: string): string {
  return SHIPPING_ZONES.get(country) ?? 'rest-of-world';
}

// 2. Named predicates: a compound condition the reader has to decode.

export type RefundRequest = {
  daysSincePurchase: number;
  opened: boolean;
  faulty: boolean;
  member: boolean;
  finalSale: boolean;
};

export function canRefundInline(r: RefundRequest): boolean {
  if (r.finalSale && !r.faulty) return false;
  if ((r.daysSincePurchase <= 30 && !r.opened) || (r.member && r.daysSincePurchase <= 60 && !r.opened)) {
    return true;
  }
  if (r.faulty && (r.daysSincePurchase <= 365 || r.member)) return true;
  return false;
}

function withinReturnWindow(r: RefundRequest): boolean {
  const windowDays = r.member ? 60 : 30;
  return r.daysSincePurchase <= windowDays && !r.opened;
}

function coveredByWarranty(r: RefundRequest): boolean {
  return r.faulty && (r.daysSincePurchase <= 365 || r.member);
}

export function canRefundNamed(r: RefundRequest): boolean {
  if (r.finalSale && !r.faulty) return false;
  return withinReturnWindow(r) || coveredByWarranty(r);
}

// 3. Decision table: the nested processPayment from fixtures/base (score 19),
//    flattened into ordered rules. First match wins, exactly as the nested ifs did.

export type Payment = {
  amount: number;
  currency: string;
  vip: boolean;
  refund: boolean;
  international: boolean;
  flagged: boolean;
};

type Rule = readonly [outcome: string, when: (p: Payment) => boolean];

const PAYMENT_RULES: readonly Rule[] = [
  ['invalid-amount', (p) => p.amount <= 0],
  ['unsupported-currency', (p) => p.currency !== 'GBP' && p.currency !== 'USD'],
  ['flagged-vip-review', (p) => p.flagged && p.vip],
  ['flagged-intl-review', (p) => p.flagged && p.international],
  ['flagged-review', (p) => p.flagged],
  ['vip-refund-large', (p) => p.vip && p.refund && p.amount > 1000],
  ['vip-refund', (p) => p.vip && p.refund],
  ['vip-intl', (p) => p.vip && p.international],
  ['vip-large', (p) => p.vip && p.amount > 1000],
  ['vip', (p) => p.vip],
  ['refund-intl', (p) => p.refund && p.international],
  ['refund-large', (p) => p.refund && p.amount > 500],
  ['refund', (p) => p.refund],
  ['intl-large', (p) => p.international && p.amount > 1000],
  ['intl', (p) => p.international],
  ['large', (p) => p.amount > 1000],
  ['medium', (p) => p.amount > 100],
];

export function processPaymentTable(payment: Payment): string {
  return PAYMENT_RULES.find(([, when]) => when(payment))?.[0] ?? 'ok';
}
