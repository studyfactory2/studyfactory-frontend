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
  tasks: `${appRoutes.member}/tasks`,
} as const;

export const staffRoutes = {
  workspace: `${appRoutes.staff}/workspace`,
  attendance: `${appRoutes.staff}/attendance`,
  beverages: `${appRoutes.staff}/beverages`,
  home: appRoutes.staff,
  operations: `${appRoutes.staff}/operations`,
} as const;

export const adminRoutes = {
  management: `${appRoutes.admin}/management`,
  staffWorkspace: `${appRoutes.admin}/staff`,
  attendance: `${appRoutes.admin}/attendance`,
  home: appRoutes.admin,
  members: `${appRoutes.admin}/members`,
  operations: `${appRoutes.admin}/operations`,
  operationsBeverages: `${appRoutes.admin}/operations/beverages`,
  ownLeaves: `${appRoutes.admin}/operations/my-leave`,
  ownSideDishes: `${appRoutes.admin}/operations/my-side-dishes`,
} as const;

export function getRoleHomePath(role: MemberRole) {
  if (role === 'ADMIN') {
    return adminRoutes.attendance;
  }

  if (role === 'STAFF') {
    return staffRoutes.attendance;
  }

  return appRoutes.member;
}
