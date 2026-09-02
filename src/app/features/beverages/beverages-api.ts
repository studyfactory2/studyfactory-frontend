import { apiRequest, ApiRequestError } from '../../core/api/api-client';

export type BeverageItemResponse = {
  id: number | null;
  name: string;
  note: string | null;
};

export type BeveragePreferenceResponse = {
  id: number | null;
  memberId: number;
  branchId: number;
  drinks: string;
  drinkNotes: Record<string, string> | null;
  items: BeverageItemResponse[] | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export async function fetchMyBeveragePreference(expectedMemberId: number) {
  const response = await apiRequest<BeveragePreferenceResponse>(
    '/api/beverages/me',
    { expectedMemberId },
  );

  if (response.memberId !== expectedMemberId) {
    throw new ApiRequestError('다른 회원의 음료 정보를 받았습니다.', 409);
  }

  return response;
}
