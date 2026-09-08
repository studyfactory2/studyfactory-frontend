import type {
  StaffScheduleDayOfWeek,
  StaffScheduleResponse,
  StaffScheduleShift,
  StaffScheduleTaskType,
} from '../../../../features/staff-schedules/staff-schedules-api';

export type StaffScheduleDuty = {
  shift: StaffScheduleShift;
  taskType: StaffScheduleTaskType;
};

export type StaffScheduleDay = {
  dayOfWeek: StaffScheduleDayOfWeek;
  label: string;
  duties: Array<
    StaffScheduleDuty & {
      workerName: string;
    }
  >;
};

export const STAFF_SCHEDULE_DUTIES: readonly StaffScheduleDuty[] = [
  { shift: 'MORNING', taskType: 'DISHWASHING' },
  { shift: 'MORNING', taskType: 'SERVE' },
  { shift: 'AFTERNOON', taskType: 'DISHWASHING' },
  { shift: 'AFTERNOON', taskType: 'SERVE' },
];

const STAFF_SCHEDULE_DAYS: readonly {
  dayOfWeek: StaffScheduleDayOfWeek;
  label: string;
}[] = [
  { dayOfWeek: 'MONDAY', label: '월' },
  { dayOfWeek: 'TUESDAY', label: '화' },
  { dayOfWeek: 'WEDNESDAY', label: '수' },
  { dayOfWeek: 'THURSDAY', label: '목' },
  { dayOfWeek: 'FRIDAY', label: '금' },
  { dayOfWeek: 'SATURDAY', label: '토' },
  { dayOfWeek: 'SUNDAY', label: '일' },
];

const SHIFT_LABELS: Record<StaffScheduleShift, string> = {
  AFTERNOON: '오후',
  MORNING: '오전',
};

const TASK_LABELS: Record<StaffScheduleTaskType, string> = {
  DISHWASHING: '설거지',
  SERVE: '서빙',
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

export function formatScheduleShift(shift: StaffScheduleShift) {
  return SHIFT_LABELS[shift];
}

export function formatScheduleTask(taskType: StaffScheduleTaskType) {
  return TASK_LABELS[taskType];
}

export function toStaffScheduleKey(
  dayOfWeek: StaffScheduleDayOfWeek,
  shift: StaffScheduleShift,
  taskType: string,
) {
  return `${dayOfWeek}:${shift}:${taskType}`;
}

function normaliseWorkerName(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}
