import {
  ATTENDANCE_BLANK,
  ATTENDANCE_PRESENT,
  type AttendanceSlotSource,
  type DailyAttendanceBoard,
} from '../../../../features/attendances/attendances-api';
import type { OperationalAttendanceSlot } from '../../../../features/attendances/attendance-rules';
import type {
  StudyPresenceLiveResponse,
  StudyPresenceManagerSessionResponse,
} from '../../../../features/study-presence/study-presence-api';

export const ATTENDANCE_SLOTS = [1, 2, 3, 4, 5, 6, 7] as const;

export type AttendanceCellState = 'leave' | 'present' | 'unmarked';

export type StaffAttendanceCell = {
  label: string;
  source: AttendanceSlotSource;
  state: AttendanceCellState;
};

export type StaffAttendanceMember = {
  memberId: number;
  name: string;
  seatNumber: number;
  slots: StaffAttendanceCell[];
};

export type StaffAttendanceSummary = {
  checkedInCount: number | null;
  expectedCount: number | null;
  leaveCount: number | null;
  presentCount: number | null;
  unmarkedCount: number | null;
};

/**
 * The endpoint is seat-shaped, so vacant seats and seatless rows are never
 * people on this board. Keeping that rule here prevents every component from
 * inventing its own denominator.
 */
export function buildSeatedAttendanceMembers(
  board: DailyAttendanceBoard | undefined,
): StaffAttendanceMember[] {
  if (!board) {
    return [];
  }

  return board.rows
    .filter(
      (row): row is typeof row & { memberId: number; seatNumber: number } =>
        row.memberId !== null && row.seatNumber !== null && row.seatNumber > 0,
    )
    .map((row) => ({
      memberId: row.memberId,
      name: row.name,
      seatNumber: row.seatNumber,
      slots: ATTENDANCE_SLOTS.map((slot) =>
        toAttendanceCell(
          row.slots[slot - 1] ?? ATTENDANCE_BLANK,
          row.slotSources[slot - 1] ?? 'NONE',
        ),
      ),
    }))
    .sort(
      (left, right) =>
        left.seatNumber - right.seatNumber ||
        left.name.localeCompare(right.name, 'ko'),
    );
}

/**
 * Live presence is a branch feed, not a member feed. Staff/admin sessions are
 * legitimate backend rows but must not be counted as students. Duplicate
 * active rows are collapsed defensively so the headline remains a people
 * count even if a legacy record violates the one-active-session invariant.
 */
export function buildActiveMemberSessions(
  live: StudyPresenceLiveResponse | undefined,
  expectedBranchId: number,
): StudyPresenceManagerSessionResponse[] {
  const byMemberId = new Map<number, StudyPresenceManagerSessionResponse>();

  for (const session of live?.sessions ?? []) {
    if (
      session.branchId !== expectedBranchId ||
      session.memberRole !== 'MEMBER' ||
      !session.currentlyActive
    ) {
      continue;
    }

    const current = byMemberId.get(session.memberId);

    if (
      !current ||
      Date.parse(session.checkedInAt) > Date.parse(current.checkedInAt)
    ) {
      byMemberId.set(session.memberId, session);
    }
  }

  return [...byMemberId.values()].sort((left, right) => {
    if (left.seatNumber === null && right.seatNumber !== null) {
      return 1;
    }

    if (left.seatNumber !== null && right.seatNumber === null) {
      return -1;
    }

    if (left.seatNumber !== null && right.seatNumber !== null) {
      const seatOrder = left.seatNumber - right.seatNumber;

      if (seatOrder !== 0) {
        return seatOrder;
      }
    }

    return (left.memberName ?? '').localeCompare(right.memberName ?? '', 'ko');
  });
}

export function buildAttendanceSummary({
  activeSlot,
  boardReady,
  liveReady,
  members,
  sessions,
}: {
  activeSlot: OperationalAttendanceSlot | null;
  boardReady: boolean;
  liveReady: boolean;
  members: StaffAttendanceMember[];
  sessions: StudyPresenceManagerSessionResponse[];
}): StaffAttendanceSummary {
  const slotCells =
    activeSlot === null
      ? null
      : members.map((member) => member.slots[activeSlot - 1]);

  return {
    checkedInCount: liveReady ? sessions.length : null,
    expectedCount: boardReady ? members.length : null,
    leaveCount:
      boardReady && slotCells
        ? slotCells.filter((cell) => cell.state === 'leave').length
        : null,
    presentCount:
      boardReady && slotCells
        ? slotCells.filter((cell) => cell.state === 'present').length
        : null,
    unmarkedCount:
      boardReady && slotCells
        ? slotCells.filter((cell) => cell.state === 'unmarked').length
        : null,
  };
}

function toAttendanceCell(
  value: string,
  source: AttendanceSlotSource,
): StaffAttendanceCell {
  if (value === ATTENDANCE_PRESENT) {
    return { label: 'O', source, state: 'present' };
  }

  if (value === ATTENDANCE_BLANK) {
    return { label: '미처리', source, state: 'unmarked' };
  }

  return {
    label: value.trim() || '휴무',
    source,
    state: 'leave',
  };
}
