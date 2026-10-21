import {
  ATTENDANCE_BLANK,
  ATTENDANCE_PRESENT,
  type AttendanceSlotSource,
  type AttendanceSlotUpdateInput,
  type AttendanceReasonApplyInput,
  type AttendanceReasonApplyResponse,
  type DailyAttendanceBoard,
} from '../../../../features/attendances/attendances-api';
import type {
  StudyPresenceManagerHistoryResponse,
  StudyPresenceManagerSessionResponse,
} from '../../../../features/study-presence/study-presence-api';
import type { MemberResponse } from '../../../../features/members/members-api';
import type { OperationalAttendanceSlot } from '../../../../features/attendances/attendance-rules';
import type { ExcessLeaveRequest } from '../../../../features/leaves/leaves-api';
import {
  isAttendanceRole,
  type AttendanceTargetRole,
} from './attendance-targets';
import { addDays } from '../../../../shared/lib/seoul-date';
import { getActiveExcessLeaveRequests } from './attendance-excess-leave';

export const ATTENDANCE_SLOTS = [1, 2, 3, 4, 5, 6, 7] as const;

export type AttendanceCellState = 'absent' | 'leave' | 'present' | 'unmarked';
export type AttendanceMemberStage = 'active' | 'starts-today' | 'future';
export type AttendanceSelectionTiming = 'current' | 'future' | 'past';

export type AttendanceBoardCell = {
  label: string;
  source: AttendanceSlotSource;
  state: AttendanceCellState;
};

export type AttendanceBoardMember = {
  joinDate: string | null;
  memberId: number;
  name: string;
  presence: AttendanceBoardPresence | null;
  role: AttendanceTargetRole;
  seatNumber: number | null;
  excessLeaveRequests: ExcessLeaveRequest[];
  slots: AttendanceBoardCell[];
  stage: AttendanceMemberStage;
};

export type AttendanceBoardPresence = {
  activeSessionId: number | null;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  currentlyActive: boolean;
  sessionCount: number;
};

export type AttendanceSelection = {
  cell: AttendanceBoardCell;
  memberId: number;
  name: string;
  seatNumber: number | null;
  slot: (typeof ATTENDANCE_SLOTS)[number];
};

export type AttendanceSlotCommand = Omit<AttendanceSlotUpdateInput, 'date'>;

export type AttendanceReasonCommand = AttendanceReasonApplyInput & {
  action?: 'apply' | 'cancel' | 'repeat' | 'cancel-repeat';
  fixedLeaveId?: number;
};

/** Validate again at the action boundary; the form is not a trust boundary. */
export function validateAttendanceReasonCommand(
  command: AttendanceReasonCommand,
  todayKey: string,
  joinDate: string | null,
) {
  if (command.action === 'cancel-repeat') {
    return Number.isInteger(command.fixedLeaveId) &&
      (command.fixedLeaveId ?? 0) > 0
      ? null
      : '취소할 반복 일정을 선택해 주세요.';
  }
  const reason = command.reason.trim();
  if (command.action !== 'cancel' && (!reason || reason.length > 40)) {
    return '사유를 1~40자로 입력해 주세요.';
  }
  if (
    command.dates.length < 1 ||
    command.dates.length > 31 ||
    new Set(command.dates).size !== command.dates.length ||
    command.dates.some((date) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return true;
      }
      try {
        return (
          addDays(date, 0) !== date ||
          (command.action === 'repeat' && date < todayKey) ||
          (joinDate !== null && date < joinDate)
        );
      } catch {
        return true;
      }
    })
  ) {
    return command.action === 'repeat'
      ? '반복 신청은 입사일 이후의 오늘 또는 미래 날짜를 선택해 주세요.'
      : '입사일부터 유효한 날짜를 최대 31일까지 선택해 주세요.';
  }
  if (
    command.slots.length < 1 ||
    command.slots.length > 7 ||
    new Set(command.slots).size !== command.slots.length ||
    command.slots.some(
      (slot) => !Number.isInteger(slot) || slot < 1 || slot > 7,
    )
  ) {
    return '1~7교시 중 적용할 교시를 선택해 주세요.';
  }
  return null;
}

export function attendanceReasonSuccessMessage(
  result: AttendanceReasonApplyResponse,
) {
  if (result.appliedPeriodCount === 0) {
    return `선택한 ${result.preservedPresentCount}개 교시는 이미 출석되어 그대로 유지했어요.`;
  }
  return result.preservedPresentCount > 0
    ? `${result.appliedPeriodCount}개 교시에 사유를 등록하고, 출석한 ${result.preservedPresentCount}개 교시는 유지했어요.`
    : `${result.appliedPeriodCount}개 교시에 사유를 등록했어요.`;
}

export function toAttendanceCellKey(memberId: number, slot: number) {
  return `${memberId}:${slot}`;
}

export function toAttendanceCellId(memberId: number, slot: number) {
  return `attendance-board-cell-${memberId}-${slot}`;
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
): AttendanceBoardMember[] {
  if (!board || !roster) {
    return [];
  }

  const memberRoles = new Map<number, AttendanceTargetRole>();
  const memberJoinDates = new Map(
    roster.map((member) => [member.id, member.joinDate]),
  );

  for (const member of roster) {
    if (isAttendanceRole(member.role)) {
      memberRoles.set(member.id, member.role);
    }
  }
  const presenceByMemberId = history
    ? buildDailyMemberPresence(history.sessions)
    : null;

  return board.rows
    .flatMap((row) => {
      const role =
        row.memberId === null ? undefined : memberRoles.get(row.memberId);

      if (row.memberId === null || role === undefined) {
        return [];
      }

      return [
        {
          // The board hides joinDate after initialization; keep the real start
          // date for multi-date leave validation without changing row stage.
          joinDate: row.joinDate ?? memberJoinDates.get(row.memberId) ?? null,
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
          role,
          seatNumber:
            row.seatNumber !== null && row.seatNumber > 0
              ? row.seatNumber
              : null,
          excessLeaveRequests: getActiveExcessLeaveRequests(
            row.excessLeaveRequests,
          ),
          slots: ATTENDANCE_SLOTS.map((slot) =>
            toAttendanceCell(
              row.slots[slot - 1] ?? ATTENDANCE_BLANK,
              row.slotSources[slot - 1] ?? 'NONE',
            ),
          ),
          stage: toMemberStage(row.joinDate, board.date),
        },
      ];
    })
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
  const byMemberId = new Map<number, AttendanceBoardPresence>();
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
): AttendanceBoardCell {
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
