import type { SessionOwnerKey } from '../../core/session';

const root = (ownerKey: SessionOwnerKey) =>
  ['private', ownerKey, 'todos'] as const;

export const todoQueryKeys = {
  /** Every todo query for this owner. */
  all: root,
  daily: (ownerKey: SessionOwnerKey, branchId: number, date: string) =>
    [...root(ownerKey), 'daily', branchId, date] as const,
};
