import type {
  LeaveType,
  MemberLeavePlanResponse,
} from '../../../../../features/leaves/leaves-api';
import {
  getDayOfMonth,
  listMonthGridCells,
} from '../../../../../shared/lib/seoul-date';
import { formatLeaveSlots, getLeaveTypeLabel } from './leave.format';
import type { LeaveDayCell, LeaveDayEntry } from './leave.types';

const LEAVE_TYPE_SLOTS: Record<LeaveType, readonly number[]> = {
  FULL: [1, 2, 3, 4, 5, 6, 7],
  MORNING: [1, 2, 3, 4],
  AFTERNOON: [4, 5, 6, 7],
};

/**
 * `/api/leaves/me/plan` returns the member's whole LeaveRequest and
 * SpecialLeave history regardless of the requested month, and expands
 * FixedLeave only across that month. The grid therefore reads entries for the
 * requested month only — the neighbouring-month padding days stay blank rather
 * than showing a partial picture that omits fixed leaves.
 */
export function buildLeaveMonthCells({
  month,
  plan,
  todayKey,
  year,
}: {
  month: number;
  plan: readonly MemberLeavePlanResponse[] | undefined;
  todayKey: string;
  year: number;
}): LeaveDayCell[] {
  const entriesByDate = groupEntriesByDate(plan ?? []);

  return listMonthGridCells(year, month).map((cell, index) => ({
    dateKey: cell.dateKey,
    dayOfMonth: getDayOfMonth(cell.dateKey),
    entries: cell.inMonth ? (entriesByDate.get(cell.dateKey) ?? []) : [],
    inMonth: cell.inMonth,
    isPast: cell.dateKey < todayKey,
    isToday: cell.dateKey === todayKey,
    weekdayIndex: index % 7,
  }));
}

/**
 * Multiple self-service requests may share a date, including morning followed
 * by afternoon leave, alongside office-assigned and recurring leave.
 * This only allows a new request; existing attendance and leave records keep
 * their backend precedence. Full-day leave still requires known,
 * non-overlapping periods. Without a type, check every available option.
 */
export function canRequestLeave(cell: LeaveDayCell, leaveType?: LeaveType) {
  if (!cell.inMonth || cell.isPast) {
    return false;
  }

  const requestedTypes = leaveType
    ? [leaveType]
    : (Object.keys(LEAVE_TYPE_SLOTS) as LeaveType[]);

  return requestedTypes.some(
    (type) =>
      type === 'MORNING' ||
      type === 'AFTERNOON' ||
      cell.entries.every((entry) =>
        entry.slots?.every((slot) => !LEAVE_TYPE_SLOTS[type].includes(slot)),
      ),
  );
}

export function isDaySelectable(cell: LeaveDayCell) {
  return cell.inMonth && (canRequestLeave(cell) || cell.entries.length > 0);
}

export function listUpcomingEntries(
  cells: readonly LeaveDayCell[],
): { cell: LeaveDayCell; entry: LeaveDayEntry }[] {
  return cells
    .filter((cell) => cell.inMonth && !cell.isPast)
    .flatMap((cell) => cell.entries.map((entry) => ({ cell, entry })));
}

function groupEntriesByDate(plan: readonly MemberLeavePlanResponse[]) {
  const entriesByDate = new Map<string, LeaveDayEntry[]>();

  for (const row of plan) {
    const existing = entriesByDate.get(row.leaveDate);
    const entry = toEntry(row);

    if (existing) {
      existing.push(entry);
      continue;
    }

    entriesByDate.set(row.leaveDate, [entry]);
  }

  return entriesByDate;
}

function toEntry(row: MemberLeavePlanResponse): LeaveDayEntry {
  const isOwnRequest = row.source === 'LEAVE';

  return {
    chipLabel: toChipLabel(
      row.source,
      isOwnRequest ? row.label : null,
      isOwnRequest ? getLeaveTypeLabel(row.leaveType) : null,
    ),
    label: row.label,
    /**
     * Only a LEAVE row carries a LeaveRequest id. A FIXED_LEAVE row also comes
     * back with a non-null id, but it is the FixedLeave's id — sending it to
     * DELETE /api/leaves/{id} would address an unrelated LeaveRequest, so the
     * id is dropped for everything that is not the member's own request.
     */
    leaveId: isOwnRequest ? row.id : null,
    leaveType: row.leaveType,
    origin: isOwnRequest ? 'own' : 'office',
    slots: normalizeLeaveSlots(row.slots),
    slotsLabel: formatLeaveSlots(row.slots),
    sourceLabel: toSourceLabel(row.source),
  };
}

function normalizeLeaveSlots(slots: string | null): readonly number[] | null {
  if (typeof slots !== 'string') {
    return null;
  }

  const parts = slots.split(',').map((slot) => slot.trim());

  if (parts.some((slot) => !/^[1-7]$/.test(slot))) {
    return null;
  }

  return [...new Set(parts.map(Number))].sort((left, right) => left - right);
}

/**
 * A calendar cell is about 44px wide on a phone, so the backend's free-text
 * label ("특별휴무 (병원)") has to be shortened there. The full label still
 * shows in the day sheet and in the upcoming list.
 */
function toChipLabel(
  source: string,
  ownLabel: string | null,
  ownTypeLabel: string | null,
) {
  if (source === 'LEAVE') {
    return ownTypeLabel ?? ownLabel ?? '휴무';
  }

  return source === 'FIXED_LEAVE' ? '개인' : '관리';
}

function toSourceLabel(source: string) {
  if (source === 'LEAVE') {
    return '내가 신청';
  }

  return source === 'FIXED_LEAVE' ? '개인일정' : '관리자등록';
}
