import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SessionOwnerKey } from '../../../../core/session';
import { attendanceQueryKeys } from '../../../../features/attendances/attendance-query-keys';
import { getOperationalAttendanceSlot } from '../../../../features/attendances/attendance-rules';
import {
  fetchDailyAttendanceBoard,
  resetDailyAttendanceMember,
  updateDailyAttendanceSlot,
} from '../../../../features/attendances/attendances-api';
import { executeAttendanceLeaveAction } from '../../../../features/attendances/attendance-leave-actions';
import { leaveQueryKeys } from '../../../../features/leaves/leave-query-keys';
import { studyTimeQueryKeys } from '../../../../features/study-time/study-time-query-keys';
import { studyPresenceQueryKeys } from '../../../../features/study-presence/study-presence-query-keys';
import {
  fetchDailyStudyPresenceHistory,
  manualCheckInStudyPresenceMember,
  manualCheckOutStudyPresenceSession,
  type StudyPresenceManualCheckInInput,
} from '../../../../features/study-presence/study-presence-api';
import { memberQueryKeys } from '../../../../features/members/member-query-keys';
import { fetchBranchMembers } from '../../../../features/members/members-api';
import { useSeoulClock } from '../../../../shared/hooks/useSeoulClock';
import { useSeoulToday } from '../../../../shared/hooks/useSeoulToday';
import { getSeoulToday } from '../../../../shared/lib/seoul-date';
import { useToast } from '../../../../shared/ui';
import {
  buildAttendanceMembers,
  toAttendanceCellKey,
  type AttendanceMemberStage,
  type AttendanceSlotCommand,
  type AttendanceReasonCommand,
  validateAttendanceReasonCommand,
} from '../../../../features/attendances/workspace/model/attendance-board';
import { getAttendanceVacantSeatNumbers } from '../../../../features/attendances/workspace/model/attendance-seat-layout';
import {
  findAttendanceTarget,
  selectAttendanceRoster,
} from '../../../../features/attendances/workspace/model/attendance-targets';

const BOARD_STALE_TIME_MS = 60 * 1_000;
const ATTENDANCE_REFETCH_MS = 30 * 1_000;
const PRESENCE_STALE_TIME_MS = 15 * 1_000;
const ROSTER_STALE_TIME_MS = 5 * 60 * 1_000;
const STUDY_START_SECONDS = 9 * 60 * 60;

type UseStaffAttendanceArgs = {
  branchId: number;
  dateKey: string;
  isToday: boolean;
  memberId: number;
  ownerKey: SessionOwnerKey;
};

type ManualPresenceCommand =
  | {
      input: StudyPresenceManualCheckInInput;
      memberId: number;
      type: 'check-in';
    }
  | {
      memberId: number;
      sessionId: number;
      type: 'check-out';
    };

type OperationScope = {
  branchId: number;
  dateKey: string;
  isToday: boolean;
  operatorMemberId: number;
  ownerKey: SessionOwnerKey;
  revision: number;
};

type OperationPayload =
  | { kind: 'slot'; command: AttendanceSlotCommand }
  | { kind: 'reset' }
  | { kind: 'reason'; command: AttendanceReasonCommand }
  | { kind: 'presence'; command: ManualPresenceCommand };

type AttendanceOperation = OperationPayload & {
  key: string;
  onSuccess?: () => void;
  scope: OperationScope;
  targetMemberId: number;
};

export function useStaffAttendance({
  branchId,
  dateKey,
  isToday,
  memberId,
  ownerKey,
}: UseStaffAttendanceArgs) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const today = useSeoulToday();
  const clock = useSeoulClock();
  const presenceEditable = isToday && clock.dateKey === dateKey;
  const operationalSlot = presenceEditable
    ? getOperationalAttendanceSlot(clock.secondsOfDay)
    : null;
  const beforeStudyStart =
    presenceEditable && clock.secondsOfDay < STUDY_START_SECONDS;
  const activeSlot = beforeStudyStart ? null : operationalSlot;
  const scopeRef = useRef<OperationScope>({
    branchId,
    dateKey,
    isToday,
    operatorMemberId: memberId,
    ownerKey,
    revision: 0,
  });
  const mountedRef = useRef(false);
  const pendingRef = useRef(new Map<string, AttendanceOperation>());
  const [pendingOperations, setPendingOperations] = useState<
    ReadonlyMap<string, AttendanceOperation>
  >(() => new Map());

  useLayoutEffect(() => {
    mountedRef.current = true;
    scopeRef.current = {
      branchId,
      dateKey,
      isToday,
      operatorMemberId: memberId,
      ownerKey,
      revision: scopeRef.current.revision + 1,
    };
    return () => {
      mountedRef.current = false;
    };
  }, [branchId, dateKey, isToday, memberId, ownerKey]);

  const operationIsCurrent = (operation: AttendanceOperation) => {
    const current = scopeRef.current;
    return (
      mountedRef.current &&
      current.revision === operation.scope.revision &&
      current.branchId === operation.scope.branchId &&
      current.operatorMemberId === operation.scope.operatorMemberId &&
      current.ownerKey === operation.scope.ownerKey &&
      current.dateKey === operation.scope.dateKey &&
      (!current.isToday || current.dateKey === getSeoulToday().dateKey)
    );
  };

  const boardQuery = useQuery({
    queryFn: () => fetchDailyAttendanceBoard(dateKey, branchId, memberId),
    queryKey: attendanceQueryKeys.dailyBoard(ownerKey, branchId, dateKey),
    refetchInterval: isToday ? ATTENDANCE_REFETCH_MS : false,
    refetchOnWindowFocus: 'always',
    staleTime: BOARD_STALE_TIME_MS,
  });

  const presenceQuery = useQuery({
    queryFn: () => fetchDailyStudyPresenceHistory(dateKey, memberId, branchId),
    queryKey: studyPresenceQueryKeys.managerDailyHistory(
      ownerKey,
      branchId,
      dateKey,
    ),
    refetchInterval: isToday ? ATTENDANCE_REFETCH_MS : false,
    refetchOnWindowFocus: 'always',
    staleTime: PRESENCE_STALE_TIME_MS,
  });

  const rosterQuery = useQuery({
    queryFn: () => fetchBranchMembers(branchId, memberId),
    queryKey: memberQueryKeys.branch(ownerKey, branchId),
    refetchOnWindowFocus: 'always',
    staleTime: ROSTER_STALE_TIME_MS,
  });

  const attendanceRoster = useMemo(
    () => selectAttendanceRoster(rosterQuery.data, branchId),
    [branchId, rosterQuery.data],
  );
  const members = useMemo(
    () =>
      buildAttendanceMembers(
        boardQuery.data,
        presenceQuery.data,
        attendanceRoster,
      ),
    [attendanceRoster, boardQuery.data, presenceQuery.data],
  );
  const vacantSeatNumbers = useMemo(
    () => getAttendanceVacantSeatNumbers(boardQuery.data),
    [boardQuery.data],
  );

  const validateMember = useCallback(
    (targetMemberId: number, stage: AttendanceMemberStage) => {
      const scope = scopeRef.current;
      if (
        !mountedRef.current ||
        scope.branchId !== branchId ||
        scope.dateKey !== dateKey ||
        scope.operatorMemberId !== memberId ||
        scope.ownerKey !== ownerKey ||
        (isToday && dateKey !== getSeoulToday().dateKey)
      ) {
        toast('선택한 출석 날짜를 다시 확인해 주세요.', 'error');
        return null;
      }
      const target = findAttendanceTarget(
        attendanceRoster ?? [],
        members,
        branchId,
        targetMemberId,
        stage,
      );
      if (!target) {
        toast('현재 지점의 출석 대상 사원인지 다시 확인해 주세요.', 'error');
      }
      return target;
    },
    [
      attendanceRoster,
      members,
      branchId,
      dateKey,
      isToday,
      memberId,
      ownerKey,
      toast,
    ],
  );

  const mutation = useMutation({
    mutationFn: async (
      operation: AttendanceOperation,
    ): Promise<string | null> => {
      const { scope, targetMemberId } = operation;
      switch (operation.kind) {
        case 'slot':
          await updateDailyAttendanceSlot(
            { ...operation.command, date: scope.dateKey },
            scope.operatorMemberId,
          );
          return null;
        case 'reset':
          await resetDailyAttendanceMember(
            { date: scope.dateKey, memberId: targetMemberId },
            scope.operatorMemberId,
          );
          return '선택한 날짜의 출석부를 시작했어요.';
        case 'reason':
          return executeAttendanceLeaveAction(
            operation.command,
            scope.branchId,
            scope.operatorMemberId,
          );
        case 'presence':
          if (!scope.isToday || scope.dateKey !== getSeoulToday().dateKey) {
            throw new Error(
              '수동 입퇴실은 오늘 출석부에서만 처리할 수 있어요.',
            );
          }
          if (operation.command.type === 'check-in') {
            await manualCheckInStudyPresenceMember(
              targetMemberId,
              operation.command.input,
              scope.operatorMemberId,
              scope.branchId,
            );
            return '수동 입실을 등록했어요.';
          }
          await manualCheckOutStudyPresenceSession(
            operation.command.sessionId,
            targetMemberId,
            scope.operatorMemberId,
            scope.branchId,
          );
          return '수동 퇴실을 처리했어요.';
      }
    },
    retry: false,
    onError: (error: Error, operation) => {
      if (operationIsCurrent(operation)) toast(error.message, 'error');
    },
    onSettled: async (result, error, operation) => {
      try {
        const operationOwner = operation.scope.ownerKey;
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: attendanceQueryKeys.all(operationOwner),
          }),
          queryClient.invalidateQueries({
            queryKey: studyTimeQueryKeys.all(operationOwner),
          }),
          ...(operation.kind !== 'presence'
            ? [
                queryClient.invalidateQueries({
                  queryKey: leaveQueryKeys.all(operationOwner),
                }),
              ]
            : []),
          ...(operation.kind === 'presence'
            ? [
                queryClient.invalidateQueries({
                  queryKey: studyPresenceQueryKeys.all(operationOwner),
                }),
              ]
            : []),
        ]);
      } finally {
        // Dated keys ensure an old request cannot unlock a newer date's row.
        pendingRef.current.delete(operation.key);
        if (mountedRef.current)
          setPendingOperations(new Map(pendingRef.current));
        if (!error && operationIsCurrent(operation)) {
          if (result) toast(result, 'success');
          if (operation.onSuccess) {
            window.setTimeout(() => {
              if (operationIsCurrent(operation)) operation.onSuccess?.();
            }, 0);
          }
        }
      }
    },
  });

  const startOperation = useCallback(
    (
      payload: OperationPayload,
      targetMemberId: number,
      onSuccess?: () => void,
    ) => {
      const scope = scopeRef.current;
      if (
        !mountedRef.current ||
        scope.branchId !== branchId ||
        scope.dateKey !== dateKey ||
        scope.operatorMemberId !== memberId ||
        scope.ownerKey !== ownerKey ||
        (scope.isToday && scope.dateKey !== getSeoulToday().dateKey)
      )
        return;
      const key = `${scope.ownerKey}:${scope.branchId}:${scope.operatorMemberId}:${scope.dateKey}:${targetMemberId}`;
      if (pendingRef.current.has(key)) return;
      const operation: AttendanceOperation = {
        ...payload,
        key,
        onSuccess,
        scope: { ...scope },
        targetMemberId,
      };
      pendingRef.current.set(key, operation);
      setPendingOperations(new Map(pendingRef.current));
      mutation.mutate(operation);
    },
    [branchId, dateKey, memberId, mutation, ownerKey],
  );

  const updateSlot = useCallback(
    (command: AttendanceSlotCommand, onSuccess?: () => void) => {
      if (validateMember(command.memberId, 'active')) {
        startOperation(
          { kind: 'slot', command: { ...command } },
          command.memberId,
          onSuccess,
        );
      }
    },
    [startOperation, validateMember],
  );

  const resetMember = useCallback(
    (targetMemberId: number, onSuccess?: () => void) => {
      if (!validateMember(targetMemberId, 'starts-today')) return;
      if (
        attendanceRoster?.find((candidate) => candidate.id === targetMemberId)
          ?.joinDate !== dateKey
      ) {
        toast('선택한 날짜에 입사한 사원인지 다시 확인해 주세요.', 'error');
        return;
      }
      startOperation({ kind: 'reset' }, targetMemberId, onSuccess);
    },
    [attendanceRoster, dateKey, startOperation, toast, validateMember],
  );

  const applyReason = useCallback(
    (command: AttendanceReasonCommand, onSuccess?: () => void) => {
      const target = validateMember(command.memberId, 'active');
      if (!target) return;
      const error = validateAttendanceReasonCommand(
        command,
        getSeoulToday().dateKey,
        target.joinDate,
      );
      if (error) {
        toast(error, 'error');
        return;
      }
      startOperation(
        {
          kind: 'reason',
          command: {
            ...command,
            dates: [...command.dates],
            slots: [...command.slots],
            reason: command.reason.trim(),
          },
        },
        command.memberId,
        onSuccess,
      );
    },
    [startOperation, toast, validateMember],
  );

  const startManualPresenceAction = useCallback(
    (command: ManualPresenceCommand, onSuccess?: () => void) => {
      if (!presenceEditable || dateKey !== getSeoulToday().dateKey) {
        toast('수동 입퇴실은 오늘 출석부에서만 처리할 수 있어요.', 'error');
        return;
      }
      startOperation(
        { kind: 'presence', command },
        command.memberId,
        onSuccess,
      );
    },
    [dateKey, presenceEditable, startOperation, toast],
  );

  const manualCheckIn = useCallback(
    (
      targetMemberId: number,
      input: StudyPresenceManualCheckInInput,
      onSuccess?: () => void,
    ) => {
      const target = validateMember(targetMemberId, 'active');
      const reason = input.reason?.trim();
      const checkedInAtMs = Date.parse(input.checkedInAt);
      if (!target) return;
      if (target.role !== 'MEMBER') {
        toast('스태프 입실은 QR로 등록해 주세요.', 'error');
        return;
      }
      if (
        target.presence === null ||
        target.presence.currentlyActive ||
        !Number.isFinite(checkedInAtMs) ||
        checkedInAtMs > Date.now() ||
        getSeoulToday(new Date(checkedInAtMs)).dateKey !== dateKey ||
        (reason?.length ?? 0) > 200
      ) {
        toast('입실 시각과 선택 사유를 다시 확인해 주세요.', 'error');
        return;
      }
      startManualPresenceAction(
        {
          input: {
            checkedInAt: input.checkedInAt,
            ...(reason ? { reason } : {}),
          },
          memberId: targetMemberId,
          type: 'check-in',
        },
        onSuccess,
      );
    },
    [dateKey, startManualPresenceAction, toast, validateMember],
  );

  const manualCheckOut = useCallback(
    (targetMemberId: number, sessionId: number, onSuccess?: () => void) => {
      const target = validateMember(targetMemberId, 'active');
      if (!target) return;
      if (
        !target.presence?.currentlyActive ||
        target.presence.activeSessionId !== sessionId
      ) {
        toast('현재 입실 세션을 다시 확인해 주세요.', 'error');
        return;
      }
      startManualPresenceAction(
        { memberId: targetMemberId, sessionId, type: 'check-out' },
        onSuccess,
      );
    },
    [startManualPresenceAction, toast, validateMember],
  );

  const currentPending = useMemo(() => {
    const cells = new Set<string>();
    const memberIds = new Set<number>();
    const presenceIds = new Set<number>();
    const resetIds = new Set<number>();
    for (const operation of pendingOperations.values()) {
      const scope = operation.scope;
      if (
        scope.ownerKey !== ownerKey ||
        scope.branchId !== branchId ||
        scope.operatorMemberId !== memberId ||
        scope.dateKey !== dateKey
      )
        continue;
      memberIds.add(operation.targetMemberId);
      if (operation.kind === 'slot')
        cells.add(
          toAttendanceCellKey(operation.targetMemberId, operation.command.slot),
        );
      if (operation.kind === 'presence')
        presenceIds.add(operation.targetMemberId);
      if (operation.kind === 'reset') resetIds.add(operation.targetMemberId);
    }
    return { cells, memberIds, presenceIds, resetIds };
  }, [branchId, dateKey, memberId, ownerKey, pendingOperations]);

  const refresh = useCallback(() => {
    void boardQuery.refetch();
    void presenceQuery.refetch();
    void rosterQuery.refetch();
  }, [boardQuery, presenceQuery, rosterQuery]);

  const periodLabel = !presenceEditable
    ? dateKey < today.dateKey
      ? '과거 기록'
      : dateKey > today.dateKey
        ? '미래 기록'
        : '오늘 기록'
    : operationalSlot === null
      ? '운영 종료'
      : beforeStudyStart
        ? '1교시 준비'
        : `${operationalSlot}교시 기준`;

  return {
    actions: {
      leaveScope: { branchId, operatorMemberId: memberId, ownerKey },
      presenceEditable,
      onManualCheckIn: manualCheckIn,
      onManualCheckOut: manualCheckOut,
      onResetMember: resetMember,
      onUpdateSlot: updateSlot,
      onApplyReason: applyReason,
      pendingCellKeys: currentPending.cells,
      pendingMemberIds: currentPending.memberIds,
      pendingPresenceMemberIds: currentPending.presenceIds,
      pendingResetIds: currentPending.resetIds,
    },
    board: {
      errorMessage: boardQuery.isError
        ? boardQuery.error.message
        : rosterQuery.isError
          ? rosterQuery.error.message
          : null,
      loading: boardQuery.isPending || rosterQuery.isPending,
      members,
      vacantSeatNumbers,
      onRetry: () => {
        void boardQuery.refetch();
        void rosterQuery.refetch();
      },
      ready: boardQuery.data !== undefined && rosterQuery.data !== undefined,
    },
    freshness: {
      onRefresh: refresh,
      refreshing:
        boardQuery.isFetching ||
        presenceQuery.isFetching ||
        rosterQuery.isFetching,
    },
    period: { activeSlot, label: periodLabel, operationalSlot },
    presence: {
      errorMessage: presenceQuery.isError ? presenceQuery.error.message : null,
      onRetry: () => void presenceQuery.refetch(),
      ready: presenceQuery.data !== undefined,
    },
    today,
    writePending: pendingOperations.size > 0,
  };
}
