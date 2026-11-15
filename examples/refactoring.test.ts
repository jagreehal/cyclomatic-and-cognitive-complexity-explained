import { describe, expect, it } from 'vitest';
import { processPayment } from '../fixtures/base/payments.js';
import {
  canRefundInline,
  canRefundNamed,
  processPaymentTable,
  shippingZoneLadder,
  shippingZoneLookup,
} from './18-refactoring-toolkit/code.js';

const bools = [false, true];

describe('18-refactoring-toolkit keeps behaviour identical', () => {
  it('lookup table matches the if-ladder', () => {
    // constructor, toString and __proto__ catch an object-literal table returning inherited properties.
    for (const c of ['GB', 'IE', 'FR', 'DE', 'ES', 'IT', 'NL', 'US', 'CA', 'AU', 'JP', '', 'constructor', 'toString', '__proto__']) {
      expect(shippingZoneLookup(c)).toBe(shippingZoneLadder(c));
    }
  });

  it('named predicates match the inline condition', () => {
    for (const daysSincePurchase of [0, 30, 31, 60, 61, 365, 366])
      for (const opened of bools)
        for (const faulty of bools)
          for (const member of bools)
            for (const finalSale of bools) {
              const r = { daysSincePurchase, opened, faulty, member, finalSale };
              expect(canRefundNamed(r)).toBe(canRefundInline(r));
            }
  });

  it('decision table matches the nested processPayment on every combination of the test values', () => {
    for (const amount of [-1, 0, 50, 100, 101, 500, 501, 1000, 1001])
      for (const currency of ['GBP', 'USD', 'EUR'])
        for (const vip of bools)
          for (const refund of bools)
            for (const international of bools)
              for (const flagged of bools) {
                const p = { amount, currency, vip, refund, international, flagged };
                expect(processPaymentTable(p)).toBe(processPayment(p));
              }
  });
});
