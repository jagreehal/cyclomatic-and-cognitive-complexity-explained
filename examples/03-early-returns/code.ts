/** Guard clauses vs nested validation. */

export type User = {
  active: boolean;
  verified: boolean;
  role: 'admin' | 'member' | 'guest';
};

export function canEditNested(user: User): boolean {
  if (user.active) {
    if (user.verified) {
      if (user.role === 'admin' || user.role === 'member') {
        return true;
      }
    }
  }
  return false;
}

export function canEditGuards(user: User): boolean {
  if (!user.active) return false;
  if (!user.verified) return false;
  if (user.role === 'guest') return false;
  return true;
}
