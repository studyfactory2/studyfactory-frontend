import { apiRequest } from '../../core/api/api-client';

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
 * The backend authorises this by owner, so a member can only ever remove a
 * leave they filed themselves. Office-assigned leaves (special and fixed) come
 * back from the plan endpoint with a null id and are never deletable here.
 */
export function deleteMyLeave(leaveId: number, expectedMemberId: number) {
  return apiRequest<null>(`/api/leaves/${leaveId}`, {
    expectedMemberId,
    method: 'DELETE',
  });
}
