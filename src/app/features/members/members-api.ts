import { apiRequest, ApiRequestError } from '../../core/api/api-client';
import type { MemberRole } from '../../core/session';

export type MemberResponse = {
  id: number;
  branchId: number;
  name: string;
  role: MemberRole;
  /** Assigned by an operator, and cleared when a member has no desk. */
  seatNumber: number | null;
  joinDate: string | null;
  certificationId: number | null;
  preparingCertifications: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export async function fetchMe(expectedMemberId: number) {
  const response = await apiRequest<MemberResponse>('/api/members/me', {
    expectedMemberId,
  });

  if (response.id !== expectedMemberId) {
    throw new ApiRequestError('다른 회원의 정보를 받았습니다.', 409);
  }

  return response;
}

/**
 * Role-bearing roster for an operator's own branch. Attendance's board payload
 * is intentionally seat-shaped and does not carry roles, so consumers that
 * expose member-only actions must join it with this checked roster first.
 */
export async function fetchBranchMembers(
  branchId: number,
  expectedMemberId: number,
) {
  const query = new URLSearchParams({ branchId: String(branchId) });
  const response = await apiRequest<MemberResponse[]>(`/api/members?${query}`, {
    expectedMemberId,
  });

  if (response.some((member) => member.branchId !== branchId)) {
    throw new ApiRequestError('다른 지점의 회원 목록을 받았습니다.', 409);
  }

  return response;
}
