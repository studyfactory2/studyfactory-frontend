import { apiRequest, ApiRequestError } from '../../core/api/api-client';

export type SuggestionCategory =
  'COUNSELING' | 'GENERAL' | 'STUDY' | 'SUPPLIES';

export type SuggestionResponse = {
  id: number;
  memberId: number;
  /** Null on the self endpoint: the backend only resolves names for managers. */
  memberName: string | null;
  branchId: number;
  resolvedByMemberId: number | null;
  resolvedByMemberName: string | null;
  category: SuggestionCategory;
  content: string;
  isResolved: boolean;
  createdAt: string;
  updatedAt: string;
};

export function createMySuggestion(
  category: SuggestionCategory,
  content: string,
  expectedMemberId: number,
) {
  return apiRequest<SuggestionResponse>('/api/suggestions', {
    body: JSON.stringify({ category, content }),
    expectedMemberId,
    method: 'POST',
  });
}

export async function fetchMySuggestions(expectedMemberId: number) {
  const response = await apiRequest<SuggestionResponse[]>(
    '/api/suggestions/me',
    { expectedMemberId },
  );

  if (response.some((suggestion) => suggestion.memberId !== expectedMemberId)) {
    throw new ApiRequestError('다른 회원의 요청 내역을 받았습니다.', 409);
  }

  return response;
}

/**
 * Every suggestion raised in one branch. The branch is always sent: an ADMIN
 * may read any branch, and STAFF is pinned to their own by the backend, so a
 * STAFF caller passes the authenticated branch and gets the same list as
 * before. Every returned row is re-checked against the branch that was asked
 * for, so a mismatch can never be cached under the wrong key.
 */
export async function fetchBranchSuggestions(
  branchId: number,
  expectedMemberId: number,
) {
  const query = new URLSearchParams({ branchId: String(branchId) });
  const response = await apiRequest<SuggestionResponse[]>(
    `/api/suggestions?${query}`,
    { expectedMemberId },
  );

  if (response.some((suggestion) => suggestion.branchId !== branchId)) {
    throw new ApiRequestError('다른 지점의 요청 내역을 받았습니다.', 409);
  }

  return response;
}

/**
 * The backend endpoint toggles in both directions. Callers must disable the
 * row while this request is pending so a double click cannot immediately
 * reverse the intended state.
 */
export async function toggleSuggestionResolution(
  suggestionId: number,
  branchId: number,
  expectedMemberId: number,
) {
  const response = await apiRequest<SuggestionResponse>(
    `/api/suggestions/${suggestionId}/resolve`,
    { expectedMemberId, method: 'PATCH' },
  );

  if (response.branchId !== branchId) {
    throw new ApiRequestError('다른 지점의 요청을 받았습니다.', 409);
  }

  return response;
}
