import type { MemberRole } from '../auth/types';

export const appRoutes = {
  admin: '/admin',
  login: '/login',
  member: '/member',
  staff: '/staff',
} as const;

export function getRoleHomePath(role: MemberRole) {
  if (role === 'ADMIN') {
    return appRoutes.admin;
  }

  if (role === 'STAFF') {
    return appRoutes.staff;
  }

  return appRoutes.member;
}
