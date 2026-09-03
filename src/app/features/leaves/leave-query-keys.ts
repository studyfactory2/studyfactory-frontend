import type { SessionOwnerKey } from '../../core/session';

/**
 * Owner-scoped roots so a write can invalidate every cached month without
 * knowing which months are currently in the cache.
 */
export const leaveQueryKeys = {
  all: (ownerKey: SessionOwnerKey) => ['private', ownerKey, 'leaves'] as const,
  myPlan: (ownerKey: SessionOwnerKey, year: number, month: number) =>
    ['private', ownerKey, 'leaves', 'myPlan', year, month] as const,
  myPlans: (ownerKey: SessionOwnerKey) =>
    ['private', ownerKey, 'leaves', 'myPlan'] as const,
};
