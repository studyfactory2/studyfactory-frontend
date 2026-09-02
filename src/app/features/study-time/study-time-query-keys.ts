import type { SessionOwnerKey } from '../../core/session';

const root = (ownerKey: SessionOwnerKey) =>
  ['private', ownerKey, 'studyTime'] as const;

export const studyTimeQueryKeys = {
  /** Every study-time query for this owner. */
  all: root,
  report: (ownerKey: SessionOwnerKey, from: string, to: string) =>
    [...root(ownerKey), 'report', from, to] as const,
  /** Prefix covering every requested report range for this owner. */
  reports: (ownerKey: SessionOwnerKey) =>
    [...root(ownerKey), 'report'] as const,
};
