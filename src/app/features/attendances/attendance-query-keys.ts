import type { SessionOwnerKey } from '../../core/session';

const root = (ownerKey: SessionOwnerKey) =>
  ['private', ownerKey, 'attendances'] as const;

export const attendanceQueryKeys = {
  /** Every attendance query for this owner. */
  all: root,
  dailyBoard: (ownerKey: SessionOwnerKey, branchId: number, date: string) =>
    [...root(ownerKey), 'dailyBoard', branchId, date] as const,
};
