import { useEffect, useState } from 'react';
import { decodeAccessToken } from './jwt';
import { MEMBER_ROLES, type MemberRole, type Session } from './types';

const ACCESS_TOKEN_KEY = 'studyfactory.accessToken';
const BRANCH_ID_KEY = 'studyfactory.branchId';
const MEMBER_NAME_KEY = 'studyfactory.memberName';
const MEMBER_ROLE_KEY = 'studyfactory.memberRole';
const REFRESH_TOKEN_KEY = 'studyfactory.refreshToken';
const SESSION_CHANGED_EVENT = 'studyfactory:session-changed';

const emptySession: Session = {
  accessToken: null,
  branchId: null,
  memberName: null,
  refreshToken: null,
  role: null,
};

export function useSession() {
  const [session, setSession] = useState<Session>(readSession);

  useEffect(() => {
    const refreshSession = () => setSession(readSession());
    window.addEventListener(SESSION_CHANGED_EVENT, refreshSession);
    window.addEventListener('storage', refreshSession);

    return () => {
      window.removeEventListener(SESSION_CHANGED_EVENT, refreshSession);
      window.removeEventListener('storage', refreshSession);
    };
  }, []);

  return session;
}

export function getAccessToken() {
  return readSession().accessToken;
}

export function getRefreshToken() {
  return readSession().refreshToken;
}

export function updateAccessToken(accessToken: string) {
  if (typeof window === 'undefined') {
    return;
  }

  const payload = decodeAccessToken(accessToken);

  writeValue(ACCESS_TOKEN_KEY, accessToken);

  if (payload.branchId !== null) {
    writeValue(BRANCH_ID_KEY, payload.branchId.toString());
  }

  if (payload.name !== null) {
    writeValue(MEMBER_NAME_KEY, payload.name);
  }

  if (payload.role !== null) {
    writeValue(MEMBER_ROLE_KEY, payload.role);
  }

  notifySessionChanged();
}

export function saveSession(session: Session) {
  if (typeof window === 'undefined') {
    return;
  }

  writeValue(ACCESS_TOKEN_KEY, session.accessToken);
  writeValue(BRANCH_ID_KEY, session.branchId?.toString() ?? null);
  writeValue(REFRESH_TOKEN_KEY, session.refreshToken);
  writeValue(MEMBER_NAME_KEY, session.memberName);
  writeValue(MEMBER_ROLE_KEY, session.role);
  notifySessionChanged();
}

export function clearSession() {
  saveSession(emptySession);
}

function readSession(): Session {
  if (typeof window === 'undefined') {
    return emptySession;
  }

  const accessToken = window.localStorage.getItem(ACCESS_TOKEN_KEY);
  const payload = accessToken ? decodeAccessToken(accessToken) : null;
  const role = window.localStorage.getItem(MEMBER_ROLE_KEY);
  const branchId = Number(window.localStorage.getItem(BRANCH_ID_KEY));

  return {
    accessToken,
    branchId:
      Number.isInteger(branchId) && branchId > 0
        ? branchId
        : (payload?.branchId ?? null),
    memberName:
      window.localStorage.getItem(MEMBER_NAME_KEY) ?? payload?.name ?? null,
    refreshToken: window.localStorage.getItem(REFRESH_TOKEN_KEY),
    role: isMemberRole(role) ? role : (payload?.role ?? null),
  };
}

function isMemberRole(value: string | null): value is MemberRole {
  return value !== null && MEMBER_ROLES.includes(value as MemberRole);
}

function writeValue(key: string, value: string | null) {
  if (value) {
    window.localStorage.setItem(key, value);
    return;
  }

  window.localStorage.removeItem(key);
}

function notifySessionChanged() {
  window.dispatchEvent(new Event(SESSION_CHANGED_EVENT));
}
