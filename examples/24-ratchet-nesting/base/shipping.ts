export type Shipment = {
  domestic: boolean;
  express: boolean;
  fragile: boolean;
  insured: boolean;
  signature: boolean;
};

export function shippingTier(s: Shipment): number {
  if (!s.domestic) return 0;
  if (!s.express) return 1;
  if (!s.fragile) return 2;
  if (!s.insured) return 3;
  if (!s.signature) return 4;
  return 5;
}
