import type {
  AttendanceBoardRow,
  DailyAttendanceBoard,
} from '../attendances/attendances-api';
import {
  ATTENDANCE_BLANK,
  ATTENDANCE_PRESENT,
} from '../attendances/attendances-api';
import type { MemberBeverageResponse } from './beverages-api';

/*
 * How the morning drink round is counted. None of this is visible in a DTO —
 * it is how the branch actually runs, learned from the screen that ran it
 * before — so every rule carries the reason it exists.
 *
 * It lives at feature level rather than inside one screen because two screens
 * ask the same question: the staff home wants the number, the beverages screen
 * wants the number and the list behind it. Two copies would drift, and the
 * first thing to drift would be the leave deduction.
 */

/**
 * The names the branch actually uses, offered as one-tap picks in the staff
 * editor. Free text is still allowed — but the making list groups by name, so
 * "아아" typed one way and "아이스 아메리카노" typed another would count as two
 * drinks, and the picks keep that from happening by default.
 */
export const DRINK_QUICK_PICKS = [
  '아아',
  '뜨아',
  '텀아아',
  '텀뜨아',
  '선식',
  '해독',
] as const;

/** Members type these when they do not want a drink. */
const EXCLUDED_DRINK_NAMES = new Set(['없음', 'x', '안먹음']);

/** Slots 1–3. Slot 4 is shared by both half-days, so it cannot decide this. */
const MORNING_SLOTS = [0, 1, 2];

function normaliseDrinkName(name: string) {
  return name.replace(/\s+/g, '');
}

export function isExcludedDrink(name: string) {
  return EXCLUDED_DRINK_NAMES.has(normaliseDrinkName(name).toLowerCase());
}

/**
 * A "텀" drink is one the member brings their own tumbler for — 텀아아, 텀뜨아.
 * It is a different job from a cup drink, so the two are counted apart rather
 * than summed into one number the person making them cannot act on.
 */
export function isTumblerDrink(name: string) {
  return normaliseDrinkName(name).includes('텀');
}

/**
 * `joinDate` is a backend LocalDate, so comparing it with the date key from
 * useSeoulToday keeps the decision in the branch's Asia/Seoul calendar. A
 * missing date is treated as already active for legacy members.
 */
export function hasJoinedByDate(joinDate: string | null, seoulDateKey: string) {
  return joinDate === null || joinDate <= seoulDateKey;
}

function isLeaveSlot(slot: string) {
  return slot !== ATTENDANCE_PRESENT && slot !== ATTENDANCE_BLANK;
}

/**
 * Drinks go out in the morning, so a 월차 or 오전반차 member never receives one
 * and their drinks come off the count. 오후반차 is the case that catches people
 * out: they are in the room all morning and do get a drink.
 */
export function isOnMorningLeave(row: AttendanceBoardRow) {
  return MORNING_SLOTS.every((index) => isLeaveSlot(row.slots[index] ?? ''));
}

export function morningLeaveMemberIds(board: DailyAttendanceBoard | undefined) {
  const ids = new Set<number>();

  for (const row of board?.rows ?? []) {
    if (row.memberId !== null && isOnMorningLeave(row)) {
      ids.add(row.memberId);
    }
  }

  return ids;
}

export type DrinkServing = {
  memberId: number;
  memberName: string;
  seatNumber: number | null;
  note: string | null;
  /** True when this member is off this morning, so the cup is not made. */
  deducted: boolean;
};

export type DrinkCount = {
  name: string;
  /** Everyone who has this drink registered. */
  total: number;
  /** How many of those are away this morning. */
  deduction: number;
  /** total − deduction: the number actually to make. */
  toMake: number;
  servings: DrinkServing[];
};

export type MakingBoard = {
  cup: DrinkCount[];
  tumbler: DrinkCount[];
  cupToMake: number;
  tumblerToMake: number;
  toMake: number;
  deduction: number;
  kindCount: number;
  noteCount: number;
};

/**
 * Grouped by drink because that is the order they get made in — all the iced
 * americanos at once — while the seat numbers ride along so the same list can
 * be read again on the walk round.
 */
export function buildMakingBoard(
  members: MemberBeverageResponse[] | undefined,
  board: DailyAttendanceBoard | undefined,
  seoulDateKey: string,
): MakingBoard {
  const away = morningLeaveMemberIds(board);
  const groups = new Map<string, DrinkCount>();

  for (const member of members ?? []) {
    if (!hasJoinedByDate(member.joinDate, seoulDateKey)) {
      continue;
    }

    for (const item of member.items) {
      const name = item.name.trim();

      if (name === '' || isExcludedDrink(name)) {
        continue;
      }

      const key = normaliseDrinkName(name);
      const group = groups.get(key) ?? {
        deduction: 0,
        name,
        servings: [],
        toMake: 0,
        total: 0,
      };
      const deducted = away.has(member.memberId);

      group.total += 1;
      group.deduction += deducted ? 1 : 0;
      group.toMake = group.total - group.deduction;
      group.servings.push({
        deducted,
        memberId: member.memberId,
        memberName: member.memberName,
        note: (item.note ?? '').trim() || null,
        seatNumber: member.seatNumber,
      });
      groups.set(key, group);
    }
  }

  const ordered = [...groups.values()]
    .map((group) => ({
      ...group,
      /* Deducted servings last, so the cups actually being made read first. */
      servings: [...group.servings].sort(
        (left, right) =>
          Number(left.deducted) - Number(right.deducted) ||
          (left.seatNumber ?? Number.MAX_SAFE_INTEGER) -
            (right.seatNumber ?? Number.MAX_SAFE_INTEGER),
      ),
    }))
    .sort(
      (left, right) =>
        right.toMake - left.toMake || left.name.localeCompare(right.name, 'ko'),
    );

  const cup = ordered.filter((group) => !isTumblerDrink(group.name));
  const tumbler = ordered.filter((group) => isTumblerDrink(group.name));
  const sum = (groups_: DrinkCount[], pick: (group: DrinkCount) => number) =>
    groups_.reduce((total, group) => total + pick(group), 0);

  return {
    cup,
    cupToMake: sum(cup, (group) => group.toMake),
    deduction: sum(ordered, (group) => group.deduction),
    kindCount: ordered.length,
    noteCount: sum(
      ordered,
      (group) =>
        group.servings.filter(
          (serving) => serving.note !== null && !serving.deducted,
        ).length,
    ),
    toMake: sum(ordered, (group) => group.toMake),
    tumbler,
    tumblerToMake: sum(tumbler, (group) => group.toMake),
  };
}

/** Seat number first, because that is how the room is walked. */
export function formatMemberLabel(
  seatNumber: number | null,
  memberName: string,
) {
  return seatNumber !== null && seatNumber > 0
    ? `${seatNumber}번 ${memberName}`
    : memberName;
}
