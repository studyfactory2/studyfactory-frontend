import {
  clearSession,
  decodeAccessToken,
  getCurrentSession,
  getSessionCredentials,
  updateAccessToken,
} from '../session';
import type { MemberRole } from '../session';
import { appConfig } from '../config/environment';

type ApiRequestOptions = RequestInit & {
  expectedMemberId?: number | null;
};

type SessionSnapshot = {
  accessToken: string | null;
  branchId: number | null;
  memberId: number | null;
  refreshToken: string | null;
  role: MemberRole | null;
};

type ReissueResult =
  | { accessToken: string; status: 'reissued' }
  | { status: 'failed' | 'session-changed' };

export class ApiRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
  }
}

export async function apiRequest<TResponse>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<TResponse> {
  const { expectedMemberId = null, ...requestOptions } = options;
  const session = snapshotSession();

  assertExpectedMember(session, expectedMemberId);

  let response = await performRequest(
    path,
    requestOptions,
    session.accessToken,
  );

  // Expired access token: reissue silently once, then retry the request.
  if (
    response.status === 401 &&
    session.accessToken &&
    !path.startsWith('/api/auth/')
  ) {
    const reissueResult = await requestReissue(session, expectedMemberId);

    if (reissueResult.status === 'reissued') {
      if (!sessionMatchesReissuedToken(session, reissueResult.accessToken)) {
        throw sessionChangedError();
      }

      response = await performRequest(
        path,
        requestOptions,
        reissueResult.accessToken,
      );
    } else if (reissueResult.status === 'session-changed') {
      throw sessionChangedError();
    } else if (sessionMatchesSnapshot(session)) {
      clearSession();
    }
  }

  if (!response.ok) {
    throw new ApiRequestError(
      await resolveErrorMessage(response),
      response.status,
    );
  }

  if (response.status === 204) {
    return null as TResponse;
  }

  return response.json() as Promise<TResponse>;
}

function performRequest(
  path: string,
  options: RequestInit,
  accessToken: string | null,
) {
  const headers = new Headers(options.headers);

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  return fetch(toApiUrl(path), {
    ...options,
    cache: 'no-store',
    headers,
  });
}

// Concurrent 401s from the same token pair share one identity-bound reissue.
const reissuePromises = new Map<string, Promise<ReissueResult>>();

function requestReissue(
  session: SessionSnapshot,
  expectedMemberId: number | null,
) {
  const promiseKey = `${session.accessToken ?? ''}\u0000${session.refreshToken ?? ''}`;
  const existingPromise = reissuePromises.get(promiseKey);

  if (existingPromise) {
    return existingPromise;
  }

  const promise = reissueAccessToken(session, expectedMemberId).finally(() => {
    if (reissuePromises.get(promiseKey) === promise) {
      reissuePromises.delete(promiseKey);
    }
  });
  reissuePromises.set(promiseKey, promise);
  return promise;
}

async function reissueAccessToken(
  session: SessionSnapshot,
  expectedMemberId: number | null,
): Promise<ReissueResult> {
  if (!session.refreshToken) {
    return { status: 'failed' };
  }

  if (!sessionMatchesSnapshot(session)) {
    return { status: 'session-changed' };
  }

  try {
    const response = await fetch(toApiUrl('/api/auth/token/reissue'), {
      body: JSON.stringify({ refreshToken: session.refreshToken }),
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    if (!sessionMatchesSnapshot(session)) {
      return { status: 'session-changed' };
    }

    if (!response.ok) {
      return { status: 'failed' };
    }

    const data = (await response.json()) as { accessToken?: string };

    if (!data.accessToken) {
      return { status: 'failed' };
    }

    const reissuedPayload = decodeAccessToken(data.accessToken);
    const boundMemberId = expectedMemberId ?? session.memberId;

    if (
      (boundMemberId !== null && reissuedPayload.memberId !== boundMemberId) ||
      (session.branchId !== null &&
        reissuedPayload.branchId !== session.branchId) ||
      (session.role !== null && reissuedPayload.role !== session.role)
    ) {
      return { status: 'failed' };
    }

    if (!sessionMatchesSnapshot(session)) {
      return { status: 'session-changed' };
    }

    if (
      !updateAccessToken(data.accessToken, {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      })
    ) {
      return {
        status: sessionMatchesSnapshot(session) ? 'failed' : 'session-changed',
      };
    }

    return { accessToken: data.accessToken, status: 'reissued' };
  } catch {
    return {
      status: sessionMatchesSnapshot(session) ? 'failed' : 'session-changed',
    };
  }
}

function snapshotSession(): SessionSnapshot {
  const credentials = getSessionCredentials();
  const currentSession = getCurrentSession();

  return {
    accessToken: credentials.accessToken,
    branchId: currentSession.branchId,
    memberId: currentSession.memberId,
    refreshToken: credentials.refreshToken,
    role: currentSession.role,
  };
}

function assertExpectedMember(
  session: SessionSnapshot,
  expectedMemberId: number | null,
) {
  if (expectedMemberId !== null && session.memberId !== expectedMemberId) {
    throw sessionChangedError();
  }
}

function sessionMatchesSnapshot(session: SessionSnapshot) {
  const credentials = getSessionCredentials();

  return (
    credentials.accessToken === session.accessToken &&
    credentials.refreshToken === session.refreshToken
  );
}

function sessionMatchesReissuedToken(
  session: SessionSnapshot,
  reissuedToken: string,
) {
  const credentials = getSessionCredentials();

  return (
    credentials.accessToken === reissuedToken &&
    credentials.refreshToken === session.refreshToken
  );
}

function sessionChangedError() {
  return new ApiRequestError(
    '로그인 정보가 변경되어 요청을 안전하게 중단했습니다.',
    409,
  );
}

function toApiUrl(path: string) {
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${appConfig.apiBaseUrl}${normalizedPath}`;
}

async function resolveErrorMessage(response: Response) {
  const fallbackMessage = '요청을 처리하지 못했습니다.';
  const body = await response.text();

  if (!body) {
    return fallbackMessage;
  }

  try {
    const error = JSON.parse(body) as {
      detail?: string;
      error?: string;
      message?: string;
      reason?: string;
    };

    return (
      error.message ||
      error.reason ||
      error.detail ||
      error.error ||
      fallbackMessage
    );
  } catch {
    return body;
  }
}
