import { useCallback, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SessionOwnerKey } from '../../../../core/session';
import { attendanceQueryKeys } from '../../../../features/attendances/attendance-query-keys';
import { getOperationalAttendanceSlot } from '../../../../features/attendances/attendance-rules';
import {
  fetchDailyAttendanceBoard,
  resetDailyAttendanceMember,
  updateDailyAttendanceSlot,
} from '../../../../features/attendances/attendances-api';
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
} from '../../../../features/attendances/workspace/model/attendance-board';
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

export function useStaffAttendance({
  branchId,
  memberId,
  ownerKey,
}: UseStaffAttendanceArgs) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const today = useSeoulToday();
  const clock = useSeoulClock();
  const operationalSlot = getOperationalAttendanceSlot(clock.secondsOfDay);
  const beforeStudyStart = clock.secondsOfDay < STUDY_START_SECONDS;
  const activeSlot = beforeStudyStart ? null : operationalSlot;
  const boardQueryKey = attendanceQueryKeys.dailyBoard(
    ownerKey,
    branchId,
    today.dateKey,
  );
  const pendingCellKeysRef = useRef(new Set<string>());
  const pendingMemberIdsRef = useRef(new Set<number>());
  const pendingPresenceMemberIdsRef = useRef(new Set<number>());
  const pendingResetIdsRef = useRef(new Set<number>());
  const presenceSuccessCallbacksRef = useRef(new Map<number, () => void>());
  const slotSuccessCallbacksRef = useRef(new Map<string, () => void>());
  const resetSuccessCallbacksRef = useRef(new Map<number, () => void>());
  const [pendingCellKeys, setPendingCellKeys] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [pendingResetIds, setPendingResetIds] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  const [pendingMemberIds, setPendingMemberIds] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  const [pendingPresenceMemberIds, setPendingPresenceMemberIds] = useState<
    ReadonlySet<number>
  >(() => new Set());

  const boardQuery = useQuery({
    queryFn: () => fetchDailyAttendanceBoard(today.dateKey, branchId, memberId),
    queryKey: boardQueryKey,
    refetchInterval: ATTENDANCE_REFETCH_MS,
    refetchOnWindowFocus: 'always',
    staleTime: BOARD_STALE_TIME_MS,
  });

  const presenceQuery = useQuery({
    queryFn: () =>
      fetchDailyStudyPresenceHistory(today.dateKey, memberId, branchId),
    queryKey: studyPresenceQueryKeys.managerDailyHistory(
      ownerKey,
      branchId,
      today.dateKey,
    ),
    refetchInterval: ATTENDANCE_REFETCH_MS,
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

  const validateMember = useCallback(
    (targetMemberId: number, stage: AttendanceMemberStage) => {
      if (today.dateKey !== getSeoulToday().dateKey) {
        toast('오늘 출석부에서만 처리할 수 있어요.', 'error');
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
    [attendanceRoster, members, branchId, today.dateKey, toast],
  );

  const slotMutation = useMutation({
    mutationFn: (command: AttendanceSlotCommand) =>
      updateDailyAttendanceSlot({ ...command, date: today.dateKey }, memberId),
    onError: (error: Error) => toast(error.message, 'error'),
    onSettled: async (_result, error, command) => {
      try {
        /* ABSENT and OTHER can remove a multi-slot leave request, so the
           authoritative board must replace every consumer's cached copy. */
        await queryClient.invalidateQueries({
          queryKey: attendanceQueryKeys.all(ownerKey),
        });
      } finally {
        const key = toAttendanceCellKey(command.memberId, command.slot);
        const onSuccess = error
          ? undefined
          : slotSuccessCallbacksRef.current.get(key);

        slotSuccessCallbacksRef.current.delete(key);
        pendingCellKeysRef.current.delete(key);
        pendingMemberIdsRef.current.delete(command.memberId);
        setPendingCellKeys(new Set(pendingCellKeysRef.current));
        setPendingMemberIds(new Set(pendingMemberIdsRef.current));
        runAfterPendingStateCommit(onSuccess);
      }
    },
  });

  const resetMutation = useMutation({
    mutationFn: (targetMemberId: number) =>
      resetDailyAttendanceMember(
        { date: today.dateKey, memberId: targetMemberId },
        memberId,
      ),
    onError: (error: Error) => toast(error.message, 'error'),
    onSuccess: () => {
      toast('신규 사원의 오늘 출석부를 시작했어요.', 'success');
    },
    onSettled: async (_result, error, targetMemberId) => {
      try {
        await queryClient.invalidateQueries({
          queryKey: attendanceQueryKeys.all(ownerKey),
        });
      } finally {
        const onSuccess = error
          ? undefined
          : resetSuccessCallbacksRef.current.get(targetMemberId);

        resetSuccessCallbacksRef.current.delete(targetMemberId);
        pendingResetIdsRef.current.delete(targetMemberId);
        pendingMemberIdsRef.current.delete(targetMemberId);
        setPendingResetIds(new Set(pendingResetIdsRef.current));
        setPendingMemberIds(new Set(pendingMemberIdsRef.current));
        runAfterPendingStateCommit(onSuccess);
      }
    },
  });

  const manualPresenceMutation = useMutation({
    mutationFn: (command: ManualPresenceCommand) =>
      command.type === 'check-in'
        ? manualCheckInStudyPresenceMember(
            command.memberId,
            command.input,
            memberId,
            branchId,
          )
        : manualCheckOutStudyPresenceSession(
            command.sessionId,
            command.memberId,
            memberId,
            branchId,
          ),
    onError: (error: Error) => toast(error.message, 'error'),
    onSuccess: (_response, command) =>
      toast(
        command.type === 'check-in'
          ? '수동 입실을 등록했어요.'
          : '수동 퇴실을 처리했어요.',
        'success',
      ),
    onSettled: async (_response, error, command) => {
      try {
        await queryClient.invalidateQueries({
          queryKey: studyPresenceQueryKeys.all(ownerKey),
        });
      } finally {
        const onSuccess = error
          ? undefined
          : presenceSuccessCallbacksRef.current.get(command.memberId);

        presenceSuccessCallbacksRef.current.delete(command.memberId);
        pendingPresenceMemberIdsRef.current.delete(command.memberId);
        pendingMemberIdsRef.current.delete(command.memberId);
        setPendingPresenceMemberIds(
          new Set(pendingPresenceMemberIdsRef.current),
        );
        setPendingMemberIds(new Set(pendingMemberIdsRef.current));
        runAfterPendingStateCommit(onSuccess);
      }
    },
  });

  const updateSlot = useCallback(
    (command: AttendanceSlotCommand, onSuccess?: () => void) => {
      if (!validateMember(command.memberId, 'active')) {
        return;
      }

      const key = toAttendanceCellKey(command.memberId, command.slot);

      if (pendingMemberIdsRef.current.has(command.memberId)) {
        return;
      }

      pendingCellKeysRef.current.add(key);
      pendingMemberIdsRef.current.add(command.memberId);
      if (onSuccess) {
        slotSuccessCallbacksRef.current.set(key, onSuccess);
      }
      setPendingCellKeys(new Set(pendingCellKeysRef.current));
      setPendingMemberIds(new Set(pendingMemberIdsRef.current));
      slotMutation.mutate(command);
    },
    [slotMutation, validateMember],
  );

  const resetMember = useCallback(
    (targetMemberId: number, onSuccess?: () => void) => {
      if (!validateMember(targetMemberId, 'starts-today')) {
        return;
      }

      if (
        attendanceRoster?.find((candidate) => candidate.id === targetMemberId)
          ?.joinDate !== today.dateKey
      ) {
        toast('오늘 입사한 사원인지 다시 확인해 주세요.', 'error');
        return;
      }

      if (pendingMemberIdsRef.current.has(targetMemberId)) {
        return;
      }

      pendingResetIdsRef.current.add(targetMemberId);
      pendingMemberIdsRef.current.add(targetMemberId);
      if (onSuccess) {
        resetSuccessCallbacksRef.current.set(targetMemberId, onSuccess);
      }
      setPendingResetIds(new Set(pendingResetIdsRef.current));
      setPendingMemberIds(new Set(pendingMemberIdsRef.current));
      resetMutation.mutate(targetMemberId);
    },
    [attendanceRoster, resetMutation, today.dateKey, toast, validateMember],
  );

  const startManualPresenceAction = useCallback(
    (command: ManualPresenceCommand, onSuccess?: () => void) => {
      if (pendingMemberIdsRef.current.has(command.memberId)) {
        return;
      }

      pendingMemberIdsRef.current.add(command.memberId);
      pendingPresenceMemberIdsRef.current.add(command.memberId);
      if (onSuccess) {
        presenceSuccessCallbacksRef.current.set(command.memberId, onSuccess);
      }
      setPendingMemberIds(new Set(pendingMemberIdsRef.current));
      setPendingPresenceMemberIds(new Set(pendingPresenceMemberIdsRef.current));
      manualPresenceMutation.mutate(command);
    },
    [manualPresenceMutation],
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

      if (!target) {
        return;
      }

      if (target.role !== 'MEMBER') {
        toast('스태프 입실은 QR로 등록해 주세요.', 'error');
        return;
      }

      if (
        target.presence === null ||
        target.presence.currentlyActive ||
        !Number.isFinite(checkedInAtMs) ||
        checkedInAtMs > Date.now() ||
        getSeoulToday(new Date(checkedInAtMs)).dateKey !== today.dateKey ||
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
    [startManualPresenceAction, today.dateKey, toast, validateMember],
  );

  const manualCheckOut = useCallback(
    (targetMemberId: number, sessionId: number, onSuccess?: () => void) => {
      const target = validateMember(targetMemberId, 'active');

      if (!target) {
        return;
      }

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

  const refresh = useCallback(() => {
    void boardQuery.refetch();
    void presenceQuery.refetch();
    void rosterQuery.refetch();
  }, [boardQuery, presenceQuery, rosterQuery]);

  const periodLabel =
    operationalSlot === null
      ? '운영 종료'
      : beforeStudyStart
        ? '1교시 준비'
        : `${operationalSlot}교시 기준`;

  return {
    actions: {
      onManualCheckIn: manualCheckIn,
      onManualCheckOut: manualCheckOut,
      onResetMember: resetMember,
      onUpdateSlot: updateSlot,
      pendingCellKeys,
      pendingMemberIds,
      pendingPresenceMemberIds,
      pendingResetIds,
    },
    board: {
      errorMessage: boardQuery.isError
        ? boardQuery.error.message
        : rosterQuery.isError
          ? rosterQuery.error.message
          : null,
      loading: boardQuery.isPending || rosterQuery.isPending,
      members,
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
    period: {
      activeSlot,
      label: periodLabel,
      operationalSlot,
    },
    presence: {
      errorMessage: presenceQuery.isError ? presenceQuery.error.message : null,
      onRetry: () => void presenceQuery.refetch(),
      ready: presenceQuery.data !== undefined,
    },
    today,
  };
}

function runAfterPendingStateCommit(callback: (() => void) | undefined) {
  if (!callback) {
    return;
  }

  window.setTimeout(callback, 0);
}
