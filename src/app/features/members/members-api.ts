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

export type PreRegistrationResponse = {
  id: number;
  branchId: number;
  name: string;
  role: MemberRole;
  seatNumber: number | null;
  expectedJoinDate: string | null;
  certificationId: number | null;
  /** Newline-delimited drink names, exactly as the beverage roster stores them. */
  drinkSetting: string;
  /** Note per drink name; only drinks that carry a note appear here. */
  drinkNotes: Record<string, string>;
  createdAt: string | null;
  updatedAt: string | null;
};

/**
 * Everyone pre-registered in one branch who has not signed up yet. The
 * `/api/pre-registrations` shape is used rather than `/api/members/...`
 * because it carries the drink preference. An ADMIN may name any branch and
 * STAFF is pinned to their own by the backend, so the branch is always sent
 * and every returned row is checked against it.
 */
export async function fetchPendingPreRegistrations(
  branchId: number,
  expectedMemberId: number,
) {
  const query = new URLSearchParams({ branchId: String(branchId) });
  const response = await apiRequest<PreRegistrationResponse[]>(
    `/api/pre-registrations/pending?${query}`,
    { expectedMemberId },
  );

  if (response.some((registration) => registration.branchId !== branchId)) {
    throw new ApiRequestError('다른 지점의 사전등록 목록을 받았습니다.', 409);
  }

  return response;
}
