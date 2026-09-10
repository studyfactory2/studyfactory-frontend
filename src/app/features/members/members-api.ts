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

/**
 * A complete replacement of an existing signed-up member's editable profile.
 * The backend PATCH is not a merge, so callers must preserve every unchanged
 * field when constructing this value.
 */
export type CurrentMemberInput = {
  branchId: number;
  certificationId: number | null;
  /** YYYY-MM-DD. Unlike a pending registration, a current member requires it. */
  joinDate: string;
  name: string;
  preparingCertifications: string | null;
  role: MemberRole;
  seatNumber: number | null;
};

export async function updateCurrentMember(
  targetMemberId: number,
  input: CurrentMemberInput,
  expectedMemberId: number,
) {
  const response = await apiRequest<MemberResponse>(
    `/api/members/${targetMemberId}`,
    {
      body: JSON.stringify(input),
      expectedMemberId,
      method: 'PATCH',
    },
  );

  if (
    response.id !== targetMemberId ||
    response.branchId !== input.branchId ||
    response.role !== input.role
  ) {
    throw new ApiRequestError('다른 사원의 수정 응답을 받았습니다.', 409);
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

/**
 * What an operator decides about one pending MEMBER. The branch and the role
 * are deliberately not part of it: the branch is the operator's selected
 * branch and the role is always MEMBER, both supplied by the write functions.
 */
export type PreRegistrationInput = {
  name: string;
  seatNumber: number | null;
  /** YYYY-MM-DD, or null when undecided. */
  expectedJoinDate: string | null;
  /** The certification's name, which the backend resolves or creates. */
  certification: string | null;
  /** Drink names, one per line, in serving order. */
  drinkSetting: string;
  /** Note per drink name. Always sent, `{}` included, so the legacy `drinkNote` path is never taken. */
  drinkNotes: Record<string, string>;
};

/**
 * PATCH here is a complete replacement, not a merge — the backend rewrites
 * every column from the request — so every field is sent every time, and the
 * legacy `drinkNote` and the response-only `certificationId` never are.
 */
function toPreRegistrationBody(branchId: number, input: PreRegistrationInput) {
  return {
    branchId,
    name: input.name,
    role: 'MEMBER' as const,
    seatNumber: input.seatNumber,
    expectedJoinDate: input.expectedJoinDate,
    certification: input.certification,
    drinkSetting: input.drinkSetting,
    drinkNotes: input.drinkNotes,
  };
}

export async function createPendingMember(
  branchId: number,
  input: PreRegistrationInput,
  expectedMemberId: number,
) {
  const response = await apiRequest<PreRegistrationResponse>(
    '/api/pre-registrations',
    {
      body: JSON.stringify(toPreRegistrationBody(branchId, input)),
      expectedMemberId,
      method: 'POST',
    },
  );

  if (response.branchId !== branchId || response.role !== 'MEMBER') {
    throw new ApiRequestError(
      '다른 지점이나 다른 역할의 사전등록 응답을 받았습니다.',
      409,
    );
  }

  return response;
}

export async function updatePendingMember(
  memberId: number,
  branchId: number,
  input: PreRegistrationInput,
  expectedMemberId: number,
) {
  const response = await apiRequest<PreRegistrationResponse>(
    `/api/pre-registrations/${memberId}`,
    {
      body: JSON.stringify(toPreRegistrationBody(branchId, input)),
      expectedMemberId,
      method: 'PATCH',
    },
  );

  if (
    response.id !== memberId ||
    response.branchId !== branchId ||
    response.role !== 'MEMBER'
  ) {
    throw new ApiRequestError('다른 사전등록의 응답을 받았습니다.', 409);
  }

  return response;
}

/**
 * Removes a pending pre-registration and, server-side, the drink preference
 * stored with it. Only `/api/pre-registrations` is used: the backend refuses
 * it for anyone who has already signed up, which is the guarantee this
 * screen relies on — `DELETE /api/members/{id}` is never called from here.
 */
export async function deletePendingMember(
  memberId: number,
  expectedMemberId: number,
) {
  await apiRequest<null>(`/api/pre-registrations/${memberId}`, {
    expectedMemberId,
    method: 'DELETE',
  });
}
