import type { SessionOwnerKey } from '../../core/session';

const root = (ownerKey: SessionOwnerKey) =>
  ['private', ownerKey, 'sideDishes'] as const;

export const sideDishQueryKeys = {
  /** Every side-dish query for this owner. */
  all: root,
  mine: (ownerKey: SessionOwnerKey, date: string) =>
    [...root(ownerKey), 'mine', date] as const,
  orderDates: (ownerKey: SessionOwnerKey, from: string, to: string) =>
    [...root(ownerKey), 'orderDates', from, to] as const,
};
