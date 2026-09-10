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
 * This self-service UI only supplies ids returned by `/me`. The server enforces
 * ownership for MEMBER and STAFF callers; ADMIN retains its explicit
 * management capability. The screen also enforces the ordering cutoff because
 * deletion has no backend deadline.
 */
export function deleteMySideDish(sideDishId: number, expectedMemberId: number) {
  return apiRequest<null>(`/api/side-dishes/${sideDishId}`, {
    expectedMemberId,
    method: 'DELETE',
  });
}

export type DailySideDishResponse = {
  id: number;
  memberId: number;
  branchId: number;
  memberName: string;
  seatNumber: number | null;
  mealDate: string;
  mealType: MealType;
  items: string;
  totalPrice: number;
};

/**
 * Everyone's orders for one day in one branch. The server requires manager
 * access: an ADMIN may name any branch, STAFF is pinned to their own, so the
 * branch is always sent explicitly and every returned row is validated
 * against it.
 */
export async function fetchDailySideDishes(
  date: string,
  branchId: number,
  expectedMemberId: number,
) {
  const query = new URLSearchParams({ branchId: String(branchId), date });
  const response = await apiRequest<DailySideDishResponse[]>(
    `/api/side-dishes/daily?${query}`,
    { expectedMemberId },
  );

  if (
    response.some(
      (order) => order.branchId !== branchId || order.mealDate !== date,
    )
  ) {
    throw new ApiRequestError(
      '다른 지점 또는 날짜의 반찬 내역을 받았습니다.',
      409,
    );
  }

  return response;
}
