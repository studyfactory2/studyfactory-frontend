import type { SessionOwnerKey } from '../../core/session';

export const leaveQueryKeys = {
  myPlan: (ownerKey: SessionOwnerKey, year: number, month: number) =>
    ['private', ownerKey, 'leaves', 'myPlan', year, month] as const,
};
