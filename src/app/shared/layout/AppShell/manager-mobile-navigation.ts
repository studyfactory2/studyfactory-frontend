import type { MemberRole } from '../../../core/session';
import { adminRoutes, staffRoutes } from '../../../core/router/routes.ts';
import {
  readAdminOperationsSection,
  readStaffOperationsSection,
} from '../../../features/manager-operations/model/manager-operation-sections.ts';

export type ManagerWorkspaceRole = Extract<MemberRole, 'ADMIN' | 'STAFF'>;
export type ManagerMenuGroup = 'admin' | 'staff';
export type ManagerMenuItem = {
  label: string;
  to: string;
  secondary?: boolean;
  description?: string;
  icon?: 'members' | 'leave' | 'qr' | 'beverage' | 'own-leave' | 'meals';
};

/** Mobile destinations are separate from the unchanged desktop sidebar. */
export function getManagerMobileNavigation(role: MemberRole | null) {
  if (role === 'ADMIN') {
    return {
      adminHub: adminRoutes.management,
      staffHub: adminRoutes.staffWorkspace,
      attendance: adminRoutes.attendance,
      admin: [
        {
          label: '사원 현황',
          description: '회원·스태프와 등록 대기',
          icon: 'members',
          to: adminRoutes.members,
        },
        {
          label: '휴무 관리',
          description: '날짜별 휴무와 개인일정',
          icon: 'leave',
          to: `${adminRoutes.operations}?section=leaves`,
        },
        {
          label: '출입 QR',
          description: '지점 출입 코드',
          icon: 'qr',
          to: `${adminRoutes.operations}?section=qr`,
        },
        {
          label: '기존 운영 도구',
          to: adminRoutes.operations,
          secondary: true,
        },
        { label: '홈', to: adminRoutes.home, secondary: true },
      ] satisfies ManagerMenuItem[],
      staff: [
        {
          label: '음료 운영',
          description: '제조 목록과 서빙 확인',
          icon: 'beverage',
          to: adminRoutes.operationsBeverages,
        },
        {
          label: '개인 휴무신청',
          description: '내 휴무 신청과 내역',
          icon: 'own-leave',
          to: adminRoutes.ownLeaves,
        },
        {
          label: '반찬 신청',
          description: '내 반찬 신청과 수량',
          icon: 'meals',
          to: adminRoutes.ownSideDishes,
        },
      ] satisfies ManagerMenuItem[],
    };
  }
  if (role === 'STAFF') {
    return {
      adminHub: null,
      staffHub: staffRoutes.workspace,
      attendance: staffRoutes.attendance,
      admin: [],
      staff: [
        {
          label: '음료 운영',
          description: '제조 목록과 서빙 확인',
          icon: 'beverage',
          to: staffRoutes.beverages,
        },
        {
          label: '개인 휴무신청',
          description: '내 휴무 신청과 내역',
          icon: 'own-leave',
          to: `${staffRoutes.operations}?section=leave`,
        },
        {
          label: '반찬 신청',
          description: '내 반찬 신청과 수량',
          icon: 'meals',
          to: `${staffRoutes.operations}?section=meals`,
        },
        {
          label: '기존 운영 도구',
          to: staffRoutes.operations,
          secondary: true,
        },
        { label: '홈', to: staffRoutes.home, secondary: true },
      ] satisfies ManagerMenuItem[],
    };
  }
  return null;
}

export function getManagerMobileSection(
  role: ManagerWorkspaceRole,
  pathname: string,
): ManagerMenuGroup | 'attendance' {
  const navigation = getManagerMobileNavigation(role)!;
  if (pathname === navigation.attendance) return 'attendance';
  if (role === 'STAFF') return 'staff';
  if (pathname === navigation.staffHub) return 'staff';
  return navigation.staff.some((item) => item.to === pathname)
    ? 'staff'
    : 'admin';
}

/** Shell-only labels; destination screens retain their existing behavior. */
export function getManagerMobilePage(
  role: ManagerWorkspaceRole,
  pathname: string,
  search = '',
): { title: string; parent: string | null; personal: boolean } {
  const navigation = getManagerMobileNavigation(role)!;
  if (pathname === navigation.attendance)
    return { title: '출석', parent: null, personal: false };
  if (pathname === navigation.adminHub)
    return { title: '관리자', parent: null, personal: false };
  if (pathname === navigation.staffHub)
    return { title: '스태프', parent: null, personal: false };

  const group = getManagerMobileSection(role, pathname);
  const parent = group === 'admin' ? navigation.adminHub : navigation.staffHub;
  const params = new URLSearchParams(search);
  if (role === 'ADMIN' && pathname === adminRoutes.operations) {
    const section = readAdminOperationsSection(params);
    return {
      title:
        section === 'leaves'
          ? '휴무 관리'
          : section === 'qr'
            ? '출입 QR'
            : '운영',
      parent,
      personal: false,
    };
  }
  if (role === 'STAFF' && pathname === staffRoutes.operations) {
    const section = readStaffOperationsSection(params);
    const titles = {
      work: '운영',
      leave: '개인 휴무신청',
      'member-leave': '휴무 관리',
      meals: '반찬 신청',
      schedule: '근무표',
      seats: '좌석 관리',
    };
    return {
      title: titles[section],
      parent,
      personal: section === 'leave' || section === 'meals',
    };
  }
  const item = [...navigation.admin, ...navigation.staff].find(
    (item) => item.to === pathname,
  );
  return {
    title: item?.label ?? (group === 'admin' ? '관리자' : '스태프'),
    parent,
    personal:
      pathname === adminRoutes.ownLeaves ||
      pathname === adminRoutes.ownSideDishes,
  };
}
