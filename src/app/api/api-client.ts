import { getAccessToken } from '../auth/session';
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
  const headers = new Headers(options.headers);
  const accessToken = getAccessToken();

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(toApiUrl(path), {
    ...options,
    cache: 'no-store',
    headers,
  });

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
