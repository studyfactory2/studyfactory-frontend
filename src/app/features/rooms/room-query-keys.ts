import type { SessionOwnerKey } from '../../core/session';

const root = (ownerKey: SessionOwnerKey) =>
  ['private', ownerKey, 'rooms'] as const;

export const roomQueryKeys = {
  /** Every room query for this owner. */
  all: root,
  layouts: (ownerKey: SessionOwnerKey, branchId: number) =>
    [...root(ownerKey), 'layouts', branchId] as const,
};
