import type { AttendanceSlotUpdateStatus } from '../../attendances-api';
import type { AttendanceBoardCell } from './attendance-board';

/** Tapping a cell only selects it, except a displayed O which clears to —. */
export function attendanceActivationStatus(
  cell: AttendanceBoardCell,
): 'UNCONFIRMED' | null {
  return cell.state === 'present' ? 'UNCONFIRMED' : null;
}

export function canSubmitAttendanceStatus(
  cell: AttendanceBoardCell,
  status: AttendanceSlotUpdateStatus,
): boolean {
  // A blank or reviewed X can hide saved leave. Let the server resolve it;
  // never guess the underlying label or substitute destructive ABSENT.
  if (status === 'RESTORE') return true;
  if (status === 'UNCONFIRMED') return cell.state === 'present';
  if (status === 'PRESENT') return cell.state !== 'present';
  if (status === 'ABSENT') return cell.state !== 'absent';
  return true;
}
