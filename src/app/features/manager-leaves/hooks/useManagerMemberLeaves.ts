import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SessionOwnerKey } from '../../../core/session';
import { attendanceQueryKeys } from '../../attendances/attendance-query-keys';
import { leaveQueryKeys } from '../../leaves/leave-query-keys';
import {
  createMemberSpecialLeaves,
  deleteMemberSpecialLeaveSlot,
  fetchMemberMonthlyLeaves,
  fetchMemberSpecialLeaves,
  type SpecialLeaveCreateInput,
} from '../../leaves/leaves-api';
import { memberQueryKeys } from '../../members/member-query-keys';
import {
  fetchBranchMembers,
  fetchPendingPreRegistrations,
} from '../../members/members-api';
import { excludePendingMembers } from '../../members/member-roster';
import { studyTimeQueryKeys } from '../../study-time/study-time-query-keys';
import { useSeoulToday } from '../../../shared/hooks/useSeoulToday';
import {
  getNextMonth,
  getPreviousMonth,
  type SeoulMonth,
} from '../../../shared/lib/seoul-date';
import { useToast } from '../../../shared/ui';
import {
  buildManagerLeaveCalendarCells,
  expandSpecialLeaveSlots,
  sortManagerLeaveMembers,
} from '../../leaves/leave-management-model';

const ROSTER_STALE_TIME_MS = 5 * 60 * 1_000;
const LEAVE_STALE_TIME_MS = 60 * 1_000;

export type UseManagerMemberLeavesArgs = {
  branchId: number;
  initialDateKey?: string | null;
  initialMemberId?: number | null;
  memberId: number;
  ownerKey: SessionOwnerKey;
};

type CreateOperation = {
  input: SpecialLeaveCreateInput;
  targetMemberId: number;
};

type DeleteOperation = {
  key: string;
  slot: number;
  specialLeaveId: number;
  targetMemberId: number;
};

export function useManagerMemberLeaves({
  branchId,
  initialDateKey = null,
  initialMemberId = null,
  memberId,
  ownerKey,
}: UseManagerMemberLeavesArgs) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const today = useSeoulToday();
  const [month, setMonth] = useState<SeoulMonth>(() =>
    toInitialMonth(initialDateKey, today),
  );
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(
    initialMemberId,
  );
  const rosterQuery = useQuery({
    queryFn: () => fetchBranchMembers(branchId, memberId),
    queryKey: memberQueryKeys.branch(ownerKey, branchId),
    staleTime: ROSTER_STALE_TIME_MS,
  });
  const pendingQuery = useQuery({
    queryFn: () => fetchPendingPreRegistrations(branchId, memberId),
    queryKey: memberQueryKeys.pending(ownerKey, branchId),
    staleTime: ROSTER_STALE_TIME_MS,
  });
  const members = useMemo(() => {
    if (rosterQuery.data === undefined || pendingQuery.data === undefined) {
      return [];
    }

    return sortManagerLeaveMembers(
      excludePendingMembers(rosterQuery.data, pendingQuery.data),
    );
  }, [pendingQuery.data, rosterQuery.data]);
  const selectedMember =
    selectedMemberId === null
      ? (members[0] ?? null)
      : (members.find((candidate) => candidate.id === selectedMemberId) ??
        null);
  const targetMemberId = selectedMember?.id ?? null;
  const monthlyQuery = useQuery({
    enabled: targetMemberId !== null,
    queryFn: () =>
      fetchMemberMonthlyLeaves(
        targetMemberId as number,
        month.year,
        month.month,
        memberId,
      ),
    queryKey:
      targetMemberId === null
        ? [...leaveQueryKeys.all(ownerKey), 'memberMonth', 'none']
        : leaveQueryKeys.memberMonth(
            ownerKey,
            branchId,
            targetMemberId,
            month.year,
            month.month,
          ),
    staleTime: LEAVE_STALE_TIME_MS,
  });
  const specialQuery = useQuery({
    enabled: targetMemberId !== null,
    queryFn: () =>
      fetchMemberSpecialLeaves(targetMemberId as number, branchId, memberId),
    queryKey:
      targetMemberId === null
        ? [...leaveQueryKeys.all(ownerKey), 'memberSpecial', 'none']
        : leaveQueryKeys.memberSpecial(ownerKey, branchId, targetMemberId),
    staleTime: LEAVE_STALE_TIME_MS,
  });

  const invalidateLeaveConsumers = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: leaveQueryKeys.all(ownerKey),
      }),
      queryClient.invalidateQueries({
        queryKey: attendanceQueryKeys.all(ownerKey),
      }),
      queryClient.invalidateQueries({
        queryKey: studyTimeQueryKeys.all(ownerKey),
      }),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: (operation: CreateOperation) =>
      createMemberSpecialLeaves(
        operation.targetMemberId,
        branchId,
        operation.input,
        memberId,
      ),
    onError: (error: Error) => toast(error.message, 'error'),
    onSuccess: (created) => {
      toast(`특별 휴무 ${created.length}일을 등록했어요.`, 'success');
    },
    onSettled: () => invalidateLeaveConsumers(),
  });
  const deleteMutation = useMutation({
    mutationFn: (operation: DeleteOperation) =>
      deleteMemberSpecialLeaveSlot(
        operation.specialLeaveId,
        operation.slot,
        memberId,
      ),
    onError: (error: Error) => toast(error.message, 'error'),
    onSuccess: () => toast('선택한 교시 휴무를 삭제했어요.', 'success'),
    onSettled: () => invalidateLeaveConsumers(),
  });
  const specialEntries = useMemo(
    () => expandSpecialLeaveSlots(specialQuery.data ?? []),
    [specialQuery.data],
  );

  const selectMember = (nextMemberId: number) => {
    if (!members.some((candidate) => candidate.id === nextMemberId)) {
      return;
    }

    setSelectedMemberId(nextMemberId);
  };

  const refresh = () => {
    void rosterQuery.refetch();
    void pendingQuery.refetch();
    if (targetMemberId !== null) {
      void monthlyQuery.refetch();
      void specialQuery.refetch();
    }
  };

  return {
    calendar: {
      cells: buildManagerLeaveCalendarCells({
        month: month.month,
        rows: monthlyQuery.data ?? [],
        todayKey: today.dateKey,
        year: month.year,
      }),
      errorMessage: monthlyQuery.isError ? monthlyQuery.error.message : null,
      loading: monthlyQuery.isPending && targetMemberId !== null,
      month,
      onCurrentMonth: () => setMonth({ month: today.month, year: today.year }),
      onNextMonth: () =>
        setMonth((current) => getNextMonth(current.year, current.month)),
      onPreviousMonth: () =>
        setMonth((current) => getPreviousMonth(current.year, current.month)),
      onRetry: () => void monthlyQuery.refetch(),
      refreshing: monthlyQuery.isFetching && monthlyQuery.data !== undefined,
      today,
    },
    create: {
      onSubmit: (input: SpecialLeaveCreateInput, onSuccess?: () => void) => {
        if (targetMemberId === null || createMutation.isPending) {
          return;
        }

        createMutation.mutate(
          { input, targetMemberId },
          { onSuccess: () => onSuccess?.() },
        );
      },
      pending: createMutation.isPending,
    },
    entries: {
      errorMessage: specialQuery.isError ? specialQuery.error.message : null,
      items: specialEntries,
      loading: specialQuery.isPending && targetMemberId !== null,
      onDelete: (item: DeleteOperation, onSuccess?: () => void) => {
        const validEntry = specialEntries.some(
          (entry) =>
            entry.key === item.key &&
            entry.id === item.specialLeaveId &&
            entry.slot === item.slot,
        );

        if (
          deleteMutation.isPending ||
          item.targetMemberId !== targetMemberId ||
          !validEntry
        ) {
          return;
        }
        deleteMutation.mutate(item, { onSuccess: () => onSuccess?.() });
      },
      onRetry: () => void specialQuery.refetch(),
      pendingKey: deleteMutation.isPending
        ? (deleteMutation.variables?.key ?? null)
        : null,
    },
    member: {
      items: members,
      onChange: selectMember,
      selected: selectedMember,
      unavailable:
        selectedMemberId !== null &&
        rosterQuery.isSuccess &&
        pendingQuery.isSuccess &&
        selectedMember === null,
    },
    request: {
      errorMessage: rosterQuery.isError
        ? rosterQuery.error.message
        : pendingQuery.isError
          ? pendingQuery.error.message
          : null,
      loading: rosterQuery.isPending || pendingQuery.isPending,
      onRefresh: refresh,
      onRetry: () => {
        void rosterQuery.refetch();
        void pendingQuery.refetch();
      },
      refreshing:
        (rosterQuery.isFetching && rosterQuery.data !== undefined) ||
        (pendingQuery.isFetching && pendingQuery.data !== undefined) ||
        monthlyQuery.isFetching ||
        specialQuery.isFetching,
    },
  };
}

export type ManagerMemberLeavesState = ReturnType<
  typeof useManagerMemberLeaves
>;

function toInitialMonth(
  dateKey: string | null,
  fallback: SeoulMonth,
): SeoulMonth {
  const match = dateKey?.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return { month: fallback.month, year: fallback.year };
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  const valid =
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() + 1 === month &&
    parsed.getUTCDate() === day;

  return valid && month >= 1 && month <= 12
    ? { month, year }
    : { month: fallback.month, year: fallback.year };
}
