/** Methods are tracked by name the same way as functions. */

export class PricingEngine {
  quote(subtotal: number, member: boolean, international: boolean): number {
    if (subtotal <= 0) return 0;
    let total = subtotal;
    if (member) {
      if (subtotal > 100) total *= 0.9;
      else total *= 0.95;
    }
    if (international) {
      if (subtotal > 200) total += 25;
      else total += 15;
    }
    if (total > 500) total *= 0.98;
    return total;
  }

  simpleFee(subtotal: number): number {
    if (subtotal <= 0) return 0;
    if (subtotal < 50) return 5;
    return 0;
  }
}
