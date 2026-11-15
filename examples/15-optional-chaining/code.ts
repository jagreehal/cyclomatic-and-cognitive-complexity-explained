/**
 * Optional chaining adds classic/modified cyclomatic paths.
 * Useful when agents reach for `?.` everywhere.
 */

export type Profile = {
  address?: {
    city?: string;
    country?: string;
  };
  prefs?: {
    newsletter?: boolean;
  };
};

export function cityLabel(profile: Profile): string {
  const city = profile.address?.city;
  if (!city) return 'unknown';
  return city;
}

export function marketingEligible(profile: Profile): boolean {
  return Boolean(profile.prefs?.newsletter && profile.address?.country === 'GB');
}
