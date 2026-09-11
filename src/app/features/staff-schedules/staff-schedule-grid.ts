import type {
  StaffScheduleDayOfWeek,
  StaffScheduleShift,
  StaffScheduleTaskType,
} from './staff-schedules-api';

export type StaffScheduleDuty = {
  shift: StaffScheduleShift;
  taskType: StaffScheduleTaskType;
};

export const STAFF_SCHEDULE_DAYS: readonly {
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

export const STAFF_SCHEDULE_DUTIES: readonly StaffScheduleDuty[] = [
  { shift: 'MORNING', taskType: 'DISHWASHING' },
  { shift: 'MORNING', taskType: 'SERVE' },
  { shift: 'AFTERNOON', taskType: 'DISHWASHING' },
  { shift: 'AFTERNOON', taskType: 'SERVE' },
];

export const STAFF_SCHEDULE_CELL_COUNT =
  STAFF_SCHEDULE_DAYS.length * STAFF_SCHEDULE_DUTIES.length;

const SHIFT_LABELS: Record<StaffScheduleShift, string> = {
  AFTERNOON: '오후',
  MORNING: '오전',
};

const TASK_LABELS: Record<StaffScheduleTaskType, string> = {
  DISHWASHING: '설거지',
  SERVE: '서빙',
};

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

export function normaliseScheduleWorkerName(value: string) {
  return value.trim();
}

export const STAFF_SCHEDULE_KEYS = new Set(
  STAFF_SCHEDULE_DAYS.flatMap(({ dayOfWeek }) =>
    STAFF_SCHEDULE_DUTIES.map(({ shift, taskType }) =>
      toStaffScheduleKey(dayOfWeek, shift, taskType),
    ),
  ),
);
