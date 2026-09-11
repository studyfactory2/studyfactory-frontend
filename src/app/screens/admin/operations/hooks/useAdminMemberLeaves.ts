import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SessionOwnerKey } from '../../../../core/session';
import { attendanceQueryKeys } from '../../../../features/attendances/attendance-query-keys';
import { leaveQueryKeys } from '../../../../features/leaves/leave-query-keys';
import {
  createMemberSpecialLeaves,
  deleteMemberSpecialLeaveSlot,
  fetchMemberMonthlyLeaves,
  fetchMemberSpecialLeaves,
  type SpecialLeaveCreateInput,
} from '../../../../features/leaves/leaves-api';
import { memberQueryKeys } from '../../../../features/members/member-query-keys';
import {
  fetchBranchMembers,
  fetchPendingPreRegistrations,
} from '../../../../features/members/members-api';
import { excludePendingMembers } from '../../../../features/members/member-roster';
import { studyTimeQueryKeys } from '../../../../features/study-time/study-time-query-keys';
import { useSeoulToday } from '../../../../shared/hooks/useSeoulToday';
import {
  getNextMonth,
  getPreviousMonth,
  type SeoulMonth,
} from '../../../../shared/lib/seoul-date';
import { useToast } from '../../../../shared/ui';
import {
  buildAdminLeaveCalendarCells,
  expandSpecialLeaveSlots,
  sortAdminLeaveMembers,
} from '../model/admin-leave-management';

const ROSTER_STALE_TIME_MS = 5 * 60 * 1_000;
const LEAVE_STALE_TIME_MS = 60 * 1_000;

type UseAdminMemberLeavesArgs = {
  branchId: number;
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

export function useAdminMemberLeaves({
  branchId,
  memberId,
  ownerKey,
}: UseAdminMemberLeavesArgs) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const today = useSeoulToday();
  const [month, setMonth] = useState<SeoulMonth>(() => ({
    month: today.month,
    year: today.year,
  }));
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
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

    return sortAdminLeaveMembers(
      excludePendingMembers(rosterQuery.data, pendingQuery.data),
    );
  }, [pendingQuery.data, rosterQuery.data]);
  const selectedMember =
    members.find((candidate) => candidate.id === selectedMemberId) ??
    members[0] ??
    null;
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
      cells: buildAdminLeaveCalendarCells({
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

export type AdminMemberLeavesState = ReturnType<typeof useAdminMemberLeaves>;
