import type { LeaveType } from '../../../../../features/leaves/leaves-api';

/**
 * Who put the leave on the calendar.
 *
 * `own` is a LeaveRequest the member filed and can cancel. `office` covers the
 * special and fixed leaves an ADMIN or STAFF assigned; the member sees them but
 * cannot touch them.
 */
export type LeaveOrigin = 'office' | 'own';

export type LeaveDayEntry = {
  /** LeaveRequest id — present only when `origin` is `own`. */
  leaveId: number | null;
  /** Two-character form for the calendar cell, which is ~44px wide. */
  chipLabel: string;
  /** The backend's own label, shown wherever there is room for it. */
  label: string;
  leaveType: LeaveType | null;
  origin: LeaveOrigin;
  slotsLabel: string | null;
  sourceLabel: string;
};

export type LeaveDayCell = {
  dateKey: string;
  dayOfMonth: number;
  entries: readonly LeaveDayEntry[];
  /** False for the neighbouring-month days that pad the six-week grid. */
  inMonth: boolean;
  isPast: boolean;
  isToday: boolean;
  /** Sunday = 0 … Saturday = 6. */
  weekdayIndex: number;
};

export type LeaveTypeOption = {
  description: string;
  label: string;
  value: LeaveType;
};

/** Labels follow the backend's own vocabulary (LeaveService#toLeaveTypeLabel). */
export const LEAVE_TYPE_OPTIONS: readonly LeaveTypeOption[] = [
  { description: '1~7교시 전체', label: '월차', value: 'FULL' },
  { description: '1~4교시', label: '오전', value: 'MORNING' },
  { description: '4~7교시', label: '오후', value: 'AFTERNOON' },
];
