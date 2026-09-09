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

/**
 * The request record accepts four overlapping shapes — `items`, `drinkSetting`,
 * `drinkNotes` and `drinkNote`. The service prefers `items` whenever it is
 * present and only falls back to the older text forms otherwise, so this client
 * always sends `items` and never the legacy fields.
 */
export type BeverageItemInput = {
  name: string;
  note: string | null;
};

function assertOwnPreference(
  response: BeveragePreferenceResponse,
  expectedMemberId: number,
) {
  if (response.memberId !== expectedMemberId) {
    throw new ApiRequestError('다른 회원의 음료 정보를 받았습니다.', 409);
  }

  return response;
}

export async function fetchMyBeveragePreference(expectedMemberId: number) {
  const response = await apiRequest<BeveragePreferenceResponse>(
    '/api/beverages/me',
    { expectedMemberId },
  );

  return assertOwnPreference(response, expectedMemberId);
}

/** Appends to the existing list; the backend keeps duplicates on purpose. */
export async function addMyBeverageItems(
  items: readonly BeverageItemInput[],
  expectedMemberId: number,
) {
  const response = await apiRequest<BeveragePreferenceResponse>(
    '/api/beverages/me',
    {
      body: JSON.stringify({ items }),
      expectedMemberId,
      method: 'POST',
    },
  );

  return assertOwnPreference(response, expectedMemberId);
}

/**
 * Replaces the whole list. Used for editing and for removing a single drink,
 * because `DELETE /api/beverages/me/items` matches by name and would remove
 * every row sharing it — and the same drink may legitimately appear twice.
 */
export async function replaceMyBeverageItems(
  items: readonly BeverageItemInput[],
  expectedMemberId: number,
) {
  const response = await apiRequest<BeveragePreferenceResponse>(
    '/api/beverages/me',
    {
      body: JSON.stringify({ items }),
      expectedMemberId,
      method: 'PATCH',
    },
  );

  return assertOwnPreference(response, expectedMemberId);
}

export type MemberBeverageResponse = {
  memberId: number;
  branchId: number;
  memberName: string;
  role: 'ADMIN' | 'MEMBER' | 'STAFF';
  seatNumber: number | null;
  joinDate: string | null;
  /**
   * The same names as `items`, newline-joined for display. Never parse it —
   * items is the data, and two identical drinks are two separate items on
   * purpose so a member can order the same thing twice.
   */
  drinks: string;
  drinkNotes: Record<string, string>;
  items: BeverageItemResponse[];
  createdAt: string | null;
  updatedAt: string | null;
};

/**
 * Every member's drink setup, for the making list. The server restricts STAFF
 * to their own branch; this client still sends that branch explicitly and
 * validates every row as a response-contract guard.
 */
export async function fetchMemberBeverages(
  branchId: number,
  expectedMemberId: number,
) {
  const query = new URLSearchParams({ branchId: String(branchId) });
  const response = await apiRequest<MemberBeverageResponse[]>(
    `/api/beverages/members?${query}`,
    { expectedMemberId },
  );

  if (response.some((member) => member.branchId !== branchId)) {
    throw new ApiRequestError('다른 지점의 음료 목록을 받았습니다.', 409);
  }

  return response;
}

/**
 * Replaces a member's whole drink list, as staff. This is the only write the
 * staff screen makes, for the same reason the member screen has only replace:
 * `DELETE …/items?drinkSetting=` matches by name and would remove every row
 * sharing it, and the same drink may legitimately appear twice. Removing one
 * of two is therefore "send the list without it".
 *
 * The server permits manager roles and restricts STAFF to same-branch targets;
 * ADMIN retains broader scope. The response identity and branch are still
 * verified here before the cache accepts this Staff-screen write.
 */
export async function replaceMemberBeverageItems(
  memberId: number,
  items: readonly BeverageItemInput[],
  branchId: number,
  expectedMemberId: number,
) {
  const response = await apiRequest<BeveragePreferenceResponse>(
    `/api/beverages/members/${memberId}`,
    {
      body: JSON.stringify({ items }),
      expectedMemberId,
      method: 'PATCH',
    },
  );

  if (response.memberId !== memberId || response.branchId !== branchId) {
    throw new ApiRequestError('다른 회원의 음료 정보를 받았습니다.', 409);
  }

  return response;
}
