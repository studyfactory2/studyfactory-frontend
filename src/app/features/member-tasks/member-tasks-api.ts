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

export type MemberTaskCalendarDay = {
  date: string;
  totalCount: number;
  completedCount: number;
};

export type MemberTaskCalendar = {
  memberId: number;
  month: string;
  days: MemberTaskCalendarDay[];
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
// Calendar responses have no revision. Track accepted day snapshots so a GET
// started before a save/reconciliation cannot publish stale month counts.
const calendarGenerations = new Map<string, number>();
const calendarListeners = new Set<
  (ownerKey: SessionOwnerKey, month: string) => void
>();
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
    calendarGenerations.clear();
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

export async function fetchMemberTaskCalendar(
  month: string,
  memberId: number,
  ownerKey: SessionOwnerKey,
  signal?: AbortSignal,
): Promise<MemberTaskCalendar> {
  if (!isPositiveInteger(memberId) || !taskMonthLength(month)) {
    throw new ApiRequestError('할 일을 조회할 회원과 달을 확인해 주세요.', 400);
  }

  assertSession(memberId, ownerKey);
  const generation = sessionGeneration;
  const key = `${ownerKey}:${month}`;
  // Usually one request; a newer day snapshot during the request requires a
  // fresh server read. Bound retries rather than looping while editing rapidly.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    signal?.throwIfAborted();
    assertSession(memberId, ownerKey, generation);
    const monthGeneration = calendarGenerations.get(key) ?? 0;
    const response = await apiRequest<unknown>(
      `/api/member-tasks/me/calendar?${new URLSearchParams({ month })}`,
      { expectedMemberId: memberId, signal },
    );
    signal?.throwIfAborted();
    assertSession(memberId, ownerKey, generation);

    if (!isMemberTaskCalendar(response, memberId, month)) {
      throw new ApiRequestError(
        '달력의 할 일 개수를 확인할 수 없습니다. 다시 불러와 주세요.',
        502,
      );
    }
    if (monthGeneration === (calendarGenerations.get(key) ?? 0)) {
      return response;
    }
  }

  throw new ApiRequestError(
    '할 일이 변경되어 달력을 다시 확인해야 합니다. 새로고침해 주세요.',
    409,
  );
}

export function subscribeMemberTaskCalendarChanges(
  listener: (ownerKey: SessionOwnerKey, month: string) => void,
) {
  calendarListeners.add(listener);
  return () => {
    calendarListeners.delete(listener);
  };
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
  if (!isPositiveInteger(memberId) || !isMemberTaskDate(date)) {
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
  const month = date.slice(0, 7);
  const calendarKey = `${ownerKey}:${month}`;
  calendarGenerations.set(
    calendarKey,
    (calendarGenerations.get(calendarKey) ?? 0) + 1,
  );
  calendarListeners.forEach((listener) => listener(ownerKey, month));
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

function isMemberTaskCalendar(
  value: unknown,
  memberId: number,
  month: string,
): value is MemberTaskCalendar {
  if (
    !isRecord(value) ||
    value.memberId !== memberId ||
    value.month !== month ||
    !Array.isArray(value.days) ||
    value.days.length !== taskMonthLength(month)
  ) {
    return false;
  }

  return value.days.every(
    (day: unknown, index: number) =>
      isRecord(day) &&
      day.date === `${month}-${String(index + 1).padStart(2, '0')}` &&
      isNonnegativeInteger(day.totalCount) &&
      isNonnegativeInteger(day.completedCount) &&
      day.completedCount <= day.totalCount,
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

export function isMemberTaskDate(value: string) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.exec(value);
  if (!match) return false;
  const day = Number(match[3]);
  return day <= taskMonthLength(value.slice(0, 7));
}

function taskMonthLength(value: string) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value);
  if (!match) return 0;
  const year = Number(match[1]);
  if (year < 1) return 0;
  const month = Number(match[2]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return days[month - 1];
}
