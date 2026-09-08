import { apiRequest, ApiRequestError } from '../../core/api/api-client';

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
 * This self-service UI only supplies ids returned by `/me/plan`. The backend
 * currently lets STAFF/ADMIN bypass the owner check, so server-side ownership
 * still needs hardening before this is a complete authorization boundary.
 * Office-assigned leaves return a null id and are never deletable here.
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
  /** Set only on manager-assigned special leave; null elsewhere. */
  requestedAfterEight: boolean | null;
};

/**
 * Everyone's leave for one day.
 *
 * Worth knowing what this endpoint is: it has no permission check at all on the
 * backend — any signed-in member can call it, and omitting branchId returns
 * every branch in the company. Sending the session's own branch and verifying
 * the rows on the way back is the whole of the protection here, so neither is
 * optional. It is on the list to gate.
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
