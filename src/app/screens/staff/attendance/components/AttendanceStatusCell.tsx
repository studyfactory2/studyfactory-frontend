import type { KeyboardEvent } from 'react';
import type { OperationalAttendanceSlot } from '../../../../features/attendances/attendance-rules';
import { cx } from '../../../../shared/lib/cx';
import type {
  AttendancePaintMode,
  AttendanceSelectionTiming,
  StaffAttendanceCell,
  StaffAttendanceMember,
} from '../model/staff-attendance';
import { toAttendanceCellId } from '../model/staff-attendance';

type AttendanceStatusCellProps = {
  cell: StaffAttendanceCell | undefined;
  disabled: boolean;
  mode: AttendancePaintMode;
  member: StaffAttendanceMember;
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
    label: '미출석',
    source: 'NONE' as const,
    state: 'unmarked' as const,
  };
  const future = timing === 'future';
  const statusLabel =
    safeCell.state === 'present'
      ? '출석 처리'
      : safeCell.state === 'unmarked'
        ? '미출석'
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

  return (
    <button
      aria-busy={pending}
      aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight"
      aria-label={`${member.seatNumber === null ? '미배정' : `${member.seatNumber}번`} ${member.name}, ${slot}교시 ${statusLabel}. ${activationLabel}`}
      aria-pressed={selected}
      className={cx(
        'staff-attendance__status',
        visuallyPendingPeriod ? 'is-future' : `is-${safeCell.state}`,
        selected && 'is-selected',
        mode && !future && 'is-mode-target',
        pending && 'is-pending',
      )}
      disabled={disabled || future}
      id={toAttendanceCellId(member.memberId, slot)}
      onClick={onActivate}
      onFocus={onSelect}
      onKeyDown={onKeyDown}
      tabIndex={tabStop && !future ? 0 : -1}
      title={future ? `${statusLabel} · 시작 전` : statusLabel}
      type="button"
    >
      {pending ? '···' : visuallyPendingPeriod ? '—' : safeCell.label}
    </button>
  );
}
