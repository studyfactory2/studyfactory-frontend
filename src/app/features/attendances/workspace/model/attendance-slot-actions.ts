import type { AttendanceSlotUpdateStatus } from '../../attendances-api';
import type { AttendanceBoardCell } from './attendance-board';

/** Tapping a cell only selects it, except a displayed O which clears to —. */
export function attendanceActivationStatus(
  cell: AttendanceBoardCell,
): 'UNCONFIRMED' | null {
  return cell.state === 'present' ? 'UNCONFIRMED' : null;
}

/** X undoes O (including its persisted cleared state); otherwise it marks absence. */
export function attendanceAbsenceStatus(
  cell: AttendanceBoardCell,
): 'RESTORE' | 'MARK_ABSENT' | null {
  if (cell.state === 'absent') return null;
  if (
    cell.state === 'present' ||
    (cell.state === 'unmarked' && cell.clearedPresent === true)
  ) {
    return 'RESTORE';
  }
  return 'MARK_ABSENT';
}

export function canSubmitAttendanceStatus(
  cell: AttendanceBoardCell,
  status: AttendanceSlotUpdateStatus,
): boolean {
  // Send explicit, idempotent commands. The server still resolves saved leave;
  // the client never invents a label or falls back to destructive ABSENT.
  if (status === 'RESTORE' || status === 'MARK_ABSENT') {
    return attendanceAbsenceStatus(cell) === status;
  }
  if (status === 'UNCONFIRMED') return cell.state === 'present';
  if (status === 'PRESENT') return cell.state !== 'present';
  if (status === 'ABSENT') return cell.state !== 'absent';
  return true;
}
