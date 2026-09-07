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
 * Every suggestion raised in the caller's own branch. This one the backend
 * scopes itself — findByBranchId(currentMember.branchId), no parameter to pass
 * — so there is nothing for the caller to widen and nothing to re-check.
 */
export function fetchBranchSuggestions(expectedMemberId: number) {
  return apiRequest<SuggestionResponse[]>('/api/suggestions', {
    expectedMemberId,
  });
}
