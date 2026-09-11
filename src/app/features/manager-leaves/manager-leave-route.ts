export const MANAGER_LEAVE_ROUTE_VIEW = 'member-leave';

export type ManagerLeaveRouteContext = {
  branchId: number | null;
  dateKey: string;
  memberId: number;
  slot: number;
};

export type ManagerLeaveRouteTarget = {
  branchId?: number;
  dateKey: string;
  memberId: number;
  slot: number;
};

export function createManagerLeaveSearch(target: ManagerLeaveRouteTarget) {
  const searchParams = new URLSearchParams({
    view: MANAGER_LEAVE_ROUTE_VIEW,
    memberId: String(target.memberId),
    date: target.dateKey,
    slot: String(target.slot),
  });

  if (target.branchId !== undefined) {
    searchParams.set('branchId', String(target.branchId));
  }

  return searchParams.toString();
}

export function readManagerLeaveRoute(
  searchParams: URLSearchParams,
): ManagerLeaveRouteContext | null {
  if (searchParams.get('view') !== MANAGER_LEAVE_ROUTE_VIEW) {
    return null;
  }

  const dateKey = toDateKey(searchParams.get('date'));
  const memberId = toPositiveInteger(searchParams.get('memberId'));
  const slot = toAttendanceSlot(searchParams.get('slot'));

  if (dateKey === null || memberId === null || slot === null) {
    return null;
  }

  return {
    branchId: toPositiveInteger(searchParams.get('branchId')),
    dateKey,
    memberId,
    slot,
  };
}

export function removeManagerLeaveSearch(searchParams: URLSearchParams) {
  const nextSearchParams = new URLSearchParams(searchParams);

  ['view', 'branchId', 'memberId', 'date', 'slot'].forEach((key) => {
    nextSearchParams.delete(key);
  });

  return nextSearchParams;
}

function toPositiveInteger(value: string | null) {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function toAttendanceSlot(value: string | null) {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 7 ? parsed : null;
}

function toDateKey(value: string | null) {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() + 1 === month &&
    parsed.getUTCDate() === day
    ? value
    : null;
}
