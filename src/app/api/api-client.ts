import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  updateAccessToken,
} from '../auth/session';
import { appConfig } from '../config/environment';

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
  options: RequestInit = {},
): Promise<TResponse> {
  const hadAccessToken = Boolean(getAccessToken());
  let response = await performRequest(path, options);

  // Expired access token: reissue silently once, then retry the request.
  if (
    response.status === 401 &&
    hadAccessToken &&
    !path.startsWith('/api/auth/')
  ) {
    const reissuedToken = await requestReissue();

    if (reissuedToken) {
      response = await performRequest(path, options);
    } else {
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

function performRequest(path: string, options: RequestInit) {
  const headers = new Headers(options.headers);
  const accessToken = getAccessToken();

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

// One shared reissue promise so concurrent 401s trigger a single reissue call.
let reissuePromise: Promise<string | null> | null = null;

function requestReissue() {
  reissuePromise ??= reissueAccessToken().finally(() => {
    reissuePromise = null;
  });

  return reissuePromise;
}

async function reissueAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    return null;
  }

  try {
    const response = await fetch(toApiUrl('/api/auth/token/reissue'), {
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { accessToken?: string };

    if (!data.accessToken) {
      return null;
    }

    updateAccessToken(data.accessToken);
    return data.accessToken;
  } catch {
    return null;
  }
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
