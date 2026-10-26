import { apiRequest, ApiRequestError } from '../../core/api/api-client';
import { getCurrentSession, type SessionOwnerKey } from '../../core/session';

export type PlanGroup = 'PERIODS_1_2' | 'PERIODS_3_5' | 'PERIODS_6_7';
export type SharedPlanItem = {
  id: number;
  source: 'LEGACY' | 'GROUP';
  dayIndex: number;
  periodIndex: number | null;
  group: PlanGroup | null;
  content: string;
  done: boolean;
  sortOrder: number;
};
export type SharedPlanWeek = {
  memberId: number;
  branchId: number;
  weekStartDate: string;
  revision: number;
  legacySaveProtected: boolean;
  goal: string;
  groups: { group: PlanGroup; items: SharedPlanItem[] }[];
  ungroupedItems: SharedPlanItem[];
};
export type SharedPlanAction =
  | {
      type: 'add';
      dayIndex: number;
      group: PlanGroup;
      content: string;
      clientRequestId: string;
    }
  | {
      type: 'break';
      dayIndex: number;
      periodIndex: 100 | 101;
      content: string;
      clientRequestId: string;
    }
  | {
      type: 'update';
      source: SharedPlanItem['source'];
      id: number;
      content?: string;
      done?: boolean;
    }
  | { type: 'delete'; source: SharedPlanItem['source']; id: number }
  | { type: 'goal'; goal: string };

export const sharedPlanQueryKeys = {
  week: (ownerKey: SessionOwnerKey, week: string) =>
    ['private', ownerKey, 'sharedPlans', 'week', week] as const,
  managedWeek: (
    ownerKey: SessionOwnerKey,
    branchId: number,
    memberId: number,
    week: string,
  ) =>
    [
      'private',
      ownerKey,
      'sharedPlans',
      'managed',
      branchId,
      memberId,
      week,
    ] as const,
};

const periodsByGroup: Record<PlanGroup, number[]> = {
  PERIODS_1_2: [0, 1],
  PERIODS_3_5: [2, 3, 4],
  PERIODS_6_7: [5, 6],
};
export const allSharedPlanItems = (week: SharedPlanWeek) => [
  ...week.groups.flatMap((group) => group.items),
  ...week.ungroupedItems,
];
export const sharedItemAppliesToPeriod = (
  item: SharedPlanItem,
  periodIndex: number,
) =>
  item.source === 'GROUP' && item.group
    ? periodsByGroup[item.group].includes(periodIndex)
    : item.periodIndex === periodIndex;

// A late GET must not replace a newer mutation snapshot in another mounted view.
const latestWeeks = new Map<string, SharedPlanWeek>();

function isSharedPlanItem(value: unknown): value is SharedPlanItem {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  // Legacy day/period values can be outside today's supported range. Validate
  // their representation only so old records remain visible and recoverable.
  return (
    Number.isSafeInteger(item.id) &&
    Number(item.id) > 0 &&
    (item.source === 'LEGACY' || item.source === 'GROUP') &&
    Number.isSafeInteger(item.dayIndex) &&
    (item.periodIndex === null || Number.isSafeInteger(item.periodIndex)) &&
    (item.group === null ||
      (typeof item.group === 'string' &&
        Object.hasOwn(periodsByGroup, item.group))) &&
    typeof item.content === 'string' &&
    typeof item.done === 'boolean' &&
    Number.isSafeInteger(item.sortOrder)
  );
}

async function requestWeek(
  path: string,
  memberId: number,
  week: string,
  operatorId: number,
  options: RequestInit = {},
  branchId?: number,
) {
  const ownerKey = getCurrentSession().ownerKey;
  const response = await apiRequest<SharedPlanWeek>(path, {
    ...options,
    expectedMemberId: operatorId,
  });
  if (!ownerKey || getCurrentSession().ownerKey !== ownerKey) {
    throw new ApiRequestError(
      '로그인 정보가 변경되었습니다. 다시 로그인해 계획을 확인해 주세요.',
      409,
    );
  }
  if (
    !response ||
    response.memberId !== memberId ||
    response.weekStartDate !== week ||
    (branchId !== undefined && response.branchId !== branchId) ||
    !Number.isSafeInteger(response.revision) ||
    response.revision < 0 ||
    typeof response.goal !== 'string' ||
    !Array.isArray(response.groups) ||
    !Array.isArray(response.ungroupedItems) ||
    response.groups.length !== 3 ||
    new Set(response.groups.map((group) => group?.group)).size !== 3 ||
    response.groups.some(
      (group) =>
        !group ||
        !Object.hasOwn(periodsByGroup, group.group) ||
        !Array.isArray(group.items) ||
        !group.items.every(isSharedPlanItem),
    ) ||
    !response.ungroupedItems.every(isSharedPlanItem)
  ) {
    throw new ApiRequestError(
      '계획 응답을 확인할 수 없습니다. 입력 내용은 유지됩니다.',
      502,
    );
  }
  const key = `${ownerKey}:${memberId}:${response.branchId}:${week}`;
  const previous = latestWeeks.get(key);
  if (previous && previous.revision > response.revision) return previous;
  latestWeeks.set(key, response);
  return response;
}

export function fetchSharedPlanWeek(
  weekStartDate: string,
  expectedMemberId: number,
) {
  return requestWeek(
    `/api/weekly-plans/shared/me?${new URLSearchParams({ weekStartDate })}`,
    expectedMemberId,
    weekStartDate,
    expectedMemberId,
  );
}
export function fetchManagedSharedPlanWeek(
  targetMemberId: number,
  targetBranchId: number,
  weekStartDate: string,
  expectedMemberId: number,
) {
  return requestWeek(
    `/api/weekly-plans/shared/members/${targetMemberId}?${new URLSearchParams({ weekStartDate })}`,
    targetMemberId,
    weekStartDate,
    expectedMemberId,
    {},
    targetBranchId,
  );
}

export function saveSharedPlanAction(
  memberId: number,
  weekStartDate: string,
  expectedRevision: number,
  action: SharedPlanAction,
) {
  const base = '/api/weekly-plans/shared/me';
  const revision = { weekStartDate, expectedRevision };
  let path: string;
  let options: RequestInit;
  switch (action.type) {
    case 'add':
      path = `${base}/items`;
      options = {
        method: 'POST',
        body: JSON.stringify({
          ...revision,
          dayIndex: action.dayIndex,
          group: action.group,
          content: action.content,
          clientRequestId: action.clientRequestId,
        }),
      };
      break;
    case 'break':
      path = `${base}/break-items`;
      options = {
        method: 'POST',
        body: JSON.stringify({
          ...revision,
          dayIndex: action.dayIndex,
          periodIndex: action.periodIndex,
          content: action.content,
          clientRequestId: action.clientRequestId,
        }),
      };
      break;
    case 'goal':
      path = `${base}/goal`;
      options = {
        method: 'PATCH',
        body: JSON.stringify({ ...revision, goal: action.goal }),
      };
      break;
    case 'update':
      path = `${base}/items/${action.source}/${action.id}`;
      options = {
        method: 'PATCH',
        body: JSON.stringify({
          ...revision,
          content: action.content,
          done: action.done,
        }),
      };
      break;
    case 'delete':
      path = `${base}/items/${action.source}/${action.id}?${new URLSearchParams(
        {
          weekStartDate,
          expectedRevision: String(expectedRevision),
        },
      )}`;
      options = { method: 'DELETE' };
  }
  return requestWeek(path, memberId, weekStartDate, memberId, options);
}
