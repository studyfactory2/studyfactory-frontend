import type { DailyAttendanceBoard } from '../../../../features/attendances/attendances-api';
import {
  formatMemberLabel,
  isExcludedDrink,
  isTumblerDrink,
  morningLeaveMemberIds,
} from '../../../../features/beverages/beverage-rules';
import type { MemberBeverageResponse } from '../../../../features/beverages/beverages-api';
import type { DailyLeaveStatusResponse } from '../../../../features/leaves/leaves-api';
import type {
  RoomLayout,
  RoomLayoutItem,
} from '../../../../features/rooms/rooms-api';

/*
 * Screen-shaped derivations for the beverages page: the room map, and the two
 * notices beside it. The counting rules themselves live in
 * features/beverages/beverage-rules.ts, because the staff home asks for the
 * same numbers and one of the two would otherwise drift.
 */

/** Re-exported so components import their types from one place. */
export {
  formatMemberLabel,
  type DrinkCount,
  type DrinkServing,
  type MakingBoard,
} from '../../../../features/beverages/beverage-rules';

/**
 * Leave asked for between eight and nine lands after the drinks are already
 * being made. Nothing can be un-made by then, so this window drives a notice
 * rather than the count.
 */
const LATE_LEAVE_FROM_HOUR = 8;
const LATE_LEAVE_TO_HOUR = 9;

export type BeverageAlert = {
  id: string;
  label: string;
  detail: string;
};

/**
 * Whose drink was registered or edited today. The person making them wants to
 * know which cups are not the ones they made yesterday.
 */
export function findTodayChanges(
  members: MemberBeverageResponse[] | undefined,
  todayDateKey: string,
): BeverageAlert[] {
  return (members ?? [])
    .flatMap((member) => {
      const created = (member.createdAt ?? '').slice(0, 10);
      const updated = (member.updatedAt ?? '').slice(0, 10);

      if (created !== todayDateKey && updated !== todayDateKey) {
        return [];
      }

      return [
        {
          detail: created === todayDateKey ? '신청' : '변경',
          id: `change-${member.memberId}`,
          label: formatMemberLabel(member.seatNumber, member.memberName),
        },
      ];
    })
    .sort((left, right) =>
      left.label.localeCompare(right.label, 'ko', { numeric: true }),
    );
}

/**
 * Leave asked for between eight and nine, when the drinks are already being
 * made. Nothing can be un-made by then, so this is not a count adjustment — it
 * is a heads-up that there will be spare cups and why.
 *
 * 오후반차 is excluded for the same reason it is excluded from the deduction:
 * that member is here all morning and drinks theirs.
 */
export function findLateLeaves(
  statuses: DailyLeaveStatusResponse[] | undefined,
  todayDateKey: string,
): BeverageAlert[] {
  const seen = new Set<number>();

  return (statuses ?? [])
    .filter((status) => {
      if (
        status.leaveType === 'AFTERNOON' ||
        status.leaveDate !== todayDateKey
      ) {
        return false;
      }

      if (status.requestedAfterEight !== null) {
        return status.requestedAfterEight;
      }

      const requestedAt = new Date(status.createdAt);

      return (
        !Number.isNaN(requestedAt.getTime()) &&
        status.createdAt.slice(0, 10) === todayDateKey &&
        requestedAt.getHours() >= LATE_LEAVE_FROM_HOUR &&
        requestedAt.getHours() < LATE_LEAVE_TO_HOUR
      );
    })
    .filter((status) => {
      if (seen.has(status.memberId)) {
        return false;
      }

      seen.add(status.memberId);

      return true;
    })
    .map((status) => ({
      detail: status.label ?? formatLeaveType(status.leaveType),
      id: `late-${status.memberId}`,
      label: formatMemberLabel(status.seatNumber, status.name),
    }))
    .sort((left, right) =>
      left.label.localeCompare(right.label, 'ko', { numeric: true }),
    );
}

export type RoomCell = {
  key: string;
  item: RoomLayoutItem;
  /** From the beverage list, so it opens that member's editor. */
  memberId: number | null;
  memberName: string | null;
  drinks: string[];
  notes: string[];
  /** Off this morning, so this seat gets nothing on the walk. */
  away: boolean;
  /** At least one drink goes in the member's own tumbler, not a cup. */
  tumbler: boolean;
};

/** The colour a room is drawn in. Rooms alternate, so two rooms never match. */
export type RoomTone = 'forest' | 'gold';

const ROOM_TONES: readonly RoomTone[] = ['forest', 'gold'];

export type RoomView = {
  id: number;
  name: string;
  rows: number;
  cols: number;
  cells: RoomCell[];
  /** Carried by the tab, the floor, and the door, so a room is recognisable at a glance. */
  tone: RoomTone;
};

/**
 * The map is keyed by seat number rather than memberId: a seat carries a
 * memberId too, but the beverage list only knows seat numbers, and the two can
 * disagree while an assignment is mid-change.
 */
export function buildRoomViews(
  rooms: RoomLayout[] | undefined,
  members: MemberBeverageResponse[] | undefined,
  board: DailyAttendanceBoard | undefined,
): RoomView[] {
  const away = morningLeaveMemberIds(board);
  const bySeat = new Map<number, MemberBeverageResponse>();

  for (const member of members ?? []) {
    if (member.seatNumber !== null && member.seatNumber > 0) {
      bySeat.set(member.seatNumber, member);
    }
  }

  return (rooms ?? []).map((room, index) => ({
    cells: room.items.map((item) => {
      const member = item.number === null ? undefined : bySeat.get(item.number);
      const drinks = (member?.items ?? [])
        .map((drink) => drink.name.trim())
        .filter((name) => name !== '' && !isExcludedDrink(name));

      return {
        away: member ? away.has(member.memberId) : false,
        drinks,
        item,
        key: `${room.id}-${item.id}`,
        memberId: member?.memberId ?? null,
        memberName: member?.memberName ?? null,
        notes: (member?.items ?? [])
          .map((drink) => (drink.note ?? '').trim())
          .filter((note) => note !== ''),
        tumbler: drinks.some(isTumblerDrink),
      };
    }),
    cols: room.cols,
    id: room.id,
    name: room.name,
    rows: room.rows,
    tone: ROOM_TONES[index % ROOM_TONES.length] ?? 'forest',
  }));
}

/**
 * Everyone whose drinks the map cannot show, because they have no seat to draw
 * them on. Without this they would silently go unmade.
 */
export function findUnseatedDrinkers(
  members: MemberBeverageResponse[] | undefined,
  board: DailyAttendanceBoard | undefined,
) {
  const away = morningLeaveMemberIds(board);

  return (members ?? [])
    .filter(
      (member) =>
        (member.seatNumber === null || member.seatNumber <= 0) &&
        member.items.some(
          (item) => item.name.trim() !== '' && !isExcludedDrink(item.name),
        ),
    )
    .map((member) => {
      const drinks = member.items
        .map((item) => item.name.trim())
        .filter((name) => name !== '' && !isExcludedDrink(name));

      return {
        away: away.has(member.memberId),
        drinks,
        memberId: member.memberId,
        memberName: member.memberName,
        /* Staff have no seat by design; saying so stops "why no seat?" at a glance. */
        staff: member.role !== 'MEMBER',
        tumbler: drinks.some(isTumblerDrink),
      };
    });
}

/**
 * Drinks as a seat shows them: repeats folded into a count, so two 아아 read as
 * "아아 ×2" in a 45px cell instead of "아아, 아아". Order of first appearance.
 */
export function formatDrinkList(drinks: readonly string[]) {
  const counts = new Map<string, number>();

  for (const drink of drinks) {
    counts.set(drink, (counts.get(drink) ?? 0) + 1);
  }

  return [...counts]
    .map(([name, count]) => (count > 1 ? `${name} ×${count}` : name))
    .join(', ');
}

function formatLeaveType(leaveType: DailyLeaveStatusResponse['leaveType']) {
  if (leaveType === 'FULL') {
    return '월차';
  }

  if (leaveType === 'MORNING') {
    return '오전 반차';
  }

  if (leaveType === 'AFTERNOON') {
    return '오후 반차';
  }

  return '휴무';
}
