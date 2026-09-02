import type { SessionOwnerKey } from '../../core/session';

export const studyTimeQueryKeys = {
  report: (ownerKey: SessionOwnerKey, from: string, to: string) =>
    ['private', ownerKey, 'studyTime', 'report', from, to] as const,
};
