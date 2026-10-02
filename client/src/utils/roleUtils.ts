import type { User, UserRole } from '../types/auth';

const ROLE_HIERARCHY: Record<UserRole, number> = {
  user: 1,
  staff: 2,
  admin: 3,
};

export function hierarchy(user: User | null | undefined, minimumRole: UserRole): boolean {
  if (!user) return false;
  return ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[minimumRole];
}

export function isUser(user: User | null | undefined): boolean {
  return hierarchy(user, 'user');
}

export function isStaff(user: User | null | undefined): boolean {
  return hierarchy(user, 'staff');
}

export function isAdmin(user: User | null | undefined): boolean {
  return hierarchy(user, 'admin');
}

export const hasMinimumRole = hierarchy;
export const isStaffOrAbove = isStaff;

