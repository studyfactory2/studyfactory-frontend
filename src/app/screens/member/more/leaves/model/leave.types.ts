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
  /** Calendar reason label; half-day names are compact and long text is clipped. */
  chipLabel: string;
  /** The backend's own label, shown wherever there is room for it. */
  label: string;
  leaveType: LeaveType | null;
  origin: LeaveOrigin;
  /** Normalized periods; null means the plan did not provide valid coverage. */
  slots: readonly number[] | null;
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
  /** Compact calendar label, distinct from the full request button label. */
  label: string;
  requestLabel: string;
  value: LeaveType;
};

/** Labels follow the backend's own vocabulary (LeaveService#toLeaveTypeLabel). */
export const LEAVE_TYPE_OPTIONS: readonly LeaveTypeOption[] = [
  { label: '월차', requestLabel: '월차', value: 'FULL' },
  { label: '오전', requestLabel: '오전반차', value: 'MORNING' },
  { label: '오후', requestLabel: '오후반차', value: 'AFTERNOON' },
];
