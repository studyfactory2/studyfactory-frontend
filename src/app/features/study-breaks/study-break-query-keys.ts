import type { SessionOwnerKey } from '../../core/session';

export const studyBreakQueryKeys = {
  me: (ownerKey: SessionOwnerKey) =>
    ['private', ownerKey, 'studyBreaks', 'me'] as const,
};
