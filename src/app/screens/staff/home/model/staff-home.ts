import {
  ATTENDANCE_BLANK,
  ATTENDANCE_PRESENT,
  type DailyAttendanceBoard,
} from '../../../../features/attendances/attendances-api';
import type { OperationalAttendanceSlot } from '../../../../features/attendances/attendance-rules';
import type { DailySideDishResponse } from '../../../../features/side-dishes/side-dishes-api';
import type { StaffScheduleResponse } from '../../../../features/staff-schedules/staff-schedules-api';
import type { StudyPresenceLiveResponse } from '../../../../features/study-presence/study-presence-api';
import type { MemberBeverageResponse } from '../../../../features/beverages/beverages-api';
import type { SuggestionResponse } from '../../../../features/suggestions/suggestions-api';
import type { TodoResponse } from '../../../../features/todos/todos-api';
import type { WeekdayName } from '../../../../shared/lib/seoul-date';

/**
 * Everything on the staff home is derived here rather than in the components,
 * so each number has one definition that can be read on its own — several of
 * them are less obvious than they look, and the reasons live next to them.
 */

/** A cell is "O", "X", or a leave label the backend composed. */
function isLeaveSlot(slot: string) {
  return slot !== ATTENDANCE_PRESENT && slot !== ATTENDANCE_BLANK;
}

export type RoomSummary = {
  /** Members who hold a seat and are expected in the current operating slot. */
  expectedCount: number;
  /** Seat holders who are checked in right now, including an unexpected arrival. */
  seatedCount: number;
  notSeatedCount: number;
  onLeaveCount: number;
  /**
   * Expected members whose current slot is not O. Backend X covers both an
   * untouched cell and an explicitly reviewed absence, so this is not a count
   * of unfinished staff actions.
   */
  unmarkedCount: number;
  /** Expected-and-seated / expected; null after the operating day. */
  ratio: number | null;
};

const EMPTY_ROOM: RoomSummary = {
  expectedCount: 0,
  notSeatedCount: 0,
  onLeaveCount: 0,
  ratio: null,
  seatedCount: 0,
  unmarkedCount: 0,
};

/**
 * "How full is the room" needs a denominator the board does not hand over
 * directly. The board is seat-shaped: it returns every seat from 1 to at least
 * 102, and then appends every member who has no seat at all — which is where
 * staff and admins land, since they are members of the branch too but are never
 * assigned one. So the people expected right now are exactly the rows that
 * have both a memberId and a seatNumber, minus anyone whose current operating
 * slot is leave. Reading the board cell also covers fixed and special leave,
 * and respects a staff override to "O" without duplicating backend leave rules.
 *
 * A member with no seat yet — a new sign-up waiting to be placed — is excluded
 * on purpose. They cannot sit anywhere, so counting them as missing would make
 * the room look emptier than it is, and getting them a seat is already a todo.
 */
export function summariseRoom(
  board: DailyAttendanceBoard | undefined,
  live: StudyPresenceLiveResponse | undefined,
  currentSlot: OperationalAttendanceSlot | null,
  roster: MemberBeverageResponse[] | undefined,
): RoomSummary {
  if (!board || !roster) {
    return EMPTY_ROOM;
  }

  const memberIds = new Set(
    roster
      .filter((member) => member.role === 'MEMBER')
      .map((member) => member.memberId),
  );
  const seatHolderIds = new Set<number>();
  const expectedIds = new Set<number>();
  let onLeaveCount = 0;
  let unmarkedCount = 0;

  for (const row of board.rows) {
    if (
      row.memberId === null ||
      !memberIds.has(row.memberId) ||
      row.seatNumber === null ||
      (row.joinDate !== null && row.joinDate >= board.date)
    ) {
      continue;
    }

    seatHolderIds.add(row.memberId);

    if (currentSlot === null) {
      continue;
    }

    const currentStatus = row.slots[currentSlot - 1] ?? ATTENDANCE_BLANK;

    if (isLeaveSlot(currentStatus)) {
      onLeaveCount += 1;
      continue;
    }

    expectedIds.add(row.memberId);

    if (currentStatus !== ATTENDANCE_PRESENT) {
      unmarkedCount += 1;
    }
  }

  /*
   * Counted from the live sessions rather than taken from memberCount, because
   * that figure includes anyone checked in at the branch — a staff member who
   * scanned the door QR among them — and the ring is about seats.
   */
  const liveSeatHolderIds = new Set(
    (live?.sessions ?? [])
      .filter((session) => seatHolderIds.has(session.memberId))
      .map((session) => session.memberId),
  );
  const seatedCount = liveSeatHolderIds.size;
  const expectedCount = expectedIds.size;
  const expectedSeatedCount = [...expectedIds].filter((memberId) =>
    liveSeatHolderIds.has(memberId),
  ).length;

  return {
    expectedCount,
    notSeatedCount: Math.max(0, expectedCount - expectedSeatedCount),
    onLeaveCount,
    ratio: expectedCount > 0 ? expectedSeatedCount / expectedCount : null,
    seatedCount,
    unmarkedCount,
  };
}

export type TodoSummary = {
  remainingCount: number;
  urgentCount: number;
  /** The few worth showing on the home; the rest live on 운영. */
  preview: TodoResponse[];
};

const TODO_PREVIEW_LIMIT = 4;

export function summariseTodos(
  todos: TodoResponse[] | undefined,
  previewLimit = TODO_PREVIEW_LIMIT,
): TodoSummary {
  const remaining = (todos ?? []).filter((todo) => !todo.completed);
  /* Urgent first, then oldest first, so the list does not reshuffle on refetch. */
  const ordered = [...remaining].sort((left, right) => {
    if (left.priority !== right.priority) {
      return left.priority === 'URGENT' ? -1 : 1;
    }

    return left.createdAt.localeCompare(right.createdAt);
  });

  return {
    preview: ordered.slice(0, previewLimit),
    remainingCount: remaining.length,
    urgentCount: remaining.filter((todo) => todo.priority === 'URGENT').length,
  };
}

export function countOpenSuggestions(
  suggestions: SuggestionResponse[] | undefined,
) {
  return (suggestions ?? []).filter((suggestion) => !suggestion.isResolved)
    .length;
}

export type MealSummary = {
  memberCount: number;
  totalPrice: number;
};

export type MealsSummary = {
  dinner: MealSummary;
  lunch: MealSummary;
};

/**
 * People, not orders. One member can place more than one order for the same
 * meal, and the kitchen counts heads, so the headline figure is distinct
 * members while the money stays a straight sum.
 */
function summariseMeal(orders: DailySideDishResponse[]): MealSummary {
  return {
    memberCount: new Set(orders.map((order) => order.memberId)).size,
    totalPrice: orders.reduce((total, order) => total + order.totalPrice, 0),
  };
}

export function summariseMeals(
  orders: DailySideDishResponse[] | undefined,
): MealsSummary {
  const rows = orders ?? [];

  return {
    dinner: summariseMeal(rows.filter((order) => order.mealType === 'DINNER')),
    lunch: summariseMeal(rows.filter((order) => order.mealType === 'LUNCH')),
  };
}

export type ShiftCell = {
  dayOfWeek: WeekdayName;
  shift: StaffScheduleResponse['shift'];
  taskType: string;
};

export type ShiftSummary = {
  /** Today's cells for this staff member, morning before afternoon. */
  today: ShiftCell[];
  /** The whole week's, for the aside. */
  week: ShiftCell[];
  /**
   * True when the schedule loaded but this person's name is nowhere in it.
   * Distinguishes "no shift today" from "the name never matched", which is a
   * real possibility — see matchesWorker.
   */
  unmatched: boolean;
};

const SHIFT_ORDER: Record<StaffScheduleResponse['shift'], number> = {
  AFTERNOON: 1,
  MORNING: 0,
};

const WEEKDAY_ORDER: WeekdayName[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

/**
 * The schedule stores who works a cell as free text — `workerName`, with no
 * memberId behind it — so this is a name comparison and nothing stronger. Two
 * people sharing a name in one branch would both match, and a cell typed with a
 * nickname matches nobody. Whitespace is normalised because the field is typed
 * by hand; nothing else can be done about it from here.
 */
function matchesWorker(workerName: string, memberName: string) {
  const normalise = (value: string) => value.replace(/\s+/g, ' ').trim();
  const worker = normalise(workerName);

  return worker !== '' && worker === normalise(memberName);
}

export function summariseShifts(
  schedules: StaffScheduleResponse[] | undefined,
  today: WeekdayName,
  memberName: string | null,
): ShiftSummary {
  if (!schedules || !memberName) {
    return { today: [], unmatched: false, week: [] };
  }

  const mine = schedules
    .filter((cell) => matchesWorker(cell.workerName, memberName))
    .map<ShiftCell>((cell) => ({
      dayOfWeek: cell.dayOfWeek,
      shift: cell.shift,
      taskType: cell.taskType,
    }))
    .sort(
      (left, right) =>
        WEEKDAY_ORDER.indexOf(left.dayOfWeek) -
          WEEKDAY_ORDER.indexOf(right.dayOfWeek) ||
        SHIFT_ORDER[left.shift] - SHIFT_ORDER[right.shift],
    );

  return {
    today: mine.filter((cell) => cell.dayOfWeek === today),
    unmatched: schedules.length > 0 && mine.length === 0,
    week: mine,
  };
}

const SHIFT_LABELS: Record<StaffScheduleResponse['shift'], string> = {
  AFTERNOON: '오후',
  MORNING: '오전',
};

const TASK_LABELS: Record<string, string> = {
  DISHWASHING: '설거지',
  SERVE: '서빙',
};

export function formatShiftLabel(cell: ShiftCell) {
  return `${SHIFT_LABELS[cell.shift]} · ${TASK_LABELS[cell.taskType] ?? cell.taskType}`;
}

export function formatTaskLabel(taskType: string) {
  return TASK_LABELS[taskType] ?? taskType;
}

export function formatShiftPeriod(shift: StaffScheduleResponse['shift']) {
  return SHIFT_LABELS[shift];
}

export function formatPrice(value: number) {
  return `${value.toLocaleString('ko-KR')}원`;
}
