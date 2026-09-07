import type { SessionOwnerKey } from '../../core/session';

const root = (ownerKey: SessionOwnerKey) =>
  ['private', ownerKey, 'studyPresence'] as const;

export const studyPresenceQueryKeys = {
  /** Every presence query for this owner. */
  all: root,
  /** Prefix covering every requested history range for this owner. */
  histories: (ownerKey: SessionOwnerKey) =>
    [...root(ownerKey), 'history'] as const,
  history: (ownerKey: SessionOwnerKey, from: string, to: string) =>
    [...root(ownerKey), 'history', from, to] as const,
  /** Who is sitting in the branch right now — managers only. */
  live: (ownerKey: SessionOwnerKey) => [...root(ownerKey), 'live'] as const,
  me: (ownerKey: SessionOwnerKey) => [...root(ownerKey), 'me'] as const,
};
