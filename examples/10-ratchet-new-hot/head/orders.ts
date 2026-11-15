export function createOrder(itemCount: number): string {
  if (itemCount <= 0) return 'empty';
  if (itemCount > 10) return 'bulk';
  return 'ok';
}

/** Brand-new function above the threshold — must fail the ratchet. */
export function routeOrder(
  itemCount: number,
  international: boolean,
  express: boolean,
  fragile: boolean,
  insured: boolean,
): string {
  if (itemCount <= 0) return 'empty';
  if (international) {
    if (express) {
      if (fragile) return insured ? 'intl-express-fragile-insured' : 'intl-express-fragile';
      return 'intl-express';
    }
    if (fragile) return 'intl-fragile';
    return 'intl';
  }
  if (express) {
    if (fragile) return insured ? 'express-fragile-insured' : 'express-fragile';
    return 'express';
  }
  if (fragile) return 'fragile';
  if (itemCount > 10) return 'bulk';
  return 'ok';
}
