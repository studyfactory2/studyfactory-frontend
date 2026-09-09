import {
  ATTENDANCE_BLANK,
  ATTENDANCE_PRESENT,
  type AttendanceSlotSource,
  type AttendanceSlotUpdateInput,
  type DailyAttendanceBoard,
} from '../../../../features/attendances/attendances-api';
import type {
  StudyPresenceManagerHistoryResponse,
  StudyPresenceManagerSessionResponse,
} from '../../../../features/study-presence/study-presence-api';
import type { MemberResponse } from '../../../../features/members/members-api';
import type { OperationalAttendanceSlot } from '../../../../features/attendances/attendance-rules';

export const ATTENDANCE_SLOTS = [1, 2, 3, 4, 5, 6, 7] as const;

export type AttendanceCellState = 'absent' | 'leave' | 'present' | 'unmarked';
export type AttendanceMemberStage = 'active' | 'starts-today' | 'future';
export type AttendanceSelectionTiming = 'current' | 'future' | 'past';

export type StaffAttendanceCell = {
  label: string;
  source: AttendanceSlotSource;
  state: AttendanceCellState;
};

export type StaffAttendanceMember = {
  joinDate: string | null;
  memberId: number;
  name: string;
  presence: StaffAttendancePresence | null;
  seatNumber: number | null;
  slots: StaffAttendanceCell[];
  stage: AttendanceMemberStage;
};

export type StaffAttendancePresence = {
  activeSessionId: number | null;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  currentlyActive: boolean;
  sessionCount: number;
};

export type AttendanceSelection = {
  cell: StaffAttendanceCell;
  memberId: number;
  name: string;
  seatNumber: number | null;
  slot: (typeof ATTENDANCE_SLOTS)[number];
};

export type AttendanceSlotCommand = Omit<AttendanceSlotUpdateInput, 'date'>;

export type AttendancePaintMode = AttendanceSlotCommand['status'] | null;

export function toAttendanceCellKey(memberId: number, slot: number) {
  return `${memberId}:${slot}`;
}

export function toAttendanceCellId(memberId: number, slot: number) {
  return `staff-attendance-cell-${memberId}-${slot}`;
}

export function toAttendanceSelectionTiming(
  slot: OperationalAttendanceSlot,
  activeSlot: OperationalAttendanceSlot | null,
  operationalSlot: OperationalAttendanceSlot | null,
): AttendanceSelectionTiming {
  if (activeSlot !== null) {
    if (slot < activeSlot) {
      return 'past';
    }

    return slot === activeSlot ? 'current' : 'future';
  }

  return operationalSlot === null ? 'past' : 'future';
}

/**
 * The endpoint is seat-shaped, so vacant seats are not people, while a row
 * with a member and no seat is still an operational member. Pre-start members
 * remain in the roster with an explicit stage so the screen can explain why
 * they are not ordinary missing rows.
 */
export function buildAttendanceMembers(
  board: DailyAttendanceBoard | undefined,
  history: StudyPresenceManagerHistoryResponse | undefined,
  roster: MemberResponse[] | undefined,
): StaffAttendanceMember[] {
  if (!board || !roster) {
    return [];
  }

  const memberIds = new Set(
    roster
      .filter((member) => member.role === 'MEMBER')
      .map((member) => member.id),
  );
  const presenceByMemberId = history
    ? buildDailyMemberPresence(history.sessions)
    : null;

  return board.rows
    .filter(
      (row): row is typeof row & { memberId: number } =>
        row.memberId !== null && memberIds.has(row.memberId),
    )
    .map((row) => ({
      joinDate: row.joinDate,
      memberId: row.memberId,
      name: row.name,
      presence:
        presenceByMemberId?.get(row.memberId) ??
        (history
          ? {
              activeSessionId: null,
              checkedInAt: null,
              checkedOutAt: null,
              currentlyActive: false,
              sessionCount: 0,
            }
          : null),
      seatNumber:
        row.seatNumber !== null && row.seatNumber > 0 ? row.seatNumber : null,
      slots: ATTENDANCE_SLOTS.map((slot) =>
        toAttendanceCell(
          row.slots[slot - 1] ?? ATTENDANCE_BLANK,
          row.slotSources[slot - 1] ?? 'NONE',
        ),
      ),
      stage: toMemberStage(row.joinDate, board.date),
    }))
    .sort(
      (left, right) =>
        (left.seatNumber ?? Number.MAX_SAFE_INTEGER) -
          (right.seatNumber ?? Number.MAX_SAFE_INTEGER) ||
        left.name.localeCompare(right.name, 'ko'),
    );
}

function toMemberStage(
  joinDate: string | null,
  boardDate: string,
): AttendanceMemberStage {
  if (!joinDate || joinDate < boardDate) {
    return 'active';
  }

  return joinDate === boardDate ? 'starts-today' : 'future';
}

/**
 * A member may leave and re-enter during one day. The compact attendance row
 * shows the day's first check-in and final check-out; while any session is
 * still active, checkout intentionally remains open instead of showing an
 * earlier intermediate departure.
 */
export function buildDailyMemberPresence(
  sessions: StudyPresenceManagerSessionResponse[],
) {
  const byMemberId = new Map<number, StaffAttendancePresence>();
  const seenSessionIds = new Set<number>();

  for (const session of sessions) {
    if (seenSessionIds.has(session.sessionId)) {
      continue;
    }

    seenSessionIds.add(session.sessionId);
    const current = byMemberId.get(session.memberId) ?? {
      activeSessionId: null,
      checkedInAt: null,
      checkedOutAt: null,
      currentlyActive: false,
      sessionCount: 0,
    };

    current.sessionCount += 1;
    current.checkedInAt = earlierTimestamp(
      current.checkedInAt,
      session.checkedInAt,
    );
    current.currentlyActive ||= session.currentlyActive;

    if (session.currentlyActive) {
      current.activeSessionId = session.sessionId;
    }

    if (!session.currentlyActive && session.checkedOutAt) {
      current.checkedOutAt = laterTimestamp(
        current.checkedOutAt,
        session.checkedOutAt,
      );
    }

    byMemberId.set(session.memberId, current);
  }

  for (const presence of byMemberId.values()) {
    if (presence.currentlyActive) {
      presence.checkedOutAt = null;
    }
  }

  return byMemberId;
}

function earlierTimestamp(current: string | null, candidate: string) {
  const candidateMs = Date.parse(candidate);

  if (!Number.isFinite(candidateMs)) {
    return current;
  }

  if (!current || !Number.isFinite(Date.parse(current))) {
    return candidate;
  }

  return candidateMs < Date.parse(current) ? candidate : current;
}

function laterTimestamp(current: string | null, candidate: string) {
  const candidateMs = Date.parse(candidate);

  if (!Number.isFinite(candidateMs)) {
    return current;
  }

  if (!current || !Number.isFinite(Date.parse(current))) {
    return candidate;
  }

  return candidateMs > Date.parse(current) ? candidate : current;
}

function toAttendanceCell(
  value: string,
  source: AttendanceSlotSource,
): StaffAttendanceCell {
  if (source === 'MANAGER_ABSENT') {
    return { label: 'X', source, state: 'absent' };
  }

  if (source !== 'NONE') {
    return {
      label: value.trim() || '휴무',
      source,
      state: 'leave',
    };
  }

  if (value === ATTENDANCE_PRESENT) {
    return { label: 'O', source, state: 'present' };
  }

  if (value === ATTENDANCE_BLANK) {
    return { label: '—', source, state: 'unmarked' };
  }

  return {
    label: value.trim() || '휴무',
    source,
    state: 'leave',
  };
}
