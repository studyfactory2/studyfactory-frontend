import { apiRequest, ApiRequestError } from '../../core/api/api-client';
import {
  getCurrentSession,
  getSessionCredentials,
  type SessionOwnerKey,
} from '../../core/session';
import { subscribeSession } from '../../core/session/session-store';

export type MemberTaskItem = {
  id: number;
  content: string;
  completed: boolean;
  sortOrder: number;
};

export type MemberTaskDay = {
  memberId: number;
  date: string;
  revision: number;
  items: MemberTaskItem[];
};

export type MemberTaskAction =
  | { type: 'add'; content: string; clientRequestId: string }
  | { type: 'update'; id: number; content?: string; completed?: boolean }
  | { type: 'delete'; id: number };

export const memberTaskQueryKeys = {
  day: (ownerKey: SessionOwnerKey, date: string) =>
    ['private', ownerKey, 'memberTasks', 'day', date] as const,
  calendar: (ownerKey: SessionOwnerKey, month: string) =>
    ['private', ownerKey, 'memberTasks', 'calendar', month] as const,
};

// One monotonic snapshot per date, scoped to the current login lifetime. A slow
// GET must not replace a newer save, including when another Home view is open.
const latestDays = new Map<string, MemberTaskDay>();
let sessionGeneration = 0;
let observedOwnerKey = getCurrentSession().ownerKey;
let observedRefreshToken = getCurrentSession().refreshToken;

// The owner key deliberately survives token refresh. Observe logout and login
// as well, so a response from an earlier login cannot enter the new login's cache.
subscribeSession(() => {
  const session = getCurrentSession();
  if (
    session.ownerKey !== observedOwnerKey ||
    session.refreshToken !== observedRefreshToken
  ) {
    sessionGeneration += 1;
    observedOwnerKey = session.ownerKey;
    observedRefreshToken = session.refreshToken;
    latestDays.clear();
  }
});

export function fetchMemberTaskDay(
  date: string,
  memberId: number,
  ownerKey: SessionOwnerKey,
): Promise<MemberTaskDay> {
  return requestDay(
    `/api/member-tasks/me?${new URLSearchParams({ date })}`,
    memberId,
    date,
    ownerKey,
  );
}

export function saveMemberTaskAction(
  memberId: number,
  date: string,
  expectedRevision: number,
  action: MemberTaskAction,
  ownerKey: SessionOwnerKey,
): Promise<MemberTaskDay> {
  if (!isNonnegativeInteger(expectedRevision)) {
    throw new ApiRequestError(
      '최신 할 일을 확인한 뒤 다시 저장해 주세요.',
      400,
    );
  }

  const base = '/api/member-tasks/me/items';
  const revision = { date, expectedRevision };
  let path: string;
  let options: RequestInit;

  switch (action.type) {
    case 'add':
      path = base;
      options = {
        method: 'POST',
        body: JSON.stringify({
          ...revision,
          content: action.content,
          clientRequestId: action.clientRequestId,
        }),
      };
      break;
    case 'update':
      assertItemId(action.id);
      path = `${base}/${action.id}`;
      options = {
        method: 'PATCH',
        body: JSON.stringify({
          ...revision,
          content: action.content,
          completed: action.completed,
        }),
      };
      break;
    case 'delete':
      assertItemId(action.id);
      path = `${base}/${action.id}?${new URLSearchParams({
        date,
        expectedRevision: String(expectedRevision),
      })}`;
      options = { method: 'DELETE' };
  }

  return requestDay(path, memberId, date, ownerKey, options);
}

async function requestDay(
  path: string,
  memberId: number,
  date: string,
  ownerKey: SessionOwnerKey,
  options: RequestInit = {},
): Promise<MemberTaskDay> {
  if (!isPositiveInteger(memberId) || !isTaskDate(date)) {
    throw new ApiRequestError(
      '할 일을 기록할 회원과 날짜를 확인해 주세요.',
      400,
    );
  }

  assertSession(memberId, ownerKey);
  const generation = sessionGeneration;
  const response = await apiRequest<unknown>(path, {
    ...options,
    expectedMemberId: memberId,
  });
  assertSession(memberId, ownerKey, generation);

  if (!isMemberTaskDay(response, memberId, date)) {
    throw new ApiRequestError(
      '할 일 응답을 확인할 수 없습니다. 입력 내용은 유지됩니다.',
      502,
    );
  }

  const key = `${ownerKey}:${date}`;
  const previous = latestDays.get(key);
  if (previous && previous.revision >= response.revision) return previous;
  latestDays.set(key, response);
  return response;
}

function assertSession(
  memberId: number,
  ownerKey: SessionOwnerKey,
  generation?: number,
) {
  // Read storage before checking the in-memory session: another tab may have
  // switched accounts before its storage event reaches this tab.
  getSessionCredentials();
  const session = getCurrentSession();
  if (
    !ownerKey ||
    !session.isAuthenticated ||
    session.memberId !== memberId ||
    session.ownerKey !== ownerKey ||
    session.role !== 'MEMBER' ||
    (generation !== undefined && generation !== sessionGeneration)
  ) {
    throw new ApiRequestError(
      '로그인 정보가 변경되었습니다. 다시 로그인해 할 일을 확인해 주세요.',
      409,
    );
  }
}

function isMemberTaskDay(
  value: unknown,
  memberId: number,
  date: string,
): value is MemberTaskDay {
  if (!isRecord(value)) return false;
  if (
    value.memberId !== memberId ||
    value.date !== date ||
    !isNonnegativeInteger(value.revision) ||
    !Array.isArray(value.items) ||
    !value.items.every(isMemberTaskItem)
  ) {
    return false;
  }

  return (
    new Set(value.items.map((item) => item.id)).size === value.items.length
  );
}

function isMemberTaskItem(value: unknown): value is MemberTaskItem {
  return (
    isRecord(value) &&
    isPositiveInteger(value.id) &&
    typeof value.content === 'string' &&
    value.content.trim().length > 0 &&
    value.content.length <= 2000 &&
    typeof value.completed === 'boolean' &&
    isNonnegativeInteger(value.sortOrder)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPositiveInteger(value: unknown): value is number {
  return isNonnegativeInteger(value) && value > 0;
}

function isNonnegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function assertItemId(value: number) {
  if (!isPositiveInteger(value)) {
    throw new ApiRequestError('변경할 할 일 항목을 확인해 주세요.', 400);
  }
}

function isTaskDate(value: string) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  if (year < 1) return false;
  const month = Number(match[2]);
  const day = Number(match[3]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= days[month - 1];
}
