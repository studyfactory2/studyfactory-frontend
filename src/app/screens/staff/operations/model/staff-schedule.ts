import type { StaffScheduleResponse } from '../../../../features/staff-schedules/staff-schedules-api';
import type { StaffScheduleDayOfWeek } from '../../../../features/staff-schedules/staff-schedules-api';
import {
  STAFF_SCHEDULE_DAYS,
  STAFF_SCHEDULE_DUTIES,
  formatScheduleShift,
  formatScheduleTask,
  toStaffScheduleKey,
  type StaffScheduleDuty,
} from '../../../../features/staff-schedules/staff-schedule-grid';

export {
  STAFF_SCHEDULE_DUTIES,
  formatScheduleShift,
  formatScheduleTask,
  toStaffScheduleKey,
};
export type { StaffScheduleDuty };

export type StaffScheduleDay = {
  dayOfWeek: StaffScheduleDayOfWeek;
  label: string;
  duties: Array<
    StaffScheduleDuty & {
      workerName: string;
    }
  >;
};

export function buildStaffScheduleDays(
  schedules: readonly StaffScheduleResponse[],
): StaffScheduleDay[] {
  const byDuty = new Map(
    schedules.map((cell) => [
      toStaffScheduleKey(cell.dayOfWeek, cell.shift, cell.taskType),
      cell.workerName.trim(),
    ]),
  );

  return STAFF_SCHEDULE_DAYS.map(({ dayOfWeek, label }) => ({
    dayOfWeek,
    duties: STAFF_SCHEDULE_DUTIES.map((duty) => ({
      ...duty,
      workerName:
        byDuty.get(toStaffScheduleKey(dayOfWeek, duty.shift, duty.taskType)) ??
        '',
    })),
    label,
  }));
}

export function countAssignedScheduleDuties(days: readonly StaffScheduleDay[]) {
  return days.reduce(
    (count, day) =>
      count + day.duties.filter((duty) => duty.workerName !== '').length,
    0,
  );
}

export function countOwnScheduleDuties(
  days: readonly StaffScheduleDay[],
  memberName: string | null,
) {
  if (!memberName) {
    return 0;
  }

  return days.reduce(
    (count, day) =>
      count +
      day.duties.filter((duty) =>
        isOwnScheduleWorker(duty.workerName, memberName),
      ).length,
    0,
  );
}

export function isOwnScheduleWorker(
  workerName: string,
  memberName: string | null,
) {
  const worker = normaliseWorkerName(workerName);

  return (
    memberName !== null &&
    worker !== '' &&
    worker === normaliseWorkerName(memberName)
  );
}

function normaliseWorkerName(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}
