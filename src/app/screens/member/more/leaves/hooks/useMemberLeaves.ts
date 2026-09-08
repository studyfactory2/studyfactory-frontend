import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SessionOwnerKey } from '../../../../../core/session';
import { attendanceQueryKeys } from '../../../../../features/attendances/attendance-query-keys';
import { leaveQueryKeys } from '../../../../../features/leaves/leave-query-keys';
import {
  createMyLeave,
  deleteMyLeave,
  fetchMyLeavePlan,
  type LeaveType,
} from '../../../../../features/leaves/leaves-api';
import { studyTimeQueryKeys } from '../../../../../features/study-time/study-time-query-keys';
import { useSeoulToday } from '../../../../../shared/hooks/useSeoulToday';
import {
  compareMonths,
  getNextMonth,
  getPreviousMonth,
  type SeoulMonth,
} from '../../../../../shared/lib/seoul-date';
import { useToast } from '../../../../../shared/ui';
import {
  buildLeaveMonthCells,
  listUpcomingEntries,
} from '../model/leave.month';

const PLAN_STALE_TIME_MS = 30_000;

export function useMemberLeaves(memberId: number, ownerKey: SessionOwnerKey) {
  const today = useSeoulToday();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [visibleMonth, setVisibleMonth] = useState<SeoulMonth>(() => ({
    month: today.month,
    year: today.year,
  }));
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const planQuery = useQuery({
    queryFn: () =>
      fetchMyLeavePlan(visibleMonth.year, visibleMonth.month, memberId),
    queryKey: leaveQueryKeys.myPlan(
      ownerKey,
      visibleMonth.year,
      visibleMonth.month,
    ),
    staleTime: PLAN_STALE_TIME_MS,
  });

  const cells = useMemo(
    () =>
      buildLeaveMonthCells({
        month: visibleMonth.month,
        plan: planQuery.data,
        todayKey: today.dateKey,
        year: visibleMonth.year,
      }),
    [planQuery.data, today.dateKey, visibleMonth.month, visibleMonth.year],
  );

  const upcoming = useMemo(() => listUpcomingEntries(cells), [cells]);
  const selectedCell =
    cells.find((cell) => cell.inMonth && cell.dateKey === selectedDateKey) ??
    null;

  /**
   * A leave removes its periods from the recognized study-time report, so both
   * the leave plan and every cached report have to be refetched after a write.
   */
  const invalidateAfterWrite = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: leaveQueryKeys.all(ownerKey),
      }),
      queryClient.invalidateQueries({
        queryKey: attendanceQueryKeys.all(ownerKey),
      }),
      queryClient.invalidateQueries({
        queryKey: studyTimeQueryKeys.reports(ownerKey),
      }),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: ({
      dateKey,
      leaveType,
    }: {
      dateKey: string;
      leaveType: LeaveType;
    }) => createMyLeave(dateKey, leaveType, memberId),
    onError: (error: Error) => toast(error.message, 'error'),
    onSuccess: async () => {
      setSelectedDateKey(null);
      toast('휴무를 신청했어요.', 'success');
      await invalidateAfterWrite();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (leaveId: number) => deleteMyLeave(leaveId, memberId),
    onError: (error: Error) => toast(error.message, 'error'),
    onSuccess: async () => {
      setSelectedDateKey(null);
      toast('휴무를 취소했어요.', 'success');
      await invalidateAfterWrite();
    },
  });

  const isCurrentMonth =
    compareMonths(visibleMonth, { month: today.month, year: today.year }) === 0;

  return {
    cells,
    isCurrentMonth,
    onCloseDay: () => setSelectedDateKey(null),
    onCreateLeave: (dateKey: string, leaveType: LeaveType) =>
      createMutation.mutate({ dateKey, leaveType }),
    onDeleteLeave: (leaveId: number) => deleteMutation.mutate(leaveId),
    onGoToday: () => setVisibleMonth({ month: today.month, year: today.year }),
    onNextMonth: () =>
      setVisibleMonth((current) => getNextMonth(current.year, current.month)),
    onPreviousMonth: () =>
      setVisibleMonth((current) =>
        getPreviousMonth(current.year, current.month),
      ),
    onSelectDay: setSelectedDateKey,
    plan: {
      errorMessage: planQuery.isError ? planQuery.error.message : null,
      loading: planQuery.isPending,
      onRetry: () => void planQuery.refetch(),
    },
    saving: createMutation.isPending || deleteMutation.isPending,
    selectedCell,
    todayKey: today.dateKey,
    upcoming,
    visibleMonth,
  };
}
