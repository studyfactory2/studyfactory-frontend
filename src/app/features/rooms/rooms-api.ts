import { apiRequest, ApiRequestError } from '../../core/api/api-client';

/** A room holds seats and, sometimes, a door marker to orient the map. */
export type SeatType = 'DOOR' | 'SEAT';

export type RoomLayoutItem = {
  id: number;
  type: SeatType;
  /** The seat number members know it by. Null on a door. */
  number: number | null;
  /** Who sits here, or null for an unassigned seat. */
  memberId: number | null;
  /** Grid column, 1-based. */
  x: number;
  /** Grid row, 1-based. */
  y: number;
};

export type RoomLayout = {
  id: number;
  branchId: number;
  name: string;
  rows: number;
  cols: number;
  items: RoomLayoutItem[];
};

/**
 * The room is real geometry, not a list: every item carries its own x and y and
 * the room declares how many rows and columns it spans. A cell with no item is
 * floor — which is a different thing from a seat nobody is assigned to, and the
 * map has to show that difference or the walk order stops making sense.
 *
 * branchId is sent explicitly. RoomService.resolveBranchId returns whatever it
 * is given without a scope check, so the session's own branch is both the right
 * request and the one that cannot widen by accident.
 */
export async function fetchRoomLayouts(
  branchId: number,
  expectedMemberId: number,
) {
  const query = new URLSearchParams({ branchId: String(branchId) });
  const response = await apiRequest<RoomLayout[]>(`/api/rooms?${query}`, {
    expectedMemberId,
  });

  if (response.some((room) => room.branchId !== branchId)) {
    throw new ApiRequestError('다른 지점의 좌석 배치도를 받았습니다.', 409);
  }

  return response;
}
