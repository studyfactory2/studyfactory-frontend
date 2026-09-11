import { apiRequest, ApiRequestError } from '../../core/api/api-client';
import {
  getMonthEndKey,
  getMonthStartKey,
  getWeekdayName,
  type WeekdayName,
} from '../../shared/lib/seoul-date';

export type MemberLeavePlanSource = 'FIXED_LEAVE' | 'LEAVE' | 'SPECIAL_LEAVE';

export type LeaveType = 'AFTERNOON' | 'FULL' | 'MORNING';

export type MemberLeavePlanResponse = {
  id: number | null;
  leaveDate: string;
  leaveType: LeaveType | null;
  label: string;
  source: MemberLeavePlanSource | string;
  slots: string | null;
};

export type LeaveResponse = {
  id: number;
  memberId: number;
  branchId: number;
  leaveDate: string;
  leaveType: LeaveType;
  createdAt: string;
  updatedAt: string;
};

export function fetchMyLeavePlan(
  year: number,
  month: number,
  expectedMemberId: number,
) {
  const query = new URLSearchParams({
    month: String(month),
    year: String(year),
  });

  return apiRequest<MemberLeavePlanResponse[]>(`/api/leaves/me/plan?${query}`, {
    expectedMemberId,
  });
}

export function createMyLeave(
  leaveDate: string,
  leaveType: LeaveType,
  expectedMemberId: number,
) {
  return apiRequest<LeaveResponse>('/api/leaves', {
    body: JSON.stringify({ leaveDate, leaveType }),
    expectedMemberId,
    method: 'POST',
  });
}

/**
 * This self-service UI only supplies ids returned by `/me/plan`. The server
 * enforces ownership for MEMBER and STAFF callers; ADMIN retains its explicit
 * management capability. Office-assigned leaves return a null id and are never
 * deletable here.
 */
export function deleteMyLeave(leaveId: number, expectedMemberId: number) {
  return apiRequest<null>(`/api/leaves/${leaveId}`, {
    expectedMemberId,
    method: 'DELETE',
  });
}

export type DailyLeaveStatusResponse = {
  memberId: number;
  branchId: number;
  seatNumber: number | null;
  name: string;
  branch: string | null;
  leaveDate: string;
  leaveType: LeaveType | null;
  /** When the member asked for it. The morning drink count turns on this. */
  createdAt: string;
  label: string | null;
  source: MemberLeavePlanSource | string;
  /** Whether the request was created from 08:00 (inclusive) to 09:00 in Seoul. */
  requestedAfterEight: boolean | null;
};

export type MonthlyLeaveCalendarResponse = {
  leaveDate: string;
  label: string;
  source: MemberLeavePlanSource | string;
  slots: string;
};

export type SpecialLeaveResponse = {
  id: number;
  memberId: number;
  branchId: number;
  leaveDate: string;
  slots: string;
  reason: string;
  customReason: string | null;
  recurring: boolean;
  createdByMemberId: number;
  createdAt: string;
  updatedAt: string;
};

export type SpecialLeaveCreateInput = {
  customReason: string | null;
  leaveDates: string[];
  reason: string;
  slots: number[];
};

export type FixedLeaveDayOfWeek = WeekdayName;

export type FixedLeaveResponse = {
  id: number;
  memberId: number;
  branchId: number;
  dayOfWeek: FixedLeaveDayOfWeek;
  slots: string;
  reason: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FixedLeaveManagementResponse = Omit<
  FixedLeaveResponse,
  'active'
> & {
  memberName: string;
};

export type FixedLeaveCreateInput = {
  /** The backend stores only this date's weekday, not an effective date. */
  leaveDate: string;
  reason: string;
  slots: number[];
};

export type FixedLeaveGenerationResponse = {
  startDate: string;
  endDate: string;
  createdCount: number;
};

/**
 * Everyone's leave for one day.
 *
 * The server limits this manager read to the caller's branch for STAFF (ADMIN
 * may select a branch). Sending the session branch and validating every row
 * remain useful client-side contract checks.
 */
export async function fetchDailyLeaveStatuses(
  date: string,
  branchId: number,
  expectedMemberId: number,
) {
  const query = new URLSearchParams({ branchId: String(branchId), date });
  const response = await apiRequest<DailyLeaveStatusResponse[]>(
    `/api/leaves/daily-status?${query}`,
    { expectedMemberId },
  );

  if (
    response.some((row) => row.branchId !== branchId || row.leaveDate !== date)
  ) {
    throw new ApiRequestError(
      '다른 지점 또는 날짜의 휴무 목록을 받았습니다.',
      409,
    );
  }

  return response;
}

export async function fetchMemberMonthlyLeaves(
  targetMemberId: number,
  year: number,
  month: number,
  expectedMemberId: number,
) {
  const query = new URLSearchParams({
    memberId: String(targetMemberId),
    month: String(month),
    year: String(year),
  });
  const response = await apiRequest<MonthlyLeaveCalendarResponse[]>(
    `/api/leaves/monthly-calendar?${query}`,
    { expectedMemberId },
  );
  const monthStart = getMonthStartKey(year, month);
  const monthEnd = getMonthEndKey(year, month);

  if (
    response.some(
      (row) =>
        !isDateKey(row.leaveDate) ||
        row.leaveDate < monthStart ||
        row.leaveDate > monthEnd,
    )
  ) {
    throw new ApiRequestError('다른 달의 휴무 달력을 받았습니다.', 409);
  }

  return response;
}

export async function fetchMemberSpecialLeaves(
  targetMemberId: number,
  branchId: number,
  expectedMemberId: number,
) {
  const query = new URLSearchParams({ memberId: String(targetMemberId) });
  const response = await apiRequest<SpecialLeaveResponse[]>(
    `/api/leaves/special?${query}`,
    { expectedMemberId },
  );

  if (
    response.some(
      (row) => row.memberId !== targetMemberId || row.branchId !== branchId,
    )
  ) {
    throw new ApiRequestError('다른 회원의 특별 휴무를 받았습니다.', 409);
  }

  return response;
}

export async function createMemberSpecialLeaves(
  targetMemberId: number,
  branchId: number,
  input: SpecialLeaveCreateInput,
  expectedMemberId: number,
) {
  const response = await apiRequest<SpecialLeaveResponse[]>(
    '/api/leaves/special',
    {
      body: JSON.stringify({
        ...input,
        memberId: targetMemberId,
        recurring: false,
      }),
      expectedMemberId,
      method: 'POST',
    },
  );
  const requestedDates = new Set(input.leaveDates);

  if (
    response.some(
      (row) =>
        row.memberId !== targetMemberId ||
        row.branchId !== branchId ||
        row.recurring ||
        !requestedDates.has(row.leaveDate),
    )
  ) {
    throw new ApiRequestError('다른 회원의 특별 휴무 응답을 받았습니다.', 409);
  }

  return response;
}

export function deleteMemberSpecialLeaveSlot(
  specialLeaveId: number,
  slot: number,
  expectedMemberId: number,
) {
  return apiRequest<null>(
    `/api/leaves/special/${specialLeaveId}/slots/${slot}`,
    { expectedMemberId, method: 'DELETE' },
  );
}

export async function fetchFixedLeaves(
  branchId: number,
  expectedMemberId: number,
) {
  const query = new URLSearchParams({ branchId: String(branchId) });
  const response = await apiRequest<FixedLeaveManagementResponse[]>(
    `/api/leaves/fixed?${query}`,
    { expectedMemberId },
  );

  if (response.some((row) => row.branchId !== branchId)) {
    throw new ApiRequestError('다른 지점의 고정 휴무를 받았습니다.', 409);
  }

  return response;
}

export async function createMemberFixedLeave(
  targetMemberId: number,
  branchId: number,
  input: FixedLeaveCreateInput,
  expectedMemberId: number,
) {
  const response = await apiRequest<FixedLeaveResponse>('/api/leaves/fixed', {
    body: JSON.stringify({ ...input, memberId: targetMemberId }),
    expectedMemberId,
    method: 'POST',
  });

  if (
    response.memberId !== targetMemberId ||
    response.branchId !== branchId ||
    !response.active ||
    response.dayOfWeek !== getWeekdayName(input.leaveDate)
  ) {
    throw new ApiRequestError('다른 회원의 고정 휴무 응답을 받았습니다.', 409);
  }

  return response;
}

export function deleteMemberFixedLeave(
  fixedLeaveId: number,
  expectedMemberId: number,
) {
  return apiRequest<null>(`/api/leaves/fixed/${fixedLeaveId}`, {
    expectedMemberId,
    method: 'DELETE',
  });
}

export async function generateFixedLeaves(expectedMemberId: number) {
  const response = await apiRequest<FixedLeaveGenerationResponse>(
    '/api/leaves/fixed/generate',
    { expectedMemberId, method: 'POST' },
  );

  if (
    !isDateKey(response.startDate) ||
    !isDateKey(response.endDate) ||
    response.startDate > response.endDate ||
    !Number.isInteger(response.createdCount) ||
    response.createdCount < 0
  ) {
    throw new ApiRequestError('고정 휴무 생성 응답을 확인해 주세요.', 409);
  }

  return response;
}

function isDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const candidate = new Date(Date.UTC(year, month - 1, day));

  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  );
}
