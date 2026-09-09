import { apiRequest, ApiRequestError } from '../../core/api/api-client';

/**
 * A board cell holds one of three things: "O" for a slot staff have marked
 * present, "X" for a slot with no stored status, or a leave label the backend
 * composed from the leave itself ("오전반차", "병원", …). Only the first two are
 * fixed strings, so callers match those and treat everything else as leave
 * rather than trying to enumerate labels the frontend does not own.
 */
export const ATTENDANCE_PRESENT = 'O';
export const ATTENDANCE_BLANK = 'X';

/**
 * Where a cell's value came from. Note that "NONE" covers both an untouched
 * slot and one staff marked present — the backend does not distinguish them
 * here, and it does not need to: a slot only becomes "O" through
 * PATCH /daily-board/slot, so every "O" on the board is a staff action.
 */
export type AttendanceSlotSource = 'MANAGER_LEAVE' | 'MEMBER_LEAVE' | 'NONE';

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
