import {
  ATTENDANCE_BLANK,
  ATTENDANCE_PRESENT,
  type AttendanceSlotSource,
  type DailyAttendanceBoard,
} from '../../../../features/attendances/attendances-api';
import type {
  StudyPresenceManagerHistoryResponse,
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
  presence: StaffAttendancePresence | null;
  seatNumber: number;
  slots: StaffAttendanceCell[];
};

export type StaffAttendancePresence = {
  checkedInAt: string | null;
  checkedOutAt: string | null;
  currentlyActive: boolean;
  sessionCount: number;
};

/**
 * The endpoint is seat-shaped, so vacant seats and seatless rows are never
 * people on this board. Keeping that rule here prevents every component from
 * inventing its own denominator.
 */
export function buildSeatedAttendanceMembers(
  board: DailyAttendanceBoard | undefined,
  history: StudyPresenceManagerHistoryResponse | undefined,
): StaffAttendanceMember[] {
  if (!board) {
    return [];
  }

  const presenceByMemberId = history
    ? buildDailyMemberPresence(history.sessions)
    : null;

  return board.rows
    .filter(
      (row): row is typeof row & { memberId: number; seatNumber: number } =>
        row.memberId !== null && row.seatNumber !== null && row.seatNumber > 0,
    )
    .map((row) => ({
      memberId: row.memberId,
      name: row.name,
      presence:
        presenceByMemberId?.get(row.memberId) ??
        (history
          ? {
              checkedInAt: null,
              checkedOutAt: null,
              currentlyActive: false,
              sessionCount: 0,
            }
          : null),
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
