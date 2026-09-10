import type { SessionOwnerKey } from '../../core/session';

const root = (ownerKey: SessionOwnerKey) =>
  ['private', ownerKey, 'suggestions'] as const;

export const suggestionQueryKeys = {
  /** Every suggestion query for this owner. */
  all: root,
  /** Everything raised in one branch — managers only. */
  branch: (ownerKey: SessionOwnerKey, branchId: number) =>
    [...root(ownerKey), 'branch', branchId] as const,
  mine: (ownerKey: SessionOwnerKey) => [...root(ownerKey), 'mine'] as const,
};
