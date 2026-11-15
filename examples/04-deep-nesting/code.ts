/** Nesting inflates cognitive complexity faster than cyclomatic. */

export function scoreShipment(opts: {
  domestic: boolean;
  express: boolean;
  fragile: boolean;
  insured: boolean;
}): number {
  let score = 0;
  if (opts.domestic) {
    if (opts.express) {
      if (opts.fragile) {
        if (opts.insured) {
          score = 4;
        } else {
          score = 3;
        }
      } else {
        score = 2;
      }
    } else {
      score = 1;
    }
  }
  return score;
}

export function scoreShipmentFlat(opts: {
  domestic: boolean;
  express: boolean;
  fragile: boolean;
  insured: boolean;
}): number {
  if (!opts.domestic) return 0;
  if (!opts.express) return 1;
  if (!opts.fragile) return 2;
  if (!opts.insured) return 3;
  return 4;
}
