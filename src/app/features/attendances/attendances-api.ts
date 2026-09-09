import { apiRequest, ApiRequestError } from '../../core/api/api-client';

/**
 * A board cell holds "O", "X", or a leave label. `slotSources` is required to
 * tell an untouched "X" (`NONE`) from an "X" that staff explicitly reviewed
 * (`MANAGER_ABSENT`); the visible value alone is intentionally not enough.
 */
export const ATTENDANCE_PRESENT = 'O';
export const ATTENDANCE_BLANK = 'X';

/**
 * Where a cell's value came from. "NONE" covers an untouched slot and a stored
 * present slot. `MANAGER_ABSENT` is the durable reviewed-X marker returned
 * after PATCH /daily-board/slot, including a fixed-leave cancellation.
 */
export type AttendanceSlotSource =
  'MANAGER_ABSENT' | 'MANAGER_LEAVE' | 'MEMBER_LEAVE' | 'NONE';

export type AttendanceBoardRow = {
  /** Null on an unoccupied seat, which the board still returns as a row. */
  memberId: number | null;
  seatNumber: number | null;
  name: string;
  joinDate: string | null;
  createdAt: string | null;
  certificationContent: string | null;
  /** Always seven entries, 1교시 first. */
  slots: string[];
  slotSources: AttendanceSlotSource[];
};

export type DailyAttendanceBoard = {
  date: string;
  rows: AttendanceBoardRow[];
};

export type AttendanceSlotUpdateStatus = 'PRESENT' | 'ABSENT' | 'OTHER';

export type AttendanceSlotUpdateInput = {
  date: string;
  memberId: number;
  reason?: string;
  slot: number;
  status: AttendanceSlotUpdateStatus;
};

export type AttendanceDailyResetInput = {
  date: string;
  memberId: number;
};

/**
 * The board is seat-shaped rather than member-shaped: it returns a row for
 * every seat from 1 to at least 102 — name "공석", memberId null — and then
 * appends any member who has no seat. Anything counting people has to filter on
 * memberId first, which is why model/staff-home.ts does that once and nothing
 * else touches raw rows.
 *
 * branchId is always sent. The backend's resolveBranchId falls back to the
 * caller's own branch when it is omitted, but applies no scope check when it is
 * present, so sending the session's own branch is both the correct request and
 * the one that cannot widen by accident.
 */
export async function fetchDailyAttendanceBoard(
  date: string,
  branchId: number,
  expectedMemberId: number,
) {
  const query = new URLSearchParams({ branchId: String(branchId), date });
  const response = await apiRequest<DailyAttendanceBoard>(
    `/api/attendances/daily-board?${query}`,
    { expectedMemberId },
  );

  if (response.date !== date) {
    throw new ApiRequestError('다른 날짜의 출석부를 받았습니다.', 409);
  }

  return response;
}

export function updateDailyAttendanceSlot(
  input: AttendanceSlotUpdateInput,
  expectedMemberId: number,
) {
  return apiRequest<void>('/api/attendances/daily-board/slot', {
    body: JSON.stringify(input),
    expectedMemberId,
    method: 'PATCH',
  });
}

export function resetDailyAttendanceMember(
  input: AttendanceDailyResetInput,
  expectedMemberId: number,
) {
  return apiRequest<void>('/api/attendances/daily-board/member/reset', {
    body: JSON.stringify(input),
    expectedMemberId,
    method: 'PATCH',
  });
}
