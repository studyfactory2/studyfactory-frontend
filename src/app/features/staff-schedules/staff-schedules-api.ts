import { apiRequest, ApiRequestError } from '../../core/api/api-client';
import {
  STAFF_SCHEDULE_CELL_COUNT,
  STAFF_SCHEDULE_KEYS,
  toStaffScheduleKey,
} from './staff-schedule-grid';

export type StaffScheduleShift = 'AFTERNOON' | 'MORNING';

export type StaffScheduleDayOfWeek =
  | 'FRIDAY'
  | 'MONDAY'
  | 'SATURDAY'
  | 'SUNDAY'
  | 'THURSDAY'
  | 'TUESDAY'
  | 'WEDNESDAY';

/** The backend accepts only these two, validated against its own TASK_TYPES. */
export type StaffScheduleTaskType = 'DISHWASHING' | 'SERVE';

export type StaffScheduleResponse = {
  /** Null on a cell that has never been saved; the row still comes back. */
  id: number | null;
  branchId: number;
  dayOfWeek: StaffScheduleDayOfWeek;
  shift: StaffScheduleShift;
  taskType: string;
  /**
   * Free text, not a member reference. Nothing links a cell to a memberId, so
   * "whose shift is this" can only be answered by comparing names.
   */
  workerName: string;
};

export type StaffScheduleCellInput = {
  dayOfWeek: StaffScheduleDayOfWeek;
  shift: StaffScheduleShift;
  taskType: StaffScheduleTaskType;
  workerName: string;
};

export type StaffScheduleUpdateRequest = {
  schedules: StaffScheduleCellInput[];
};

/**
 * Always the full grid: seven days x two shifts x two task types = 28 cells,
 * with unsaved ones returned blank rather than omitted. Reading is open to
 * staff; saving (PUT) is ADMIN only.
 */
export async function fetchStaffSchedules(
  branchId: number,
  expectedMemberId: number,
) {
  const query = new URLSearchParams({ branchId: String(branchId) });
  const response = await apiRequest<StaffScheduleResponse[]>(
    `/api/staff-schedules?${query}`,
    { expectedMemberId },
  );

  return assertStaffScheduleResponse(response, branchId);
}

/** Replaces the selected branch's complete recurring weekly schedule. */
export async function updateStaffSchedules(
  branchId: number,
  request: StaffScheduleUpdateRequest,
  expectedMemberId: number,
) {
  const query = new URLSearchParams({ branchId: String(branchId) });
  const response = await apiRequest<StaffScheduleResponse[]>(
    `/api/staff-schedules?${query}`,
    {
      body: JSON.stringify(request),
      expectedMemberId,
      method: 'PUT',
    },
  );

  return assertStaffScheduleResponse(response, branchId);
}

function assertStaffScheduleResponse(
  response: StaffScheduleResponse[],
  branchId: number,
) {
  if (response.some((cell) => cell.branchId !== branchId)) {
    throw new ApiRequestError('다른 지점의 근무표를 받았습니다.', 409);
  }

  const keys = new Set(
    response.map((cell) =>
      toStaffScheduleKey(cell.dayOfWeek, cell.shift, cell.taskType),
    ),
  );

  if (
    response.length !== STAFF_SCHEDULE_CELL_COUNT ||
    keys.size !== STAFF_SCHEDULE_CELL_COUNT ||
    [...keys].some((key) => !STAFF_SCHEDULE_KEYS.has(key))
  ) {
    throw new ApiRequestError('근무표 응답이 올바르지 않습니다.', 409);
  }

  return response;
}
