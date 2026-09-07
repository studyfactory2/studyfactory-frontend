import type { SessionOwnerKey } from '../../core/session';

const root = (ownerKey: SessionOwnerKey) =>
  ['private', ownerKey, 'suggestions'] as const;

export const suggestionQueryKeys = {
  /** Every suggestion query for this owner. */
  all: root,
  /** Everything raised in the caller's own branch — managers only. */
  branch: (ownerKey: SessionOwnerKey) => [...root(ownerKey), 'branch'] as const,
  mine: (ownerKey: SessionOwnerKey) => [...root(ownerKey), 'mine'] as const,
};
