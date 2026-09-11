import { useCallback, useMemo } from 'react';
import type { SessionOwnerKey } from '../../../../core/session';
import type { AttendanceBoardInteraction } from '../../../../features/attendances/workspace/components/AttendanceBoard';
import type {
  AttendanceBoardMember,
  AttendanceMemberStage,
  AttendanceSlotCommand,
} from '../../../../features/attendances/workspace/model/attendance-board';
import type { MemberResponse } from '../../../../features/members/members-api';
import type { StudyPresenceManualCheckInInput } from '../../../../features/study-presence/study-presence-api';
import { getSeoulToday } from '../../../../shared/lib/seoul-date';
import { useToast } from '../../../../shared/ui';
import { useAdminAttendanceMutationRuntime } from './useAdminAttendanceMutationRuntime';

type UseAdminAttendanceActionsArgs = {
  attendanceMembers: AttendanceBoardMember[];
  branchId: number;
  dateKey: string;
  memberId: number;
  ownerKey: SessionOwnerKey;
  roster: MemberResponse[];
  writeEnabled: boolean;
};

/**
 * Builds the shared board interaction contract for Admin. Every public action
 * validates the latest selected-branch roster and visible row before handing a
 * snapshot to the mutation runtime.
 */
export function useAdminAttendanceActions({
  attendanceMembers,
  branchId,
  dateKey,
  memberId,
  ownerKey,
  roster,
  writeEnabled,
}: UseAdminAttendanceActionsArgs) {
  const { toast } = useToast();
  const mutationRuntime = useAdminAttendanceMutationRuntime({
    branchId,
    dateKey,
    operatorMemberId: memberId,
    ownerKey,
    writeEnabled,
  });
  const allowedMemberById = useMemo(
    () =>
      new Map(
        roster
          .filter(
            (member) =>
              member.branchId === branchId && member.role === 'MEMBER',
          )
          .map((member) => [member.id, member] as const),
      ),
    [branchId, roster],
  );
  const attendanceMemberById = useMemo(
    () => new Map(attendanceMembers.map((member) => [member.memberId, member])),
    [attendanceMembers],
  );

  const validateMember = useCallback(
    (targetMemberId: number, stage: AttendanceMemberStage) => {
      if (!isWritableToday({ dateKey, writeEnabled })) {
        toast('오늘 출석부에서만 처리할 수 있어요.', 'error');
        return null;
      }

      const member = attendanceMemberById.get(targetMemberId);

      if (!allowedMemberById.has(targetMemberId) || member?.stage !== stage) {
        toast('현재 지점의 출석 대상 회원인지 다시 확인해 주세요.', 'error');
        return null;
      }

      return member;
    },
    [allowedMemberById, attendanceMemberById, dateKey, toast, writeEnabled],
  );

  const updateSlot = useCallback(
    (command: AttendanceSlotCommand, onSuccess?: () => void) => {
      if (!validateMember(command.memberId, 'active')) {
        return;
      }

      mutationRuntime.runSlot(command, onSuccess);
    },
    [mutationRuntime, validateMember],
  );

  const resetMember = useCallback(
    (targetMemberId: number, onSuccess?: () => void) => {
      const member = validateMember(targetMemberId, 'starts-today');

      if (!member) {
        return;
      }

      if (allowedMemberById.get(targetMemberId)?.joinDate !== dateKey) {
        toast('오늘 입사한 회원인지 다시 확인해 주세요.', 'error');
        return;
      }

      mutationRuntime.runReset(targetMemberId, onSuccess);
    },
    [allowedMemberById, dateKey, mutationRuntime, toast, validateMember],
  );

  const manualCheckIn = useCallback(
    (
      targetMemberId: number,
      input: StudyPresenceManualCheckInInput,
      onSuccess?: () => void,
    ) => {
      const member = validateMember(targetMemberId, 'active');
      const reason = input.reason?.trim();
      const checkedInAtMs = Date.parse(input.checkedInAt);

      if (!member) {
        return;
      }

      if (
        member.presence === null ||
        member.presence.currentlyActive ||
        !Number.isFinite(checkedInAtMs) ||
        checkedInAtMs > Date.now() ||
        getSeoulToday(new Date(checkedInAtMs)).dateKey !== dateKey ||
        (reason?.length ?? 0) > 200
      ) {
        toast('입실 시각과 선택 사유를 다시 확인해 주세요.', 'error');
        return;
      }

      mutationRuntime.runPresence(
        {
          input: {
            checkedInAt: input.checkedInAt,
            ...(reason ? { reason } : {}),
          },
          targetMemberId,
          type: 'check-in',
        },
        onSuccess,
      );
    },
    [dateKey, mutationRuntime, toast, validateMember],
  );

  const manualCheckOut = useCallback(
    (targetMemberId: number, sessionId: number, onSuccess?: () => void) => {
      const member = validateMember(targetMemberId, 'active');

      if (
        !member?.presence?.currentlyActive ||
        member.presence.activeSessionId !== sessionId
      ) {
        toast('현재 입실 세션을 다시 확인해 주세요.', 'error');
        return;
      }

      mutationRuntime.runPresence(
        { sessionId, targetMemberId, type: 'check-out' },
        onSuccess,
      );
    },
    [mutationRuntime, toast, validateMember],
  );

  const interaction = useMemo<AttendanceBoardInteraction>(
    () => ({
      onManualCheckIn: manualCheckIn,
      onManualCheckOut: manualCheckOut,
      onResetMember: resetMember,
      onUpdateSlot: updateSlot,
      pendingCellKeys: mutationRuntime.pendingCellKeys,
      pendingMemberIds: mutationRuntime.pendingMemberIds,
      pendingPresenceMemberIds: mutationRuntime.pendingPresenceMemberIds,
      pendingResetIds: mutationRuntime.pendingResetIds,
    }),
    [manualCheckIn, manualCheckOut, mutationRuntime, resetMember, updateSlot],
  );

  return {
    anyPending: mutationRuntime.anyPending,
    interaction,
  };
}

function isWritableToday({
  dateKey,
  writeEnabled,
}: {
  dateKey: string;
  writeEnabled: boolean;
}) {
  return writeEnabled && dateKey === getSeoulToday().dateKey;
}
