import type {
  FixedLeaveDayOfWeek,
  FixedLeaveManagementResponse,
  MonthlyLeaveCalendarResponse,
  SpecialLeaveResponse,
} from './leaves-api';
import type { MemberResponse } from '../members/members-api';
import {
  addDays,
  getDayOfMonth,
  getWeekdayName,
  listMonthGridCells,
} from '../../shared/lib/seoul-date';

export const MANAGER_LEAVE_SLOTS = [1, 2, 3, 4, 5, 6, 7] as const;

export const MANAGER_LEAVE_REASONS = [
  '지각',
  '병원',
  '카페',
  '쉼',
  '운동',
  '알바',
  '스터디',
  '집공',
  '예정',
  '아픔',
  '모의',
  '시험',
  '그만둠',
  '늦잠',
  '교회',
  '기타',
] as const;

export const FIXED_LEAVE_WEEKDAYS: ReadonlyArray<{
  label: string;
  value: FixedLeaveDayOfWeek;
}> = [
  { label: '월', value: 'MONDAY' },
  { label: '화', value: 'TUESDAY' },
  { label: '수', value: 'WEDNESDAY' },
  { label: '목', value: 'THURSDAY' },
  { label: '금', value: 'FRIDAY' },
  { label: '토', value: 'SATURDAY' },
  { label: '일', value: 'SUNDAY' },
];

export type ManagerLeaveCalendarEntry = {
  key: string;
  label: string;
  source: 'own' | 'special';
  slots: readonly number[];
  slotsLabel: string;
};

export type ManagerLeaveCalendarReason = {
  label: string;
  source: ManagerLeaveCalendarEntry['source'] | 'mixed';
  slotsLabel: string;
};

export type ManagerLeaveCalendarCell = {
  dateKey: string;
  dayOfMonth: number;
  entries: ManagerLeaveCalendarEntry[];
  inMonth: boolean;
  isToday: boolean;
};

export type ManagerSpecialLeaveSlot = {
  dateKey: string;
  id: number;
  key: string;
  label: string;
  recurring: boolean;
  slot: number;
};

export function sortManagerLeaveMembers(members: MemberResponse[]) {
  return [...members].sort(
    (left, right) =>
      (left.seatNumber ?? Number.MAX_SAFE_INTEGER) -
        (right.seatNumber ?? Number.MAX_SAFE_INTEGER) ||
      left.name.localeCompare(right.name, 'ko') ||
      left.id - right.id,
  );
}

export function buildManagerLeaveCalendarCells({
  month,
  rows,
  todayKey,
  year,
}: {
  month: number;
  rows: readonly MonthlyLeaveCalendarResponse[];
  todayKey: string;
  year: number;
}) {
  const entriesByDate = new Map<string, ManagerLeaveCalendarEntry[]>();

  rows.forEach((row, index) => {
    const current = entriesByDate.get(row.leaveDate) ?? [];
    const slots = parseLeaveSlots(row.slots);

    current.push({
      key: `${row.leaveDate}:${row.source}:${row.label}:${row.slots}:${index}`,
      label: row.label,
      slots,
      slotsLabel: formatLeaveSlots(slots),
      source: row.source === 'LEAVE' ? 'own' : 'special',
    });
    entriesByDate.set(row.leaveDate, current);
  });

  return listMonthGridCells(year, month).map<ManagerLeaveCalendarCell>(
    (cell) => ({
      dateKey: cell.dateKey,
      dayOfMonth: getDayOfMonth(cell.dateKey),
      entries: cell.inMonth ? (entriesByDate.get(cell.dateKey) ?? []) : [],
      inMonth: cell.inMonth,
      isToday: cell.dateKey === todayKey,
    }),
  );
}

/** Summarize one day's badges only; the original entries remain detail records. */
export function summarizeManagerLeaveCalendarReasons(
  entries: readonly ManagerLeaveCalendarEntry[],
): ManagerLeaveCalendarReason[] {
  const reasons = new Map<
    string,
    { slots: Set<number>; source: ManagerLeaveCalendarReason['source'] }
  >();

  for (const entry of entries) {
    const existing = reasons.get(entry.label);

    if (!existing) {
      reasons.set(entry.label, {
        slots: new Set(entry.slots),
        source: entry.source,
      });
      continue;
    }

    for (const slot of entry.slots) {
      existing.slots.add(slot);
    }
    if (existing.source !== entry.source) {
      existing.source = 'mixed';
    }
  }

  return [...reasons].map(([label, reason]) => ({
    label,
    slotsLabel: formatLeaveSlots([...reason.slots]),
    source: reason.source,
  }));
}

export function expandSpecialLeaveSlots(entries: SpecialLeaveResponse[]) {
  return entries
    .flatMap<ManagerSpecialLeaveSlot>((entry) =>
      parseLeaveSlots(entry.slots).map((slot) => ({
        dateKey: entry.leaveDate,
        id: entry.id,
        key: `${entry.id}:${slot}`,
        label:
          entry.reason === '기타' && entry.customReason
            ? entry.customReason
            : entry.reason,
        recurring: entry.recurring,
        slot,
      })),
    )
    .sort(
      (left, right) =>
        right.dateKey.localeCompare(left.dateKey) || right.slot - left.slot,
    );
}

export function sortFixedLeaves(entries: FixedLeaveManagementResponse[]) {
  const dayOrder = new Map(
    FIXED_LEAVE_WEEKDAYS.map((day, index) => [day.value, index]),
  );

  return [...entries].sort(
    (left, right) =>
      left.memberName.localeCompare(right.memberName, 'ko') ||
      (dayOrder.get(left.dayOfWeek) ?? 7) -
        (dayOrder.get(right.dayOfWeek) ?? 7) ||
      left.id - right.id,
  );
}

export function parseLeaveSlots(slots: string) {
  return slots
    .split(',')
    .map((slot) => Number(slot.trim()))
    .filter(
      (slot, index, values) =>
        Number.isInteger(slot) &&
        slot >= 1 &&
        slot <= 7 &&
        values.indexOf(slot) === index,
    )
    .sort((left, right) => left - right);
}

export function formatLeaveSlots(slots: string | readonly number[]) {
  const values =
    typeof slots === 'string'
      ? parseLeaveSlots(slots)
      : [...slots].sort((left, right) => left - right);

  if (values.length === 0) {
    return '교시 없음';
  }

  return values.length === 7 ? '전 교시' : `${values.join('·')}교시`;
}

export function toFixedLeaveWeekdayLabel(day: FixedLeaveDayOfWeek) {
  return (
    FIXED_LEAVE_WEEKDAYS.find((option) => option.value === day)?.label ?? day
  );
}

/** Resolve the next matching date as the weekly schedule's effective start. */
export function toNextDateForWeekday(
  todayKey: string,
  weekday: FixedLeaveDayOfWeek,
) {
  for (let offset = 0; offset < 7; offset += 1) {
    const candidate = addDays(todayKey, offset);

    if (getWeekdayName(candidate) === weekday) {
      return candidate;
    }
  }

  return todayKey;
}
