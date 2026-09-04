import type { SessionOwnerKey } from '../../core/session';

const root = (ownerKey: SessionOwnerKey) =>
  ['private', ownerKey, 'beverages'] as const;

export const beverageQueryKeys = {
  /** Every beverage query for this owner. */
  all: root,
  me: (ownerKey: SessionOwnerKey) => [...root(ownerKey), 'me'] as const,
};
