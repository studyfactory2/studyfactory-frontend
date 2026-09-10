import type { SessionOwnerKey } from '../../core/session';

const root = (ownerKey: SessionOwnerKey) =>
  ['private', ownerKey, 'members'] as const;

export const memberQueryKeys = {
  /** Every member query for this owner. */
  all: root,
  branch: (ownerKey: SessionOwnerKey, branchId: number) =>
    [...root(ownerKey), 'branch', branchId] as const,
  me: (ownerKey: SessionOwnerKey) => [...root(ownerKey), 'me'] as const,
  /** Pre-registered people in one branch who have not signed up yet. */
  pending: (ownerKey: SessionOwnerKey, branchId: number) =>
    [...root(ownerKey), 'pending', branchId] as const,
};
