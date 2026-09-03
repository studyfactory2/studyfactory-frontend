import type { LeaveType } from '../../../../../features/leaves/leaves-api';
import { LEAVE_TYPE_OPTIONS } from './leave.types';

/**
 * "1,2,3,4,5,6,7" → "1~7교시", "1,2,4" → "1~2·4교시".
 * Consecutive periods collapse into a range so a full-day leave reads as one
 * span instead of seven numbers.
 */
export function formatLeaveSlots(slots: string | null) {
  if (!slots) {
    return null;
  }

  const periods = slots
    .split(',')
    .map((slot) => Number(slot.trim()))
    .filter((period) => Number.isInteger(period))
    .sort((left, right) => left - right);

  if (periods.length === 0) {
    return null;
  }

  const groups: string[] = [];
  let runStart = periods[0];
  let runEnd = periods[0];

  const flush = () => {
    groups.push(runStart === runEnd ? `${runStart}` : `${runStart}~${runEnd}`);
  };

  for (const period of periods.slice(1)) {
    if (period === runEnd || period === runEnd + 1) {
      runEnd = period;
      continue;
    }

    flush();
    runStart = period;
    runEnd = period;
  }

  flush();

  return `${groups.join('·')}교시`;
}

export function getLeaveTypeLabel(leaveType: LeaveType | null) {
  return (
    LEAVE_TYPE_OPTIONS.find((option) => option.value === leaveType)?.label ??
    null
  );
}
