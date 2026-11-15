/**
 * Same inputs, same answers, same number of paths: cyclomatic does not move.
 * The rewrite nests every check, and cognitive goes from 5 to 19.
 */
export type Shipment = {
  domestic: boolean;
  express: boolean;
  fragile: boolean;
  insured: boolean;
  signature: boolean;
};

export function shippingTier(s: Shipment): number {
  let tier = 0;
  if (s.domestic) {
    if (s.express) {
      if (s.fragile) {
        if (s.insured) {
          if (s.signature) {
            tier = 5;
          } else {
            tier = 4;
          }
        } else {
          tier = 3;
        }
      } else {
        tier = 2;
      }
    } else {
      tier = 1;
    }
  }
  return tier;
}
