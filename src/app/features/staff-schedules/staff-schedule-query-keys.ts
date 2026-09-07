import type { SessionOwnerKey } from '../../core/session';

const root = (ownerKey: SessionOwnerKey) =>
  ['private', ownerKey, 'staffSchedules'] as const;

export const staffScheduleQueryKeys = {
  /** Every staff-schedule query for this owner. */
  all: root,
  board: (ownerKey: SessionOwnerKey, branchId: number) =>
    [...root(ownerKey), 'board', branchId] as const,
};
