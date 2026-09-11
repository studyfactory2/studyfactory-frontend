import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SessionOwnerKey } from '../../../../core/session';
import { attendanceQueryKeys } from '../../../../features/attendances/attendance-query-keys';
import { leaveQueryKeys } from '../../../../features/leaves/leave-query-keys';
import {
  createMemberFixedLeave,
  deleteMemberFixedLeave,
  fetchFixedLeaves,
  generateFixedLeaves,
  type FixedLeaveCreateInput,
} from '../../../../features/leaves/leaves-api';
import { memberQueryKeys } from '../../../../features/members/member-query-keys';
import {
  fetchBranchMembers,
  fetchPendingPreRegistrations,
} from '../../../../features/members/members-api';
import { excludePendingMembers } from '../../../../features/members/member-roster';
import { studyTimeQueryKeys } from '../../../../features/study-time/study-time-query-keys';
import { useToast } from '../../../../shared/ui';
import {
  sortManagerLeaveMembers,
  sortFixedLeaves,
} from '../../../../features/leaves/leave-management-model';

const FIXED_STALE_TIME_MS = 60 * 1_000;
const ROSTER_STALE_TIME_MS = 5 * 60 * 1_000;

type UseAdminFixedLeavesArgs = {
  branchId: number;
  memberId: number;
  ownerKey: SessionOwnerKey;
};

type CreateOperation = {
  input: FixedLeaveCreateInput;
  targetMemberId: number;
};

export function useAdminFixedLeaves({
  branchId,
  memberId,
  ownerKey,
}: UseAdminFixedLeavesArgs) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fixedQuery = useQuery({
    queryFn: () => fetchFixedLeaves(branchId, memberId),
    queryKey: leaveQueryKeys.fixed(ownerKey, branchId),
    staleTime: FIXED_STALE_TIME_MS,
  });
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
  const fixedItems = useMemo(
    () => sortFixedLeaves(fixedQuery.data ?? []),
    [fixedQuery.data],
  );

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
      createMemberFixedLeave(
        operation.targetMemberId,
        branchId,
        operation.input,
        memberId,
      ),
    onError: (error: Error) => toast(error.message, 'error'),
    onSuccess: () => toast('고정 휴무 규칙을 등록했어요.', 'success'),
    onSettled: () => invalidateLeaveConsumers(),
  });
  const deleteMutation = useMutation({
    mutationFn: (fixedLeaveId: number) =>
      deleteMemberFixedLeave(fixedLeaveId, memberId),
    onError: (error: Error) => toast(error.message, 'error'),
    onSuccess: () => toast('고정 휴무 규칙을 삭제했어요.', 'success'),
    onSettled: () => invalidateLeaveConsumers(),
  });
  const generateMutation = useMutation({
    mutationFn: () => generateFixedLeaves(memberId),
    onError: (error: Error) => toast(error.message, 'error'),
    onSuccess: (response) =>
      toast(
        `${response.startDate}–${response.endDate} 고정 휴무 ${response.createdCount}건을 반영했어요.`,
        'success',
      ),
    onSettled: () => invalidateLeaveConsumers(),
  });

  return {
    create: {
      onSubmit: (
        targetMemberId: number,
        input: FixedLeaveCreateInput,
        onSuccess?: () => void,
      ) => {
        const validTarget = members.some(
          (candidate) => candidate.id === targetMemberId,
        );

        if (!validTarget || createMutation.isPending) {
          return;
        }

        createMutation.mutate(
          { input, targetMemberId },
          { onSuccess: () => onSuccess?.() },
        );
      },
      pending: createMutation.isPending,
    },
    generate: {
      onConfirm: (onSuccess?: () => void) => {
        if (!generateMutation.isPending) {
          generateMutation.mutate(undefined, { onSuccess });
        }
      },
      pending: generateMutation.isPending,
    },
    list: {
      errorMessage: fixedQuery.isError ? fixedQuery.error.message : null,
      items: fixedItems,
      loading: fixedQuery.isPending,
      onDelete: (fixedLeaveId: number, onSuccess?: () => void) => {
        const belongsToCurrentBranch = fixedItems.some(
          (item) => item.id === fixedLeaveId,
        );

        if (!deleteMutation.isPending && belongsToCurrentBranch) {
          deleteMutation.mutate(fixedLeaveId, { onSuccess });
        }
      },
      onRetry: () => void fixedQuery.refetch(),
      pendingDeleteId: deleteMutation.isPending
        ? (deleteMutation.variables ?? null)
        : null,
    },
    members,
    request: {
      errorMessage: rosterQuery.isError
        ? rosterQuery.error.message
        : pendingQuery.isError
          ? pendingQuery.error.message
          : null,
      loading: rosterQuery.isPending || pendingQuery.isPending,
      onRefresh: () => {
        void rosterQuery.refetch();
        void pendingQuery.refetch();
        void fixedQuery.refetch();
      },
      refreshing:
        (fixedQuery.isFetching && fixedQuery.data !== undefined) ||
        (rosterQuery.isFetching && rosterQuery.data !== undefined) ||
        (pendingQuery.isFetching && pendingQuery.data !== undefined),
    },
  };
}

export type AdminFixedLeavesState = ReturnType<typeof useAdminFixedLeaves>;
