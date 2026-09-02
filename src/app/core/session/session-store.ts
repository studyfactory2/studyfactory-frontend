import { decodeAccessToken } from './jwt';
import type { Session, SessionCredentials, SessionOwnerKey } from './types';

const SESSION_STORAGE_KEY = 'studyfactory.session.v1';
const LEGACY_MIRROR_STORAGE_KEY = 'studyfactory.session.legacyMirror.v1';
const SESSION_WRITE_STORAGE_KEY = 'studyfactory.session.write.v1';

const LEGACY_STORAGE_KEYS = {
  accessToken: 'studyfactory.accessToken',
  branchId: 'studyfactory.branchId',
  memberName: 'studyfactory.memberName',
  refreshToken: 'studyfactory.refreshToken',
  role: 'studyfactory.memberRole',
} as const;

const watchedStorageKeys = new Set<string>([
  SESSION_STORAGE_KEY,
  SESSION_WRITE_STORAGE_KEY,
  ...Object.values(LEGACY_STORAGE_KEYS),
]);

const emptySession: Session = {
  accessToken: null,
  branchId: null,
  isAuthenticated: false,
  memberId: null,
  memberName: null,
  ownerKey: null,
  refreshToken: null,
  role: null,
};

type StoredCredentials = {
  accessToken: string | null;
  refreshToken: string | null;
};

type SessionListener = () => void;

let currentSession = readStoredSession();
const listeners = new Set<SessionListener>();
let storageListenerAttached = false;

export function subscribeSession(listener: SessionListener) {
  listeners.add(listener);
  attachStorageListener();
  synchronizeSessionFromStorage();

  return () => {
    listeners.delete(listener);
  };
}

export function getCurrentSession() {
  return currentSession;
}

export function getServerSession() {
  return emptySession;
}

export function getSessionCredentials(): StoredCredentials {
  return synchronizeSessionFromStorage();
}

export function getAccessToken() {
  return getSessionCredentials().accessToken;
}

export function getRefreshToken() {
  return getSessionCredentials().refreshToken;
}

export function saveSession(credentials: SessionCredentials) {
  const nextSession = createSession(
    credentials.accessToken,
    credentials.refreshToken,
  );

  if (!nextSession.isAuthenticated) {
    return null;
  }

  persistCredentials(credentials);
  publishSession(nextSession);
  return nextSession;
}

export function updateAccessToken(
  accessToken: string,
  expectedCredentials: StoredCredentials,
) {
  const storedCredentials = readStoredCredentials();

  if (!credentialsMatch(storedCredentials, expectedCredentials)) {
    publishSession(
      createSession(
        storedCredentials.accessToken,
        storedCredentials.refreshToken,
      ),
    );
    return null;
  }

  const nextSession = createSession(
    accessToken,
    storedCredentials.refreshToken,
  );

  if (!nextSession.isAuthenticated) {
    return null;
  }

  persistCredentials({
    accessToken,
    refreshToken: storedCredentials.refreshToken,
  });
  publishSession(nextSession);
  return nextSession;
}

export function clearSession() {
  commitStoredCredentials({ accessToken: null, refreshToken: null }, true);

  publishSession(emptySession);
}

function readStoredSession() {
  const credentials = readStoredCredentials();
  return createSession(credentials.accessToken, credentials.refreshToken);
}

function synchronizeSessionFromStorage() {
  const credentials = readStoredCredentials();
  publishSession(
    createSession(credentials.accessToken, credentials.refreshToken),
  );
  return credentials;
}

function readStoredCredentials(): StoredCredentials {
  if (typeof window === 'undefined') {
    return { accessToken: null, refreshToken: null };
  }

  const pendingCredentials = readCredentialRecord(SESSION_WRITE_STORAGE_KEY);

  if (pendingCredentials) {
    // Complete an interrupted write, or converge with another tab that is
    // currently committing the same logical credential snapshot.
    commitStoredCredentials(pendingCredentials, true);
    return pendingCredentials;
  }

  const legacyCredentials = readLegacyCredentials();
  const versionedCredentials = readCredentialRecord(SESSION_STORAGE_KEY);

  if (!versionedCredentials) {
    return legacyCredentials;
  }

  const mirroredLegacyCredentials = readCredentialRecord(
    LEGACY_MIRROR_STORAGE_KEY,
  );

  if (
    mirroredLegacyCredentials &&
    !credentialsMatch(legacyCredentials, mirroredLegacyCredentials)
  ) {
    commitStoredCredentials(legacyCredentials, false);
    return legacyCredentials;
  }

  return versionedCredentials;
}

function readLegacyCredentials(): StoredCredentials {
  return {
    accessToken: window.localStorage.getItem(LEGACY_STORAGE_KEYS.accessToken),
    refreshToken: window.localStorage.getItem(LEGACY_STORAGE_KEYS.refreshToken),
  };
}

function readCredentialRecord(key: string): StoredCredentials | null {
  const storedCredentials = window.localStorage.getItem(key);

  if (!storedCredentials) {
    return null;
  }

  try {
    const parsed = JSON.parse(storedCredentials) as unknown;

    if (
      !isCredentialRecord(parsed) ||
      !isStoredCredentialValue(parsed.accessToken) ||
      !isStoredCredentialValue(parsed.refreshToken)
    ) {
      return null;
    }

    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
    };
  } catch {
    return null;
  }
}

function isCredentialRecord(
  value: unknown,
): value is Record<'accessToken' | 'refreshToken', unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.prototype.hasOwnProperty.call(value, 'accessToken') &&
    Object.prototype.hasOwnProperty.call(value, 'refreshToken')
  );
}

function isStoredCredentialValue(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function createSession(
  accessToken: string | null,
  refreshToken: string | null,
): Session {
  if (!accessToken) {
    return refreshToken ? { ...emptySession, refreshToken } : emptySession;
  }

  const payload = decodeAccessToken(accessToken);
  const isAuthenticated = Boolean(
    payload.memberId && payload.branchId && payload.role,
  );
  const ownerKey = isAuthenticated
    ? (`member:${payload.memberId}:branch:${payload.branchId}:role:${payload.role}` as SessionOwnerKey)
    : null;

  return {
    accessToken,
    branchId: isAuthenticated ? payload.branchId : null,
    isAuthenticated,
    memberId: isAuthenticated ? payload.memberId : null,
    memberName: isAuthenticated ? payload.name : null,
    ownerKey,
    refreshToken,
    role: isAuthenticated ? payload.role : null,
  };
}

function persistCredentials(credentials: StoredCredentials) {
  commitStoredCredentials(credentials, true);
}

function commitStoredCredentials(
  credentials: StoredCredentials,
  mirrorLegacy: boolean,
) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    SESSION_WRITE_STORAGE_KEY,
    JSON.stringify(credentials),
  );

  try {
    if (credentials.accessToken || credentials.refreshToken) {
      window.localStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify(credentials),
      );
    } else {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }

    if (mirrorLegacy) {
      mirrorLegacyCredentials(credentials);
    }

    recordLegacyMirror(credentials);
  } finally {
    window.localStorage.removeItem(SESSION_WRITE_STORAGE_KEY);
  }
}

// Keep already-open pre-redesign tabs coherent during the storage migration.
// The v1 record remains the canonical source for this application version.
function mirrorLegacyCredentials(credentials: StoredCredentials) {
  writeLegacyValue(LEGACY_STORAGE_KEYS.accessToken, credentials.accessToken);
  writeLegacyValue(LEGACY_STORAGE_KEYS.refreshToken, credentials.refreshToken);
  window.localStorage.removeItem(LEGACY_STORAGE_KEYS.branchId);
  window.localStorage.removeItem(LEGACY_STORAGE_KEYS.memberName);
  window.localStorage.removeItem(LEGACY_STORAGE_KEYS.role);
}

function writeLegacyValue(key: string, value: string | null) {
  if (value) {
    window.localStorage.setItem(key, value);
    return;
  }

  window.localStorage.removeItem(key);
}

function recordLegacyMirror(credentials: StoredCredentials) {
  window.localStorage.setItem(
    LEGACY_MIRROR_STORAGE_KEY,
    JSON.stringify(credentials),
  );
}

function publishSession(nextSession: Session) {
  if (sessionsMatch(currentSession, nextSession)) {
    return;
  }

  currentSession = nextSession;
  listeners.forEach((listener) => listener());
}

function sessionsMatch(left: Session, right: Session) {
  return (
    left.accessToken === right.accessToken &&
    left.refreshToken === right.refreshToken &&
    left.memberId === right.memberId &&
    left.branchId === right.branchId &&
    left.memberName === right.memberName &&
    left.role === right.role &&
    left.ownerKey === right.ownerKey &&
    left.isAuthenticated === right.isAuthenticated
  );
}

function credentialsMatch(left: StoredCredentials, right: StoredCredentials) {
  return (
    left.accessToken === right.accessToken &&
    left.refreshToken === right.refreshToken
  );
}

function attachStorageListener() {
  if (typeof window === 'undefined' || storageListenerAttached) {
    return;
  }

  window.addEventListener('storage', handleStorageChange);
  storageListenerAttached = true;
}

function handleStorageChange(event: StorageEvent) {
  if (event.key !== null && !watchedStorageKeys.has(event.key)) {
    return;
  }

  if (
    event.key === LEGACY_STORAGE_KEYS.accessToken ||
    event.key === LEGACY_STORAGE_KEYS.refreshToken
  ) {
    synchronizeFromLegacyStorage();
    return;
  }

  publishSession(readStoredSession());
}

function synchronizeFromLegacyStorage() {
  if (typeof window === 'undefined') {
    return;
  }

  const credentials = readLegacyCredentials();
  const versionedCredentials = readCredentialRecord(SESSION_STORAGE_KEY);
  const mirroredLegacyCredentials = readCredentialRecord(
    LEGACY_MIRROR_STORAGE_KEY,
  );

  if (
    !versionedCredentials ||
    !mirroredLegacyCredentials ||
    !credentialsMatch(credentials, versionedCredentials) ||
    !credentialsMatch(credentials, mirroredLegacyCredentials)
  ) {
    commitStoredCredentials(credentials, false);
  }

  publishSession(
    createSession(credentials.accessToken, credentials.refreshToken),
  );
}

attachStorageListener();
