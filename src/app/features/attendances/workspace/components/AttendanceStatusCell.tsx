import type { KeyboardEvent } from 'react';
import type { OperationalAttendanceSlot } from '../../../../features/attendances/attendance-rules';
import { cx } from '../../../../shared/lib/cx';
import type {
  AttendancePaintMode,
  AttendanceSelectionTiming,
  AttendanceBoardCell,
  AttendanceBoardMember,
} from '../model/attendance-board';
import { toAttendanceCellId } from '../model/attendance-board';

type AttendanceStatusCellProps = {
  cell: AttendanceBoardCell | undefined;
  disabled: boolean;
  interactive: boolean;
  mode: AttendancePaintMode;
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
  mode,
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
  const statusLabel =
    safeCell.state === 'present'
      ? '출석 처리'
      : safeCell.state === 'absent'
        ? '미출석'
        : safeCell.state === 'unmarked'
          ? '미확인'
          : safeCell.label;
  const modeLabel =
    mode === 'PRESENT'
      ? '출석'
      : mode === 'ABSENT'
        ? '미출석'
        : mode === 'OTHER'
          ? '기타 사유'
          : null;
  const activationLabel = future
    ? '아직 변경할 수 없음'
    : modeLabel
      ? `${modeLabel}으로 바로 처리`
      : '처리할 상태를 선택하기 위해 선택';
  const visuallyPendingPeriod = future && safeCell.state === 'unmarked';
  const className = cx(
    'staff-attendance__status',
    visuallyPendingPeriod ? 'is-future' : `is-${safeCell.state}`,
    interactive ? selected && 'is-selected' : 'is-readonly',
    interactive && mode && !future && 'is-mode-target',
    pending && 'is-pending',
  );
  const content = pending
    ? '···'
    : visuallyPendingPeriod
      ? '—'
      : safeCell.label;
  const identityLabel = `${member.seatNumber === null ? '미배정' : `${member.seatNumber}번`} ${member.name}, ${slot}교시 ${statusLabel}`;

  if (!interactive) {
    return (
      <span className={className} title={statusLabel}>
        <span aria-hidden="true">{content}</span>
        <span className="staff-attendance__sr-only">{identityLabel}</span>
      </span>
    );
  }

  return (
    <button
      aria-busy={pending}
      aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight"
      aria-label={`${identityLabel}. ${activationLabel}`}
      aria-pressed={selected}
      className={className}
      disabled={disabled || future}
      id={toAttendanceCellId(member.memberId, slot)}
      onClick={onActivate}
      onFocus={onSelect}
      onKeyDown={onKeyDown}
      tabIndex={tabStop && !future ? 0 : -1}
      title={future ? `${statusLabel} · 시작 전` : statusLabel}
      type="button"
    >
      {content}
    </button>
  );
}
