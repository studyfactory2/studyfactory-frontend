import type { SessionOwnerKey } from '../../core/session';

/**
 * Owner-scoped roots so a write can invalidate every cached month without
 * knowing which months are currently in the cache.
 */
export const leaveQueryKeys = {
  all: (ownerKey: SessionOwnerKey) => ['private', ownerKey, 'leaves'] as const,
  /** Everyone's leave for one day in one branch — managers only. */
  dailyStatus: (ownerKey: SessionOwnerKey, branchId: number, date: string) =>
    ['private', ownerKey, 'leaves', 'dailyStatus', branchId, date] as const,
  myPlan: (ownerKey: SessionOwnerKey, year: number, month: number) =>
    ['private', ownerKey, 'leaves', 'myPlan', year, month] as const,
  myPlans: (ownerKey: SessionOwnerKey) =>
    ['private', ownerKey, 'leaves', 'myPlan'] as const,
  memberMonth: (
    ownerKey: SessionOwnerKey,
    branchId: number,
    memberId: number,
    year: number,
    month: number,
  ) =>
    [
      'private',
      ownerKey,
      'leaves',
      'memberMonth',
      branchId,
      memberId,
      year,
      month,
    ] as const,
  memberSpecial: (
    ownerKey: SessionOwnerKey,
    branchId: number,
    memberId: number,
  ) =>
    [
      'private',
      ownerKey,
      'leaves',
      'memberSpecial',
      branchId,
      memberId,
    ] as const,
  fixed: (ownerKey: SessionOwnerKey, branchId: number) =>
    ['private', ownerKey, 'leaves', 'fixed', branchId] as const,
};
