import type { MemberRole } from '../session';

export const appRoutes = {
  admin: '/admin',
  login: '/login',
  member: '/member',
  staff: '/staff',
} as const;

export const memberRoutes = {
  home: appRoutes.member,
  more: `${appRoutes.member}/more`,
  moreBeverages: `${appRoutes.member}/more/beverages`,
  moreLeaves: `${appRoutes.member}/more/leaves`,
  moreProfile: `${appRoutes.member}/more/profile`,
  moreSideDishes: `${appRoutes.member}/more/side-dishes`,
  moreSuggestions: `${appRoutes.member}/more/suggestions`,
  plans: `${appRoutes.member}/plans`,
  study: `${appRoutes.member}/study`,
} as const;

export const staffRoutes = {
  attendance: `${appRoutes.staff}/attendance`,
  beverages: `${appRoutes.staff}/beverages`,
  home: appRoutes.staff,
  operations: `${appRoutes.staff}/operations`,
} as const;

export const adminRoutes = {
  attendance: `${appRoutes.admin}/attendance`,
  home: appRoutes.admin,
  members: `${appRoutes.admin}/members`,
  operations: `${appRoutes.admin}/operations`,
  operationsBeverages: `${appRoutes.admin}/operations/beverages`,
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
