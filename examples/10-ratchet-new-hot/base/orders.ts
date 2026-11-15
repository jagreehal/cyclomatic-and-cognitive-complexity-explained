export function createOrder(itemCount: number): string {
  if (itemCount <= 0) return 'empty';
  if (itemCount > 10) return 'bulk';
  return 'ok';
}
