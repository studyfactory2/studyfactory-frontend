import type { KeyboardEvent } from 'react';
import type { OperationalAttendanceSlot } from '../../../../features/attendances/attendance-rules';
import { cx } from '../../../../shared/lib/cx';
import type {
  AttendanceSelectionTiming,
  AttendanceBoardCell,
  AttendanceBoardMember,
} from '../model/attendance-board';
import { toAttendanceCellId } from '../model/attendance-board';
import {
  getSlotExcessLeaveRequests,
  isExcessMemberLeaveCell,
} from '../model/attendance-excess-leave';

type AttendanceStatusCellProps = {
  cell: AttendanceBoardCell | undefined;
  disabled: boolean;
  interactive: boolean;
  member: AttendanceBoardMember;
  onActivate: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  onSelect: () => void;
  pending: boolean;
  selected: boolean;
  slot: OperationalAttendanceSlot;
  tabStop: boolean;
  timing: AttendanceSelectionTiming;
};

export function AttendanceStatusCell({
  cell,
  disabled,
  interactive,
  member,
  onActivate,
  onKeyDown,
  onSelect,
  pending,
  selected,
  slot,
  tabStop,
  timing,
}: AttendanceStatusCellProps) {
  const safeCell = cell ?? {
    label: '—',
    source: 'NONE' as const,
    state: 'unmarked' as const,
  };
  const future = timing === 'future';
  const hasExcessRequest =
    getSlotExcessLeaveRequests(member.excessLeaveRequests, slot).length > 0;
  const showExcessAccent = isExcessMemberLeaveCell(
    safeCell,
    member.excessLeaveRequests,
    slot,
  );
  const warningLabel = hasExcessRequest ? ' · 초과휴무 신청 있음' : '';
  const statusLabel =
    safeCell.state === 'present'
      ? '출석 처리'
      : safeCell.state === 'absent'
        ? '미출석'
        : safeCell.state === 'unmarked'
          ? '미확인'
          : safeCell.label;
  const activationLabel =
    safeCell.state === 'present'
      ? '누르면 이 교시만 출석을 취소하고 미확인으로 변경'
      : '빠른 처리할 칸으로 선택';
  const visuallyPendingPeriod = future && safeCell.state === 'unmarked';
  const className = cx(
    'staff-attendance__status',
    visuallyPendingPeriod ? 'is-future' : `is-${safeCell.state}`,
    showExcessAccent && 'has-excess-leave',
    interactive ? selected && 'is-selected' : 'is-readonly',
    pending && 'is-pending',
  );
  const content = pending
    ? '···'
    : visuallyPendingPeriod
      ? '—'
      : safeCell.label;
  const identityLabel = `${member.seatNumber === null ? '미배정' : `${member.seatNumber}번`} ${member.name}, ${slot}교시 ${statusLabel}${warningLabel}`;

  if (!interactive) {
    return (
      <span className={className} title={`${statusLabel}${warningLabel}`}>
        <span aria-hidden="true">{content}</span>
        <span className="staff-attendance__sr-only">{identityLabel}</span>
      </span>
    );
  }

  return (
    <button
      aria-busy={pending}
      aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight"
      aria-label={`${identityLabel}${future ? ' · 시작 전' : ''}. ${activationLabel}`}
      aria-pressed={selected}
      className={className}
      disabled={disabled}
      id={toAttendanceCellId(member.memberId, slot)}
      onClick={onActivate}
      onFocus={onSelect}
      onKeyDown={onKeyDown}
      tabIndex={tabStop ? 0 : -1}
      title={`${statusLabel}${warningLabel}${future ? ' · 시작 전' : ''}${safeCell.state === 'present' ? ' · 누르면 이 교시만 미확인으로 변경' : ''}`}
      type="button"
    >
      {content}
    </button>
  );
}
