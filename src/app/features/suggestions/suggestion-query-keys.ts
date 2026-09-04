import type { SessionOwnerKey } from '../../core/session';

const root = (ownerKey: SessionOwnerKey) =>
  ['private', ownerKey, 'suggestions'] as const;

export const suggestionQueryKeys = {
  /** Every suggestion query for this owner. */
  all: root,
  mine: (ownerKey: SessionOwnerKey) => [...root(ownerKey), 'mine'] as const,
};
