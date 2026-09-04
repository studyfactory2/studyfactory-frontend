import { apiRequest, ApiRequestError } from '../../core/api/api-client';

export type MealType = 'DINNER' | 'LUNCH';

export type SideDishResponse = {
  id: number;
  memberId: number;
  branchId: number;
  mealDate: string;
  mealType: MealType;
  /** Stored as one string, "메뉴명: 가격". */
  items: string;
  totalPrice: number;
  createdAt: string | null;
  updatedAt: string | null;
};

/**
 * The backend rejects a request whose itemPrice differs from its totalPrice,
 * so a single price is sent in both fields. Quantity does not exist yet.
 */
export function createMySideDish(
  {
    mealDate,
    mealType,
    menuName,
    price,
  }: {
    mealDate: string;
    mealType: MealType;
    menuName: string;
    price: number;
  },
  expectedMemberId: number,
) {
  return apiRequest<SideDishResponse>('/api/side-dishes', {
    body: JSON.stringify({
      itemPrice: price,
      mealDate,
      mealType,
      menuName,
      totalPrice: price,
    }),
    expectedMemberId,
    method: 'POST',
  });
}

export async function fetchMySideDishes(
  date: string,
  expectedMemberId: number,
) {
  const query = new URLSearchParams({ date });
  const response = await apiRequest<SideDishResponse[]>(
    `/api/side-dishes/me?${query}`,
    { expectedMemberId },
  );

  if (
    response.some(
      (order) => order.memberId !== expectedMemberId || order.mealDate !== date,
    )
  ) {
    throw new ApiRequestError(
      '다른 회원 또는 날짜의 반찬 내역을 받았습니다.',
      409,
    );
  }

  return response;
}

/** Which days in the range already have an order — used for the calendar dots. */
export function fetchMySideDishOrderDates(
  from: string,
  to: string,
  expectedMemberId: number,
) {
  const query = new URLSearchParams({ from, to });

  return apiRequest<string[]>(`/api/side-dishes/me/order-dates?${query}`, {
    expectedMemberId,
  });
}

/**
 * The backend checks ownership but, unlike ordering, applies no deadline here,
 * so a member could cancel a lunch the kitchen has already made. The screen
 * enforces the same cutoff the order path uses.
 */
export function deleteMySideDish(sideDishId: number, expectedMemberId: number) {
  return apiRequest<null>(`/api/side-dishes/${sideDishId}`, {
    expectedMemberId,
    method: 'DELETE',
  });
}
