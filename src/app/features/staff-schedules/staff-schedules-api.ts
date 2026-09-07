import { apiRequest, ApiRequestError } from '../../core/api/api-client';

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

/**
 * Always the full grid: seven days x two shifts x two task types = 28 cells,
 * with unsaved ones returned blank rather than omitted. Reading is open to
 * staff; saving (PUT) is ADMIN only, which is why no write lives here.
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

  if (response.some((cell) => cell.branchId !== branchId)) {
    throw new ApiRequestError('다른 지점의 근무표를 받았습니다.', 409);
  }

  return response;
}
