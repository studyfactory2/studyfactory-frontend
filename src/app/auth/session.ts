import { useEffect, useState } from 'react';
import { MEMBER_ROLES, type MemberRole, type Session } from './types';

const ACCESS_TOKEN_KEY = 'studyfactory.accessToken';
const MEMBER_NAME_KEY = 'studyfactory.memberName';
const MEMBER_ROLE_KEY = 'studyfactory.memberRole';
const REFRESH_TOKEN_KEY = 'studyfactory.refreshToken';
const SESSION_CHANGED_EVENT = 'studyfactory:session-changed';

const emptySession: Session = {
  accessToken: null,
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

  writeValue(ACCESS_TOKEN_KEY, accessToken);
  notifySessionChanged();
}

export function saveSession(session: Session) {
  if (typeof window === 'undefined') {
    return;
  }

  writeValue(ACCESS_TOKEN_KEY, session.accessToken);
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

  const role = window.localStorage.getItem(MEMBER_ROLE_KEY);

  return {
    accessToken: window.localStorage.getItem(ACCESS_TOKEN_KEY),
    memberName: window.localStorage.getItem(MEMBER_NAME_KEY),
    refreshToken: window.localStorage.getItem(REFRESH_TOKEN_KEY),
    role: isMemberRole(role) ? role : null,
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
