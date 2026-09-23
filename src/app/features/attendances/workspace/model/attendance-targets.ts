import type { MemberRole } from '../../../../core/session';
import type { MemberResponse } from '../../../members/members-api';
import type {
  AttendanceBoardMember,
  AttendanceMemberStage,
} from './attendance-board';

export type AttendanceTargetRole = Extract<MemberRole, 'MEMBER' | 'STAFF'>;

export function isAttendanceRole(
  role: MemberRole,
): role is AttendanceTargetRole {
  return role === 'MEMBER' || role === 'STAFF';
}

export function selectAttendanceRoster(
  roster: MemberResponse[] | undefined,
  branchId: number,
  excludedIds: ReadonlySet<number> = new Set(),
) {
  return roster?.filter(
    (member) =>
      member.branchId === branchId &&
      isAttendanceRole(member.role) &&
      !excludedIds.has(member.id),
  );
}

/** A UI safety check, not a substitute for server-side authorization. */
export function findAttendanceTarget(
  roster: MemberResponse[],
  rows: AttendanceBoardMember[],
  branchId: number,
  memberId: number,
  stage: AttendanceMemberStage,
) {
  const member = roster.find((candidate) => candidate.id === memberId);
  const row = rows.find((candidate) => candidate.memberId === memberId);

  if (
    !member ||
    member.branchId !== branchId ||
    !isAttendanceRole(member.role) ||
    row?.role !== member.role ||
    row.stage !== stage
  ) {
    return null;
  }

  return row;
}
