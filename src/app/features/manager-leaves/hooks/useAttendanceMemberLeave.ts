import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getCurrentSession, type SessionOwnerKey } from '../../../core/session';
import { useSeoulToday } from '../../../shared/hooks/useSeoulToday';
import {
  getNextMonth,
  getPreviousMonth,
  formatKoreanDate,
  type SeoulMonth,
} from '../../../shared/lib/seoul-date';
import { selectAttendanceRoster } from '../../attendances/workspace/model/attendance-targets';
import { attendanceQueryKeys } from '../../attendances/attendance-query-keys';
import { buildManagerLeaveCalendarCells } from '../../leaves/leave-management-model';
import { leaveQueryKeys } from '../../leaves/leave-query-keys';
import {
  cancelMemberLeaveOccurrence,
  fetchMemberMonthlyLeaves,
  type LeaveOccurrenceCancellationInput,
} from '../../leaves/leaves-api';
import { memberQueryKeys } from '../../members/member-query-keys';
import { excludePendingMembers } from '../../members/member-roster';
import {
  fetchBranchMembers,
  fetchPendingPreRegistrations,
  type MemberResponse,
  type PreRegistrationResponse,
} from '../../members/members-api';
import { studyTimeQueryKeys } from '../../study-time/study-time-query-keys';
import { useToast } from '../../../shared/ui';

const ROSTER_STALE_TIME_MS = 5 * 60 * 1_000;

export type UseAttendanceMemberLeaveArgs = {
  branchId: number;
  initialDateKey: string;
  memberId: number;
  ownerKey: SessionOwnerKey;
  targetMemberId: number;
};

type DeleteOperation = {
  input: LeaveOccurrenceCancellationInput;
  key: string;
  operatorMemberId: number;
  ownerKey: SessionOwnerKey;
};

/** Explicit member leave history with source/date/period-scoped cancellation. */
export function useAttendanceMemberLeave({
  branchId,
  initialDateKey,
  memberId,
  ownerKey,
  targetMemberId,
}: UseAttendanceMemberLeaveArgs) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const today = useSeoulToday();
  const mounted = useRef(true);
  const pendingDeleteRef = useRef<string | null>(null);
  const [month, setMonth] = useState<SeoulMonth>(() =>
    toInitialMonth(initialDateKey, today),
  );

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const rosterQuery = useQuery({
    queryFn: () => fetchBranchMembers(branchId, memberId),
    queryKey: memberQueryKeys.branch(ownerKey, branchId),
    refetchOnMount: 'always',
    staleTime: ROSTER_STALE_TIME_MS,
  });
  const pendingQuery = useQuery({
    queryFn: () => fetchPendingPreRegistrations(branchId, memberId),
    queryKey: memberQueryKeys.pending(ownerKey, branchId),
    refetchOnMount: 'always',
    staleTime: ROSTER_STALE_TIME_MS,
  });
  const rosterReady =
    rosterQuery.isSuccess &&
    pendingQuery.isSuccess &&
    rosterQuery.isFetchedAfterMount &&
    pendingQuery.isFetchedAfterMount;
  const selectedMember = rosterReady
    ? findSelectedMember(
        rosterQuery.data,
        pendingQuery.data,
        branchId,
        targetMemberId,
      )
    : null;
  const monthlyQuery = useQuery({
    enabled: selectedMember !== null,
    queryFn: () =>
      fetchMemberMonthlyLeaves(
        targetMemberId,
        month.year,
        month.month,
        memberId,
      ),
    queryKey: leaveQueryKeys.memberMonth(
      ownerKey,
      branchId,
      targetMemberId,
      month.year,
      month.month,
    ),
    refetchOnMount: 'always',
    // Re-check the month when membership validation enables this query, even
    // when another screen populated the shared calendar cache recently.
    staleTime: 0,
  });
  const errorMessage = rosterQuery.isError
    ? rosterQuery.error.message
    : pendingQuery.isError
      ? pendingQuery.error.message
      : null;
  const monthlyReady =
    selectedMember !== null &&
    monthlyQuery.isSuccess &&
    monthlyQuery.isFetchedAfterMount;
  const cells = buildManagerLeaveCalendarCells({
    month: month.month,
    rows: monthlyReady ? monthlyQuery.data : [],
    todayKey: today.dateKey,
    year: month.year,
  });

  const operationIsCurrent = (operation: DeleteOperation) =>
    mounted.current &&
    getCurrentSession().ownerKey === operation.ownerKey &&
    operation.ownerKey === ownerKey &&
    operation.operatorMemberId === memberId &&
    operation.input.branchId === branchId &&
    operation.input.memberId === targetMemberId;

  const deleteMutation = useMutation({
    mutationFn: (operation: DeleteOperation) =>
      cancelMemberLeaveOccurrence(operation.input, operation.operatorMemberId),
    retry: false,
    onError: (error: Error, operation) => {
      if (operationIsCurrent(operation)) toast(error.message, 'error');
    },
    onSettled: async (result, error, operation) => {
      try {
        // Refresh even after an ambiguous network failure or a closed popup.
        // Only the operation owner's caches are affected by a late response.
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: leaveQueryKeys.all(operation.ownerKey),
          }),
          queryClient.invalidateQueries({
            queryKey: attendanceQueryKeys.all(operation.ownerKey),
          }),
          queryClient.invalidateQueries({
            queryKey: studyTimeQueryKeys.all(operation.ownerKey),
          }),
        ]);
      } finally {
        pendingDeleteRef.current = null;
        if (!error && result && operationIsCurrent(operation)) {
          toast(
            result.cancelledPeriodCount === 0
              ? '이미 삭제되었거나 변경된 휴무예요. 내역을 새로 확인했어요.'
              : `${formatKoreanDate(operation.input.leaveDate)} ${operation.input.slot}교시 휴무를 삭제했어요.`,
            result.cancelledPeriodCount === 0 ? 'info' : 'success',
          );
        }
      }
    },
  });
  const deleteReady =
    monthlyReady &&
    !monthlyQuery.isFetching &&
    !rosterQuery.isFetching &&
    !pendingQuery.isFetching &&
    !deleteMutation.isPending;

  const retryRoster = () => {
    void rosterQuery.refetch();
    void pendingQuery.refetch();
  };
  const refresh = async () => {
    const [roster, pending] = await Promise.all([
      rosterQuery.refetch(),
      pendingQuery.refetch(),
    ]);

    if (
      mounted.current &&
      roster.isSuccess &&
      pending.isSuccess &&
      findSelectedMember(roster.data, pending.data, branchId, targetMemberId)
    ) {
      await monthlyQuery.refetch();
    }
  };

  return {
    calendar: {
      cells,
      errorMessage:
        selectedMember !== null && monthlyQuery.isError
          ? monthlyQuery.error.message
          : null,
      loading:
        selectedMember !== null &&
        !monthlyQuery.isError &&
        (monthlyQuery.isPending || !monthlyQuery.isFetchedAfterMount),
      month,
      onCurrentMonth: () => setMonth({ month: today.month, year: today.year }),
      onNextMonth: () =>
        setMonth((current) => getNextMonth(current.year, current.month)),
      onPreviousMonth: () =>
        setMonth((current) => getPreviousMonth(current.year, current.month)),
      onRetry: () => {
        if (selectedMember !== null) {
          void monthlyQuery.refetch();
        }
      },
      refreshing: monthlyQuery.isFetching && monthlyQuery.data !== undefined,
      today,
    },
    deletion: {
      disabled: !deleteReady,
      pending: deleteMutation.isPending,
      pendingKey: deleteMutation.isPending
        ? (deleteMutation.variables?.key ?? null)
        : null,
      onDelete: (
        dateKey: string,
        entryKey: string,
        slot: number,
        onSuccess?: () => void,
      ) => {
        if (
          !mounted.current ||
          getCurrentSession().ownerKey !== ownerKey ||
          pendingDeleteRef.current !== null ||
          !deleteReady ||
          selectedMember === null
        ) {
          return;
        }
        const entry = cells
          .find((cell) => cell.inMonth && cell.dateKey === dateKey)
          ?.entries.find((candidate) => candidate.key === entryKey);
        if (!entry?.cancellationSource || !entry.slots.includes(slot)) {
          toast('휴무 내역을 새로고침한 뒤 다시 선택해 주세요.', 'error');
          return;
        }
        const key = `${entry.key}:${slot}`;
        pendingDeleteRef.current = key;
        const operation: DeleteOperation = {
          input: {
            ...entry.cancellationSource,
            branchId,
            leaveDate: dateKey,
            memberId: targetMemberId,
            slot,
          },
          key,
          operatorMemberId: memberId,
          ownerKey,
        };
        deleteMutation.mutate(operation, {
          onSuccess: () => {
            if (operationIsCurrent(operation)) onSuccess?.();
          },
        });
      },
    },
    member: {
      selected: selectedMember,
      unavailable: rosterReady && selectedMember === null,
    },
    request: {
      errorMessage,
      loading:
        errorMessage === null &&
        (!rosterQuery.isFetchedAfterMount ||
          !pendingQuery.isFetchedAfterMount ||
          rosterQuery.isPending ||
          pendingQuery.isPending),
      onRefresh: () => void refresh(),
      onRetry: retryRoster,
      refreshing:
        rosterQuery.isFetching ||
        pendingQuery.isFetching ||
        monthlyQuery.isFetching,
    },
  };
}

export type AttendanceMemberLeaveState = ReturnType<
  typeof useAttendanceMemberLeave
>;

function findSelectedMember(
  roster: MemberResponse[],
  pending: PreRegistrationResponse[],
  branchId: number,
  targetMemberId: number,
) {
  const members = selectAttendanceRoster(
    excludePendingMembers(roster, pending),
    branchId,
  );

  return members?.find((member) => member.id === targetMemberId) ?? null;
}

function toInitialMonth(dateKey: string, fallback: SeoulMonth): SeoulMonth {
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const parsed = new Date(Date.UTC(year, month - 1, day));

    if (
      parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() + 1 === month &&
      parsed.getUTCDate() === day
    ) {
      return { month, year };
    }
  }

  return { month: fallback.month, year: fallback.year };
}
