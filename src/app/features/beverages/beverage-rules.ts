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
 * it is how the branch actually runs, confirmed with the operator — so every
 * rule carries the reason it exists.
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

/**
 * Preparation starts at 08:00 and serving finishes before attendance is
 * checked at 09:00. Use known period-1 leave/absence, not confirmed presence:
 * an untouched X is still expected to attend and needs a drink prepared.
 * Any leave covering period 1 (including custom or recurring leave) excludes
 * service, as does an explicitly reviewed absence. Later periods never decide
 * this morning round; members arriving later use self-service.
 */
export function isFirstPeriodDrinkExcluded(row: AttendanceBoardRow) {
  const status = row.slots[0];
  const source = row.slotSources[0];

  // Custom leave labels can even be "O" or "X"; provenance decides first.
  // A real present override is returned as O + NONE by the attendance board.
  if (
    source === 'MANAGER_LEAVE' ||
    source === 'MEMBER_LEAVE' ||
    source === 'MANAGER_ABSENT'
  ) {
    return true;
  }

  return Boolean(
    status && status !== ATTENDANCE_PRESENT && status !== ATTENDANCE_BLANK,
  );
}

export function firstPeriodDrinkExcludedMemberIds(
  board: DailyAttendanceBoard | undefined,
) {
  const ids = new Set<number>();

  for (const row of board?.rows ?? []) {
    if (row.memberId !== null && isFirstPeriodDrinkExcluded(row)) {
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
  /** Period-1 leave or confirmed absence: this drink is not made or served. */
  deducted: boolean;
};

export type DrinkCount = {
  name: string;
  /** Everyone who has this drink registered. */
  total: number;
  /** Drinks excluded by period-1 leave or confirmed absence. */
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
  const away = firstPeriodDrinkExcludedMemberIds(board);
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
