import type { MemberLeavePlanResponse } from '../../../../../features/leaves/leaves-api';
import {
  getDayOfMonth,
  listMonthGridCells,
} from '../../../../../shared/lib/seoul-date';
import { formatLeaveSlots, getLeaveTypeLabel } from './leave.format';
import type { LeaveDayCell, LeaveDayEntry } from './leave.types';

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

export function findOwnEntry(cell: LeaveDayCell) {
  return cell.entries.find((entry) => entry.origin === 'own') ?? null;
}

/**
 * One leave request per day. The backend accepts duplicates — it validates
 * only that the date is not in the past — so the guard lives here until that
 * rule moves into LeaveService.
 */
export function canRequestLeave(cell: LeaveDayCell) {
  return cell.inMonth && !cell.isPast && cell.entries.length === 0;
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
    slotsLabel: formatLeaveSlots(row.slots),
    sourceLabel: toSourceLabel(row.source),
  };
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

  return source === 'FIXED_LEAVE' ? '고정' : '특별';
}

function toSourceLabel(source: string) {
  if (source === 'LEAVE') {
    return '내가 신청';
  }

  return source === 'FIXED_LEAVE' ? '고정 휴무' : '지점 등록';
}
