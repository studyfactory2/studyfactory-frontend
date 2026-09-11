import {
  STAFF_SCHEDULE_DAYS,
  STAFF_SCHEDULE_DUTIES,
  normaliseScheduleWorkerName,
  toStaffScheduleKey,
} from '../../../../features/staff-schedules/staff-schedule-grid';
import type {
  StaffScheduleCellInput,
  StaffScheduleResponse,
} from '../../../../features/staff-schedules/staff-schedules-api';

export type AdminStaffScheduleDraft = Record<string, string>;

export function createAdminStaffScheduleDraft(
  schedules: readonly StaffScheduleResponse[],
) {
  const draft = createBlankAdminStaffScheduleDraft();

  schedules.forEach((cell) => {
    const key = toStaffScheduleKey(cell.dayOfWeek, cell.shift, cell.taskType);

    if (key in draft) {
      draft[key] = cell.workerName;
    }
  });

  return draft;
}

export function createBlankAdminStaffScheduleDraft() {
  return STAFF_SCHEDULE_DAYS.reduce<AdminStaffScheduleDraft>(
    (draft, { dayOfWeek }) => {
      STAFF_SCHEDULE_DUTIES.forEach(({ shift, taskType }) => {
        draft[toStaffScheduleKey(dayOfWeek, shift, taskType)] = '';
      });

      return draft;
    },
    {},
  );
}

export function buildAdminStaffScheduleRequest(
  draft: AdminStaffScheduleDraft,
): StaffScheduleCellInput[] {
  return STAFF_SCHEDULE_DAYS.flatMap(({ dayOfWeek }) =>
    STAFF_SCHEDULE_DUTIES.map(({ shift, taskType }) => ({
      dayOfWeek,
      shift,
      taskType,
      workerName: normaliseScheduleWorkerName(
        draft[toStaffScheduleKey(dayOfWeek, shift, taskType)] ?? '',
      ),
    })),
  );
}

export function countAdminStaffScheduleAssignments(
  draft: AdminStaffScheduleDraft,
) {
  return Object.values(draft).filter(
    (workerName) => normaliseScheduleWorkerName(workerName) !== '',
  ).length;
}

export function createAdminStaffScheduleSignature(
  draft: AdminStaffScheduleDraft,
) {
  return buildAdminStaffScheduleRequest(draft)
    .map((cell) => cell.workerName)
    .join('\u0000');
}
