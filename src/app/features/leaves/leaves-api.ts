import { apiRequest } from '../../core/api/api-client';

export type MemberLeavePlanSource = 'FIXED_LEAVE' | 'LEAVE' | 'SPECIAL_LEAVE';

export type MemberLeavePlanResponse = {
  id: number | null;
  leaveDate: string;
  leaveType: 'AFTERNOON' | 'FULL' | 'MORNING' | null;
  label: string;
  source: MemberLeavePlanSource | string;
  slots: string | null;
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
