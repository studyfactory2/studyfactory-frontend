import type { SessionOwnerKey } from '../../core/session';

export const beverageQueryKeys = {
  me: (ownerKey: SessionOwnerKey) =>
    ['private', ownerKey, 'beverages', 'me'] as const,
};
