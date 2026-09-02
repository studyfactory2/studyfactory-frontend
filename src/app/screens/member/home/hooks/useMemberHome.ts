import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SessionOwnerKey } from '../../../../core/session';
import { beverageQueryKeys } from '../../../../features/beverages/beverage-query-keys';
import { fetchMyBeveragePreference } from '../../../../features/beverages/beverages-api';
import { leaveQueryKeys } from '../../../../features/leaves/leave-query-keys';
import {
  fetchMyLeavePlan,
  type MemberLeavePlanResponse,
} from '../../../../features/leaves/leaves-api';
import { memberPlanQueryKeys } from '../../../../features/plans/plan-query-keys';
import { fetchWeeklyPlan } from '../../../../features/plans/plans-api';
import { studyBreakQueryKeys } from '../../../../features/study-breaks/study-break-query-keys';
import {
  fetchMyStudyBreakStatus,
  startMyBreakStudy,
  stopMyBreakStudy,
} from '../../../../features/study-breaks/study-breaks-api';
import { studyPresenceQueryKeys } from '../../../../features/study-presence/study-presence-query-keys';
import {
  fetchMyStudyPresence,
  submitStudyPresenceQr,
  type StudyPresenceQrAction,
  type StudyPresenceStatusResponse,
} from '../../../../features/study-presence/study-presence-api';
import { studyTimeQueryKeys } from '../../../../features/study-time/study-time-query-keys';
import { fetchMyStudyTimeReport } from '../../../../features/study-time/study-time-api';
import { useToast } from '../../../../shared/ui';
import { PLAN_ROWS } from '../../plans/model/plan.constants';
import {
  compareDateKeys,
  getNextMonth,
  getWeekStartKey,
} from '../model/home.dates';
import type { TodayPeriodPlan } from '../model/home.types';
import { useSeoulToday } from './useSeoulToday';

/** Recognized study time only advances while the member is checked in. */
const STUDY_TIME_REFRESH_INTERVAL_MS = 60_000;
const PRESENCE_REFRESH_INTERVAL_MS = 60_000;
const BREAK_STATUS_REFRESH_INTERVAL_MS = 30_000;

export function useMemberHome(
  memberId: number,
  branchId: number,
  ownerKey: SessionOwnerKey,
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const today = useSeoulToday();
  const weekStartKey = useMemo(
    () => getWeekStartKey(today.dateKey),
    [today.dateKey],
  );
  const nextMonth = useMemo(
    () => getNextMonth(today.year, today.month),
    [today.month, today.year],
  );

  const presenceQuery = useQuery({
    queryFn: () => fetchMyStudyPresence(memberId, branchId),
    queryKey: studyPresenceQueryKeys.me(ownerKey),
    refetchInterval: PRESENCE_REFRESH_INTERVAL_MS,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });

  const checkedIn = presenceQuery.data?.checkedIn ?? false;

  const breakStatusQuery = useQuery({
    queryFn: () => fetchMyStudyBreakStatus(memberId),
    queryKey: studyBreakQueryKeys.me(ownerKey),
    refetchInterval: checkedIn ? BREAK_STATUS_REFRESH_INTERVAL_MS : false,
    refetchOnWindowFocus: true,
    staleTime: 15_000,
  });

  const studyTimeQuery = useQuery({
    queryFn: () =>
      fetchMyStudyTimeReport(today.dateKey, today.dateKey, memberId),
    queryKey: studyTimeQueryKeys.report(ownerKey, today.dateKey, today.dateKey),
    refetchInterval: checkedIn ? STUDY_TIME_REFRESH_INTERVAL_MS : false,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });

  const weeklyPlanQuery = useQuery({
    queryFn: () => fetchWeeklyPlan(weekStartKey, memberId),
    queryKey: memberPlanQueryKeys.week(ownerKey, weekStartKey),
    staleTime: 60_000,
  });

  const beverageQuery = useQuery({
    queryFn: () => fetchMyBeveragePreference(memberId),
    queryKey: beverageQueryKeys.me(ownerKey),
    staleTime: 5 * 60_000,
  });

  const currentMonthLeaveQuery = useQuery({
    queryFn: () => fetchMyLeavePlan(today.year, today.month, memberId),
    queryKey: leaveQueryKeys.myPlan(ownerKey, today.year, today.month),
    staleTime: 5 * 60_000,
  });

  const nextMonthLeaveQuery = useQuery({
    queryFn: () => fetchMyLeavePlan(nextMonth.year, nextMonth.month, memberId),
    queryKey: leaveQueryKeys.myPlan(ownerKey, nextMonth.year, nextMonth.month),
    staleTime: 5 * 60_000,
  });

  const weeklyPlan = weeklyPlanQuery.data;

  const todayPeriods = useMemo<TodayPeriodPlan[]>(() => {
    if (!weeklyPlan) {
      return [];
    }

    return PLAN_ROWS.map((row) => ({
      items: weeklyPlan.items
        .filter(
          (item) =>
            item.dayIndex === today.dayIndex &&
            item.periodIndex === row.periodIndex &&
            item.content.trim().length > 0,
        )
        .sort((left, right) => left.sortOrder - right.sortOrder),
      row,
    })).filter((period) => period.items.length > 0);
  }, [today.dayIndex, weeklyPlan]);

  const weekSummary = useMemo(() => {
    if (!weeklyPlan) {
      return null;
    }

    const populated = weeklyPlan.items.filter(
      (item) => item.content.trim().length > 0,
    );

    return {
      completedCount: populated.filter((item) => item.done).length,
      goal: weeklyPlan.goal.trim(),
      totalCount: populated.length,
    };
  }, [weeklyPlan]);

  const upcomingLeave = useMemo(() => {
    const entries: MemberLeavePlanResponse[] = [
      ...(currentMonthLeaveQuery.data ?? []),
      ...(nextMonthLeaveQuery.data ?? []),
    ];

    return (
      entries
        .filter((entry) => compareDateKeys(entry.leaveDate, today.dateKey) >= 0)
        .sort((left, right) =>
          compareDateKeys(left.leaveDate, right.leaveDate),
        )[0] ?? null
    );
  }, [currentMonthLeaveQuery.data, nextMonthLeaveQuery.data, today.dateKey]);

  const beverageItems = useMemo(
    () =>
      (beverageQuery.data?.items ?? []).filter(
        (item) => item.name.trim().length > 0,
      ),
    [beverageQuery.data],
  );

  const presenceMutation = useMutation({
    mutationFn: ({
      action,
      qrToken,
    }: {
      action: StudyPresenceQrAction;
      qrToken: string;
    }) => submitStudyPresenceQr(action, qrToken, memberId, branchId),
    onError: (error) => toast(error.message, 'error'),
    onSuccess: async (session, { action }) => {
      queryClient.setQueryData<StudyPresenceStatusResponse>(
        studyPresenceQueryKeys.me(ownerKey),
        session.active
          ? { checkedIn: true, session }
          : { checkedIn: false, session: null },
      );
      toast(
        action === 'checkIn'
          ? '입실 체크가 완료됐어요.'
          : '퇴실 체크가 완료됐어요.',
        'success',
      );

      /*
       * Prefix keys: a check-in or checkout invalidates every presence-history
       * and study-time range this owner has cached — today, week and month —
       * without needing to know which ranges the study screen requested.
       */
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: studyPresenceQueryKeys.me(ownerKey),
        }),
        queryClient.invalidateQueries({
          queryKey: studyPresenceQueryKeys.histories(ownerKey),
        }),
        queryClient.invalidateQueries({
          queryKey: studyBreakQueryKeys.me(ownerKey),
        }),
        queryClient.invalidateQueries({
          queryKey: studyTimeQueryKeys.reports(ownerKey),
        }),
      ]);
    },
  });

  const breakStudyMutation = useMutation({
    mutationFn: (action: 'start' | 'stop') =>
      action === 'start'
        ? startMyBreakStudy(memberId, branchId)
        : stopMyBreakStudy(memberId, branchId),
    onError: (error) => toast(error.message, 'error'),
    onSuccess: async (response, action) => {
      queryClient.setQueryData(
        studyBreakQueryKeys.me(ownerKey),
        response.status,
      );
      toast(
        action === 'start'
          ? '휴식시간 공부를 시작했어요.'
          : '휴식시간 공부를 종료했어요.',
        'success',
      );
      await queryClient.invalidateQueries({
        queryKey: studyTimeQueryKeys.reports(ownerKey),
      });
    },
  });

  const submitPresenceQr = useCallback(
    (qrToken: string) =>
      presenceMutation.mutateAsync({
        action: checkedIn ? 'checkOut' : 'checkIn',
        qrToken,
      }),
    [checkedIn, presenceMutation],
  );

  return {
    attendance: {
      action: checkedIn ? ('checkOut' as const) : ('checkIn' as const),
      errorMessage: presenceMutation.isError
        ? presenceMutation.error.message
        : null,
      loading: presenceMutation.isPending,
      onReset: presenceMutation.reset,
      onSubmit: submitPresenceQr,
    },
    beverage: {
      errorMessage: beverageQuery.isError ? beverageQuery.error.message : null,
      items: beverageItems,
      loading: beverageQuery.isPending,
      onRetry: () => void beverageQuery.refetch(),
    },
    breakStudy: {
      actionError: breakStudyMutation.isError
        ? breakStudyMutation.error.message
        : null,
      actionLoading: breakStudyMutation.isPending,
      errorMessage: breakStatusQuery.isError
        ? breakStatusQuery.error.message
        : null,
      loading: breakStatusQuery.isPending,
      onRetry: () => void breakStatusQuery.refetch(),
      onStart: () => breakStudyMutation.mutateAsync('start'),
      onStop: () => breakStudyMutation.mutateAsync('stop'),
      status: breakStatusQuery.data ?? null,
    },
    leave: {
      errorMessage:
        currentMonthLeaveQuery.isError || nextMonthLeaveQuery.isError
          ? '휴무 일정을 불러오지 못했어요.'
          : null,
      loading:
        currentMonthLeaveQuery.isPending || nextMonthLeaveQuery.isPending,
      onRetry: () => {
        void currentMonthLeaveQuery.refetch();
        void nextMonthLeaveQuery.refetch();
      },
      upcoming: upcomingLeave,
    },
    presence: {
      checkedIn,
      checkedInAt: presenceQuery.data?.session?.checkedInAt ?? null,
      errorMessage: presenceQuery.isError ? presenceQuery.error.message : null,
      loading: presenceQuery.isPending,
      onRetry: () => void presenceQuery.refetch(),
    },
    studyTime: {
      errorMessage: studyTimeQuery.isError
        ? studyTimeQuery.error.message
        : null,
      loading: studyTimeQuery.isPending,
      onRetry: () => void studyTimeQuery.refetch(),
      recognizedSeconds:
        studyTimeQuery.data?.totals.totalRecognizedStudyDuration.totalSeconds ??
        null,
    },
    today,
    weeklyPlan: {
      errorMessage: weeklyPlanQuery.isError
        ? weeklyPlanQuery.error.message
        : null,
      loading: weeklyPlanQuery.isPending,
      onRetry: () => void weeklyPlanQuery.refetch(),
      summary: weekSummary,
      todayPeriods,
    },
  };
}
