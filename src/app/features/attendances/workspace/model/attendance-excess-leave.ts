import type { ExcessLeaveRequest } from '../../../../features/leaves/leaves-api';
import type { AttendanceBoardCell } from './attendance-board';

/** Missing metadata means no warning, including responses from an older server. */
export function getActiveExcessLeaveRequests(
  requests: readonly ExcessLeaveRequest[] | null | undefined,
): ExcessLeaveRequest[] {
  return (requests ?? []).filter(
    (request) =>
      request.weeklyAllowance?.excess === true &&
      request.slots.some(
        (slot) => Number.isInteger(slot) && slot >= 1 && slot <= 7,
      ),
  );
}

export function getSlotExcessLeaveRequests(
  requests: readonly ExcessLeaveRequest[],
  slot: number,
): ExcessLeaveRequest[] {
  if (!Number.isInteger(slot) || slot < 1 || slot > 7) {
    return [];
  }
  return getActiveExcessLeaveRequests(requests).filter((request) =>
    request.slots.includes(slot),
  );
}

/**
 * The warning describes an excess request affecting this period, not the exact
 * request behind its visible label: slotSources identifies only the source type.
 * Actual attendance and manager-assigned statuses keep their normal appearance.
 */
export function isExcessMemberLeaveCell(
  cell: AttendanceBoardCell | undefined,
  requests: readonly ExcessLeaveRequest[],
  slot: number,
): boolean {
  return (
    cell?.state === 'leave' &&
    cell.source === 'MEMBER_LEAVE' &&
    getSlotExcessLeaveRequests(requests, slot).length > 0
  );
}
