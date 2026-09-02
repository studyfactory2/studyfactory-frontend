import type { SessionOwnerKey } from '../../core/session';

export const studyPresenceQueryKeys = {
  me: (ownerKey: SessionOwnerKey) =>
    ['private', ownerKey, 'studyPresence', 'me'] as const,
};
