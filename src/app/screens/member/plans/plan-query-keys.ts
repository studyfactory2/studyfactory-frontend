import type { SessionOwnerKey } from '../../../core/session';

export const memberPlanQueryKeys = {
  month: (ownerKey: SessionOwnerKey, month: string) =>
    ['private', ownerKey, 'memberPlans', 'month', month] as const,
  owner: (ownerKey: SessionOwnerKey) =>
    ['private', ownerKey, 'memberPlans'] as const,
  week: (ownerKey: SessionOwnerKey, weekStartDate: string) =>
    ['private', ownerKey, 'memberPlans', 'week', weekStartDate] as const,
};
