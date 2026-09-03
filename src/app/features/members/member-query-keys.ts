import type { SessionOwnerKey } from '../../core/session';

const root = (ownerKey: SessionOwnerKey) =>
  ['private', ownerKey, 'members'] as const;

export const memberQueryKeys = {
  /** Every member query for this owner. */
  all: root,
  me: (ownerKey: SessionOwnerKey) => [...root(ownerKey), 'me'] as const,
};
