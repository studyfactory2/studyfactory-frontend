import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { SessionOwnerKey } from '../../../../core/session';
import { attendanceQueryKeys } from '../../../../features/attendances/attendance-query-keys';
import {
  resetDailyAttendanceMember,
  updateDailyAttendanceSlot,
} from '../../../../features/attendances/attendances-api';
import { executeAttendanceLeaveAction } from '../../../../features/attendances/attendance-leave-actions';
import {
  toAttendanceCellKey,
  type AttendanceSlotCommand,
  type AttendanceReasonCommand,
} from '../../../../features/attendances/workspace/model/attendance-board';
import { leaveQueryKeys } from '../../../../features/leaves/leave-query-keys';
import { studyTimeQueryKeys } from '../../../../features/study-time/study-time-query-keys';
import { studyPresenceQueryKeys } from '../../../../features/study-presence/study-presence-query-keys';
import {
  manualCheckInStudyPresenceMember,
  manualCheckOutStudyPresenceSession,
  type StudyPresenceManualCheckInInput,
} from '../../../../features/study-presence/study-presence-api';
import { getSeoulToday } from '../../../../shared/lib/seoul-date';
import { useToast } from '../../../../shared/ui';

type UseAdminAttendanceMutationRuntimeArgs = {
  branchId: number;
  dateKey: string;
  operatorMemberId: number;
  ownerKey: SessionOwnerKey;
  writeEnabled: boolean;
};

export type AdminAttendancePresenceCommand =
  | {
      input: StudyPresenceManualCheckInInput;
      targetMemberId: number;
      type: 'check-in';
    }
  | {
      sessionId: number;
      targetMemberId: number;
      type: 'check-out';
    };

type OperationScope = {
  branchId: number;
  dateKey: string;
  operatorMemberId: number;
  ownerKey: SessionOwnerKey;
  revision: number;
};

type CurrentScope = OperationScope & {
  writeEnabled: boolean;
};

type SlotOperation = OperationScope & {
  cellOperationKey: string;
  command: AttendanceSlotCommand;
  memberOperationKey: string;
};

type ResetOperation = OperationScope & {
  memberOperationKey: string;
  targetMemberId: number;
};

type ReasonOperation = OperationScope & {
  command: AttendanceReasonCommand;
  memberOperationKey: string;
};

type PresenceOperation = OperationScope &
  (AdminAttendancePresenceCommand & { memberOperationKey: string });

/**
 * Owns mutation snapshots, pending locks, and stale-completion handling.
 * Validation of the visible member and row state stays in the public action
 * hook so this runtime remains independent of screen data.
 */
export function useAdminAttendanceMutationRuntime({
  branchId,
  dateKey,
  operatorMemberId,
  ownerKey,
  writeEnabled,
}: UseAdminAttendanceMutationRuntimeArgs) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const currentScopeRef = useRef<CurrentScope>({
    branchId,
    dateKey,
    operatorMemberId,
    ownerKey,
    writeEnabled,
    revision: 0,
  });
  const mountedRef = useRef(false);
  const pendingCellOperationKeysRef = useRef(new Set<string>());
  const pendingMemberOperationKeysRef = useRef(new Set<string>());
  const pendingPresenceOperationKeysRef = useRef(new Set<string>());
  const pendingResetOperationKeysRef = useRef(new Set<string>());
  const slotSuccessCallbacksRef = useRef(new Map<string, () => void>());
  const presenceSuccessCallbacksRef = useRef(new Map<string, () => void>());
  const resetSuccessCallbacksRef = useRef(new Map<string, () => void>());
  const reasonSuccessCallbacksRef = useRef(new Map<string, () => void>());
  const [pendingCellOperationKeys, setPendingCellOperationKeys] = useState<
    ReadonlySet<string>
  >(() => new Set());
  const [pendingMemberOperationKeys, setPendingMemberOperationKeys] = useState<
    ReadonlySet<string>
  >(() => new Set());
  const [pendingPresenceOperationKeys, setPendingPresenceOperationKeys] =
    useState<ReadonlySet<string>>(() => new Set());
  const [pendingResetOperationKeys, setPendingResetOperationKeys] = useState<
    ReadonlySet<string>
  >(() => new Set());

  useLayoutEffect(() => {
    mountedRef.current = true;
    currentScopeRef.current = {
      branchId,
      dateKey,
      operatorMemberId,
      ownerKey,
      writeEnabled,
      revision: currentScopeRef.current.revision + 1,
    };

    return () => {
      mountedRef.current = false;
    };
  }, [branchId, dateKey, operatorMemberId, ownerKey, writeEnabled]);

  const slotMutation = useMutation({
    mutationFn: (operation: SlotOperation) =>
      updateDailyAttendanceSlot(
        { ...operation.command, date: operation.dateKey },
        operation.operatorMemberId,
      ),
    onError: (error: Error, operation) => {
      if (operationIsCurrent(mountedRef, currentScopeRef, operation)) {
        toast(error.message, 'error');
      }
    },
    onSettled: async (_result, error, operation) => {
      try {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: attendanceQueryKeys.all(operation.ownerKey),
          }),
          queryClient.invalidateQueries({
            queryKey: leaveQueryKeys.all(operation.ownerKey),
          }),
          queryClient.invalidateQueries({
            queryKey: studyTimeQueryKeys.all(operation.ownerKey),
          }),
        ]);
      } finally {
        const onSuccess =
          !error && operationIsCurrent(mountedRef, currentScopeRef, operation)
            ? slotSuccessCallbacksRef.current.get(operation.cellOperationKey)
            : undefined;

        slotSuccessCallbacksRef.current.delete(operation.cellOperationKey);
        pendingCellOperationKeysRef.current.delete(operation.cellOperationKey);
        pendingMemberOperationKeysRef.current.delete(
          operation.memberOperationKey,
        );
        setPendingCellOperationKeys(
          new Set(pendingCellOperationKeysRef.current),
        );
        setPendingMemberOperationKeys(
          new Set(pendingMemberOperationKeysRef.current),
        );
        runAfterPendingStateCommit(onSuccess, () =>
          operationIsCurrent(mountedRef, currentScopeRef, operation),
        );
      }
    },
  });

  const resetMutation = useMutation({
    mutationFn: (operation: ResetOperation) =>
      resetDailyAttendanceMember(
        { date: operation.dateKey, memberId: operation.targetMemberId },
        operation.operatorMemberId,
      ),
    onError: (error: Error, operation) => {
      if (operationIsCurrent(mountedRef, currentScopeRef, operation)) {
        toast(error.message, 'error');
      }
    },
    onSuccess: (_result, operation) => {
      if (operationIsCurrent(mountedRef, currentScopeRef, operation)) {
        toast('선택한 날짜의 출석부를 시작했어요.', 'success');
      }
    },
    onSettled: async (_result, error, operation) => {
      try {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: attendanceQueryKeys.all(operation.ownerKey),
          }),
          queryClient.invalidateQueries({
            queryKey: leaveQueryKeys.all(operation.ownerKey),
          }),
          queryClient.invalidateQueries({
            queryKey: studyTimeQueryKeys.all(operation.ownerKey),
          }),
        ]);
      } finally {
        const onSuccess =
          !error && operationIsCurrent(mountedRef, currentScopeRef, operation)
            ? resetSuccessCallbacksRef.current.get(operation.memberOperationKey)
            : undefined;

        resetSuccessCallbacksRef.current.delete(operation.memberOperationKey);
        pendingResetOperationKeysRef.current.delete(
          operation.memberOperationKey,
        );
        pendingMemberOperationKeysRef.current.delete(
          operation.memberOperationKey,
        );
        setPendingResetOperationKeys(
          new Set(pendingResetOperationKeysRef.current),
        );
        setPendingMemberOperationKeys(
          new Set(pendingMemberOperationKeysRef.current),
        );
        runAfterPendingStateCommit(onSuccess, () =>
          operationIsCurrent(mountedRef, currentScopeRef, operation),
        );
      }
    },
  });

  const reasonMutation = useMutation({
    mutationFn: (operation: ReasonOperation) =>
      executeAttendanceLeaveAction(
        operation.command,
        operation.branchId,
        operation.operatorMemberId,
      ),
    onError: (error: Error, operation) => {
      if (operationIsCurrent(mountedRef, currentScopeRef, operation)) {
        toast(error.message, 'error');
      }
    },
    onSettled: async (result, error, operation) => {
      try {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: attendanceQueryKeys.all(operation.ownerKey),
          }),
          queryClient.invalidateQueries({
            queryKey: leaveQueryKeys.all(operation.ownerKey),
          }),
          queryClient.invalidateQueries({
            queryKey: studyTimeQueryKeys.all(operation.ownerKey),
          }),
        ]);
      } finally {
        const current = operationIsCurrent(
          mountedRef,
          currentScopeRef,
          operation,
        );
        const onSuccess =
          !error && current
            ? reasonSuccessCallbacksRef.current.get(
                operation.memberOperationKey,
              )
            : undefined;
        if (!error && result && current) {
          toast(result, 'success');
        }
        reasonSuccessCallbacksRef.current.delete(operation.memberOperationKey);
        pendingMemberOperationKeysRef.current.delete(
          operation.memberOperationKey,
        );
        setPendingMemberOperationKeys(
          new Set(pendingMemberOperationKeysRef.current),
        );
        runAfterPendingStateCommit(onSuccess, () =>
          operationIsCurrent(mountedRef, currentScopeRef, operation),
        );
      }
    },
  });

  const presenceMutation = useMutation({
    mutationFn: (operation: PresenceOperation) => {
      if (operation.dateKey !== getSeoulToday().dateKey) {
        throw new Error('입퇴실 처리는 오늘 출석부에서만 할 수 있어요.');
      }
      return operation.type === 'check-in'
        ? manualCheckInStudyPresenceMember(
            operation.targetMemberId,
            operation.input,
            operation.operatorMemberId,
            operation.branchId,
          )
        : manualCheckOutStudyPresenceSession(
            operation.sessionId,
            operation.targetMemberId,
            operation.operatorMemberId,
            operation.branchId,
          );
    },
    onError: (error: Error, operation) => {
      if (operationIsCurrent(mountedRef, currentScopeRef, operation)) {
        toast(error.message, 'error');
      }
    },
    onSuccess: (_result, operation) => {
      if (operationIsCurrent(mountedRef, currentScopeRef, operation)) {
        toast(
          operation.type === 'check-in'
            ? '수동 입실을 등록했어요.'
            : '수동 퇴실을 처리했어요.',
          'success',
        );
      }
    },
    onSettled: async (_result, error, operation) => {
      try {
        await queryClient.invalidateQueries({
          queryKey: studyPresenceQueryKeys.all(operation.ownerKey),
        });
      } finally {
        const onSuccess =
          !error && operationIsCurrent(mountedRef, currentScopeRef, operation)
            ? presenceSuccessCallbacksRef.current.get(
                operation.memberOperationKey,
              )
            : undefined;

        presenceSuccessCallbacksRef.current.delete(
          operation.memberOperationKey,
        );
        pendingPresenceOperationKeysRef.current.delete(
          operation.memberOperationKey,
        );
        pendingMemberOperationKeysRef.current.delete(
          operation.memberOperationKey,
        );
        setPendingPresenceOperationKeys(
          new Set(pendingPresenceOperationKeysRef.current),
        );
        setPendingMemberOperationKeys(
          new Set(pendingMemberOperationKeysRef.current),
        );
        runAfterPendingStateCommit(
          onSuccess,
          () =>
            operationIsCurrent(mountedRef, currentScopeRef, operation) &&
            operation.dateKey === getSeoulToday().dateKey,
        );
      }
    },
  });

  const runSlot = useCallback(
    (command: AttendanceSlotCommand, onSuccess?: () => void) => {
      const scope = currentScopeRef.current;

      if (!isWritableScope(scope)) {
        return;
      }

      const memberOperationKey = toDatedMemberKey(
        scope.dateKey,
        command.memberId,
      );

      if (pendingMemberOperationKeysRef.current.has(memberOperationKey)) {
        return;
      }

      const cellOperationKey = toDatedCellKey(
        scope.dateKey,
        command.memberId,
        command.slot,
      );

      pendingCellOperationKeysRef.current.add(cellOperationKey);
      pendingMemberOperationKeysRef.current.add(memberOperationKey);
      if (onSuccess) {
        slotSuccessCallbacksRef.current.set(cellOperationKey, onSuccess);
      }
      setPendingCellOperationKeys(new Set(pendingCellOperationKeysRef.current));
      setPendingMemberOperationKeys(
        new Set(pendingMemberOperationKeysRef.current),
      );
      slotMutation.mutate({
        ...toOperationScope(scope),
        cellOperationKey,
        command: { ...command },
        memberOperationKey,
      });
    },
    [slotMutation],
  );

  const runReset = useCallback(
    (targetMemberId: number, onSuccess?: () => void) => {
      const scope = currentScopeRef.current;

      if (!isWritableScope(scope)) {
        return;
      }

      const memberOperationKey = toDatedMemberKey(
        scope.dateKey,
        targetMemberId,
      );

      if (pendingMemberOperationKeysRef.current.has(memberOperationKey)) {
        return;
      }

      pendingResetOperationKeysRef.current.add(memberOperationKey);
      pendingMemberOperationKeysRef.current.add(memberOperationKey);
      if (onSuccess) {
        resetSuccessCallbacksRef.current.set(memberOperationKey, onSuccess);
      }
      setPendingResetOperationKeys(
        new Set(pendingResetOperationKeysRef.current),
      );
      setPendingMemberOperationKeys(
        new Set(pendingMemberOperationKeysRef.current),
      );
      resetMutation.mutate({
        ...toOperationScope(scope),
        memberOperationKey,
        targetMemberId,
      });
    },
    [resetMutation],
  );

  const runReason = useCallback(
    (command: AttendanceReasonCommand, onSuccess?: () => void) => {
      const scope = currentScopeRef.current;
      if (!isWritableScope(scope)) {
        return;
      }
      const memberOperationKey = toDatedMemberKey(
        scope.dateKey,
        command.memberId,
      );
      if (pendingMemberOperationKeysRef.current.has(memberOperationKey)) {
        return;
      }
      pendingMemberOperationKeysRef.current.add(memberOperationKey);
      if (onSuccess) {
        reasonSuccessCallbacksRef.current.set(memberOperationKey, onSuccess);
      }
      setPendingMemberOperationKeys(
        new Set(pendingMemberOperationKeysRef.current),
      );
      reasonMutation.mutate({
        ...toOperationScope(scope),
        command: {
          ...command,
          dates: [...command.dates],
          slots: [...command.slots],
          reason: command.reason.trim(),
        },
        memberOperationKey,
      });
    },
    [reasonMutation],
  );

  const runPresence = useCallback(
    (command: AdminAttendancePresenceCommand, onSuccess?: () => void) => {
      const scope = currentScopeRef.current;

      if (
        !isWritableScope(scope) ||
        scope.dateKey !== getSeoulToday().dateKey
      ) {
        return;
      }

      const memberOperationKey = toDatedMemberKey(
        scope.dateKey,
        command.targetMemberId,
      );

      if (pendingMemberOperationKeysRef.current.has(memberOperationKey)) {
        return;
      }

      pendingPresenceOperationKeysRef.current.add(memberOperationKey);
      pendingMemberOperationKeysRef.current.add(memberOperationKey);
      if (onSuccess) {
        presenceSuccessCallbacksRef.current.set(memberOperationKey, onSuccess);
      }
      setPendingPresenceOperationKeys(
        new Set(pendingPresenceOperationKeysRef.current),
      );
      setPendingMemberOperationKeys(
        new Set(pendingMemberOperationKeysRef.current),
      );
      presenceMutation.mutate({
        ...toOperationScope(scope),
        ...command,
        memberOperationKey,
      });
    },
    [presenceMutation],
  );

  const pendingCellKeys = useMemo(
    () => toCurrentCellKeys(pendingCellOperationKeys, dateKey),
    [dateKey, pendingCellOperationKeys],
  );
  const pendingMemberIds = useMemo(
    () => toCurrentMemberIds(pendingMemberOperationKeys, dateKey),
    [dateKey, pendingMemberOperationKeys],
  );
  const pendingPresenceMemberIds = useMemo(
    () => toCurrentMemberIds(pendingPresenceOperationKeys, dateKey),
    [dateKey, pendingPresenceOperationKeys],
  );
  const pendingResetIds = useMemo(
    () => toCurrentMemberIds(pendingResetOperationKeys, dateKey),
    [dateKey, pendingResetOperationKeys],
  );

  return {
    anyPending: pendingMemberOperationKeys.size > 0,
    pendingCellKeys,
    pendingMemberIds,
    pendingPresenceMemberIds,
    pendingResetIds,
    runPresence,
    runReset,
    runSlot,
    runReason,
  };
}

function operationIsCurrent(
  mountedRef: RefObject<boolean>,
  currentScopeRef: RefObject<CurrentScope>,
  operation: OperationScope,
) {
  const current = currentScopeRef.current;

  return (
    mountedRef.current &&
    current.revision === operation.revision &&
    current.ownerKey === operation.ownerKey &&
    current.operatorMemberId === operation.operatorMemberId &&
    current.branchId === operation.branchId &&
    current.dateKey === operation.dateKey &&
    isWritableScope(current)
  );
}

function isWritableScope(scope: CurrentScope) {
  return scope.writeEnabled;
}

function toOperationScope(scope: CurrentScope): OperationScope {
  return {
    branchId: scope.branchId,
    dateKey: scope.dateKey,
    operatorMemberId: scope.operatorMemberId,
    ownerKey: scope.ownerKey,
    revision: scope.revision,
  };
}

function toDatedCellKey(dateKey: string, memberId: number, slot: number) {
  return `${dateKey}:${toAttendanceCellKey(memberId, slot)}`;
}

function toDatedMemberKey(dateKey: string, memberId: number) {
  return `${dateKey}:${memberId}`;
}

function toCurrentCellKeys(keys: ReadonlySet<string>, dateKey: string) {
  const prefix = `${dateKey}:`;
  const current = new Set<string>();

  for (const key of keys) {
    if (key.startsWith(prefix)) {
      current.add(key.slice(prefix.length));
    }
  }

  return current;
}

function toCurrentMemberIds(keys: ReadonlySet<string>, dateKey: string) {
  const prefix = `${dateKey}:`;
  const current = new Set<number>();

  for (const key of keys) {
    if (!key.startsWith(prefix)) {
      continue;
    }

    const memberId = Number(key.slice(prefix.length));

    if (Number.isSafeInteger(memberId) && memberId > 0) {
      current.add(memberId);
    }
  }

  return current;
}

function runAfterPendingStateCommit(
  callback: (() => void) | undefined,
  isCurrent: () => boolean,
) {
  if (callback) {
    window.setTimeout(() => {
      if (isCurrent()) callback();
    }, 0);
  }
}
