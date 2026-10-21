import { apiRequest, ApiRequestError } from '../../core/api/api-client';
import type { ExcessLeaveRequest } from '../leaves/leaves-api';

/**
 * A board cell holds "O", "X", or a leave label. `slotSources` is required to
 * tell an untouched "X" (`NONE`) from an "X" that staff explicitly reviewed
 * (`MANAGER_ABSENT`); the visible value alone is intentionally not enough.
 */
export const ATTENDANCE_PRESENT = 'O';
export const ATTENDANCE_BLANK = 'X';

/**
 * Where a cell's value came from. "NONE" covers an untouched slot, a stored
 * present slot, and a slot explicitly returned to unconfirmed. `MANAGER_ABSENT`
 * is the durable reviewed-X marker returned after PATCH /daily-board/slot,
 * including a fixed-leave cancellation.
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
  /** Warning metadata is independent of visible attendance; old servers omit it. */
  excessLeaveRequests?: ExcessLeaveRequest[];
};

export type DailyAttendanceBoard = {
  date: string;
  rows: AttendanceBoardRow[];
};

export type AttendanceSlotUpdateStatus =
  'PRESENT' | 'ABSENT' | 'OTHER' | 'UNCONFIRMED';

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

export type AttendanceReasonApplyInput = {
  memberId: number;
  dates: string[];
  slots: number[];
  reason: string;
};

export type AttendanceReasonApplyResponse = {
  memberId: number;
  branchId: number;
  requestedPeriodCount: number;
  appliedPeriodCount: number;
  preservedPresentCount: number;
};

/**
 * The board is seat-shaped rather than member-shaped: it returns a row for
 * every seat from 1 to at least 102 — name "공석", memberId null — and then
 * appends people without seats. Attendance screens join non-null member IDs
 * with the branch roster to identify MEMBER and STAFF targets.
 *
 * branchId is always sent explicitly. The server allows ADMIN to select a
 * branch and restricts STAFF to their own branch.
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

/** One atomic leave application; already-present periods stay present. */
export async function applyDailyAttendanceReason(
  input: AttendanceReasonApplyInput,
  branchId: number,
  expectedMemberId: number,
) {
  const response = await apiRequest<AttendanceReasonApplyResponse>(
    '/api/attendances/daily-board/reasons',
    {
      body: JSON.stringify(input),
      expectedMemberId,
      method: 'POST',
    },
  );
  const counts = response && [
    response.requestedPeriodCount,
    response.appliedPeriodCount,
    response.preservedPresentCount,
  ];

  if (
    !response ||
    response.memberId !== input.memberId ||
    response.branchId !== branchId ||
    !counts?.every((count) => Number.isInteger(count) && count >= 0) ||
    response.requestedPeriodCount < 1 ||
    response.requestedPeriodCount > 217 ||
    response.requestedPeriodCount !== input.dates.length * input.slots.length ||
    response.appliedPeriodCount + response.preservedPresentCount !==
      response.requestedPeriodCount
  ) {
    throw new ApiRequestError('출석 사유 등록 결과를 다시 확인해 주세요.', 409);
  }

  return response;
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
