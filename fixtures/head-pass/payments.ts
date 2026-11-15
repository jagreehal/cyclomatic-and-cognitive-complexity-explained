/**
 * PR that improves hot functions and only raises cold ones up to the threshold.
 */

export type Payment = {
  amount: number;
  currency: string;
  vip: boolean;
  refund: boolean;
  international: boolean;
  flagged: boolean;
};

export function processPayment(payment: Payment): string {
  if (payment.amount <= 0) return 'invalid-amount';
  if (payment.currency !== 'GBP' && payment.currency !== 'USD') {
    return 'unsupported-currency';
  }
  if (payment.flagged) {
    if (payment.vip) return 'flagged-vip-review';
    return 'flagged-review';
  }
  if (payment.vip) {
    if (payment.refund) return 'vip-refund';
    if (payment.international) return 'vip-intl';
    return 'vip';
  }
  if (payment.refund) {
    if (payment.international) return 'refund-intl';
    return 'refund';
  }
  if (payment.international) return 'intl';
  if (payment.amount > 1000) return 'large';
  return 'ok';
}

export type Customer = {
  email: string;
  country: string;
  age: number;
  verified: boolean;
  banned: boolean;
};

export function validateCustomer(customer: Customer): string {
  if (!customer.email.includes('@')) return 'bad-email';
  if (customer.banned) return 'banned';
  if (!customer.verified) return 'unverified';
  if (customer.age < 18) return 'minor';
  if (customer.country === 'XX') return 'embargoed';
  if (customer.country === 'US' || customer.country === 'CA') return 'na-ok';
  if (customer.country === 'GB') return 'gb-ok';
  return 'ok';
}

export function createOrder(itemCount: number, member: boolean): string {
  if (itemCount <= 0) return 'empty';
  if (member && itemCount > 10) return 'member-bulk';
  if (member && itemCount > 5) return 'member-mid';
  if (itemCount > 10) return 'bulk';
  if (itemCount > 5) return 'mid';
  return 'ok';
}

export function nested(a: boolean, b: boolean, c: boolean): number {
  if (a) {
    if (b) {
      if (c) {
        return 1;
      }
    }
  }
  return 0;
}

export function flat(a: boolean, b: boolean, c: boolean): number {
  if (!a) return 0;
  if (!b) return 0;
  if (!c) return 0;
  return 1;
}
