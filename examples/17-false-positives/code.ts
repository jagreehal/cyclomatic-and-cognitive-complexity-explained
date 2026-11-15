/**
 * Every function here goes over a modified cyclomatic threshold of 10.
 * None of them needs refactoring. See the README section "When the linter is wrong".
 */

export type ChartOptions = {
  width?: number;
  height?: number;
  title?: string;
  theme?: 'light' | 'dark';
  legend?: boolean;
  grid?: boolean;
  animate?: boolean;
  xLabel?: string;
  yLabel?: string;
  locale?: string;
};

export type Chart = Required<ChartOptions>;

/** An options bag. Each default value is a "branch" to the metric. */
export function createChart({
  width = 640,
  height = 400,
  title = '',
  theme = 'light',
  legend = true,
  grid = true,
  animate = false,
  xLabel = '',
  yLabel = '',
  locale = 'en-GB',
}: ChartOptions = {}): Chart {
  return { width, height, title, theme, legend, grid, animate, xLabel, yLabel, locale };
}

type Address = { city?: string };

export type ApiOrder = {
  shipping?: { address?: Address };
  billing?: { address?: Address };
  customer?: { profile?: { defaultAddress?: Address } };
};

/** A fallback chain over a loosely typed API response. One expression, read top to bottom. */
export function deliveryCity(order: ApiOrder): string {
  return (
    order.shipping?.address?.city ??
    order.billing?.address?.city ??
    order.customer?.profile?.defaultAddress?.city ??
    'Unknown'
  );
}

export type SignupForm = {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  age: number;
  acceptedTerms: boolean;
  country: string;
  postcode: string;
  phone?: string;
};

/** A checklist. Each line is independent; none of them nests. */
export function signupErrors(form: SignupForm): string[] {
  const errors: string[] = [];
  if (!form.email.includes('@')) errors.push('email');
  if (form.password.length < 12) errors.push('password-length');
  if (!/[0-9]/.test(form.password)) errors.push('password-digit');
  if (form.password !== form.confirmPassword) errors.push('password-match');
  if (form.name.trim() === '') errors.push('name');
  if (form.age < 18) errors.push('age');
  if (!form.acceptedTerms) errors.push('terms');
  if (form.country === '') errors.push('country');
  if (form.postcode.trim() === '') errors.push('postcode');
  if (form.phone !== undefined && form.phone.length < 7) errors.push('phone');
  return errors;
}

export type HttpError =
  | 'bad_request'
  | 'unauthorised'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'gone'
  | 'unprocessable'
  | 'rate_limited'
  | 'unavailable'
  | 'timeout'
  | 'internal';

/** An exhaustive switch over a union. Cheap under "modified", expensive under "classic". */
export function statusCode(error: HttpError): number {
  switch (error) {
    case 'bad_request':
      return 400;
    case 'unauthorised':
      return 401;
    case 'forbidden':
      return 403;
    case 'not_found':
      return 404;
    case 'conflict':
      return 409;
    case 'gone':
      return 410;
    case 'unprocessable':
      return 422;
    case 'rate_limited':
      return 429;
    case 'internal':
      return 500;
    case 'unavailable':
      return 503;
    case 'timeout':
      return 504;
  }
}
