import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { SessionOwnerKey } from '../../../../core/session';
import { branchQueryKeys } from '../../../../features/branches/branch-query-keys';
import { fetchBranches } from '../../../../features/branches/branches-api';
import { certificationQueryKeys } from '../../../../features/certifications/certification-query-keys';
import { fetchCertifications } from '../../../../features/certifications/certifications-api';
import { leaveQueryKeys } from '../../../../features/leaves/leave-query-keys';
import { fetchMyLeavePlan } from '../../../../features/leaves/leaves-api';
import { beverageQueryKeys } from '../../../../features/beverages/beverage-query-keys';
import { fetchMyBeveragePreference } from '../../../../features/beverages/beverages-api';
import { memberQueryKeys } from '../../../../features/members/member-query-keys';
import { sideDishQueryKeys } from '../../../../features/side-dishes/side-dish-query-keys';
import { fetchMySideDishes } from '../../../../features/side-dishes/side-dishes-api';
import { suggestionQueryKeys } from '../../../../features/suggestions/suggestion-query-keys';
import { fetchMySuggestions } from '../../../../features/suggestions/suggestions-api';
import { fetchMe } from '../../../../features/members/members-api';
import { studyTimeQueryKeys } from '../../../../features/study-time/study-time-query-keys';
import { fetchMyStudyTimeReport } from '../../../../features/study-time/study-time-api';
import { useSeoulToday } from '../../../../shared/hooks/useSeoulToday';
import {
  addDays,
  formatMonthDay,
  getMonthEndKey,
  getMonthStartKey,
  getWeekdayLabel,
} from '../../../../shared/lib/seoul-date';
import {
  formatJoinDate,
  formatSeatLabel,
  getJoinedDayCount,
  resolveCertificationLabel,
} from '../model/more.profile';

const PROFILE_STALE_TIME_MS = 5 * 60 * 1_000;
const REFERENCE_STALE_TIME_MS = 30 * 60 * 1_000;
const SUMMARY_STALE_TIME_MS = 60 * 1_000;

export function useMemberMore(memberId: number, ownerKey: SessionOwnerKey) {
  const today = useSeoulToday();
  const monthStart = getMonthStartKey(today.year, today.month);
  const monthEnd = getMonthEndKey(today.year, today.month);

  const meQuery = useQuery({
    queryFn: () => fetchMe(memberId),
    queryKey: memberQueryKeys.me(ownerKey),
    staleTime: PROFILE_STALE_TIME_MS,
  });

  const certificationsQuery = useQuery({
    queryFn: fetchCertifications,
    queryKey: certificationQueryKeys.all(),
    staleTime: REFERENCE_STALE_TIME_MS,
  });

  const branchesQuery = useQuery({
    queryFn: fetchBranches,
    queryKey: branchQueryKeys.all(),
    staleTime: PROFILE_STALE_TIME_MS,
  });

  /**
   * Month to date rather than the whole month: the report would otherwise be
   * asked for days that have not happened yet.
   */
  const reportQuery = useQuery({
    queryFn: () => fetchMyStudyTimeReport(monthStart, today.dateKey, memberId),
    queryKey: studyTimeQueryKeys.report(ownerKey, monthStart, today.dateKey),
    staleTime: SUMMARY_STALE_TIME_MS,
  });

  /*
   * Three small queries that exist only to put a live value on a menu row —
   * a menu that says what is waiting behind it is worth reading, one that
   * repeats its own labels is not. Each shares its key with the screen it
   * points at, so opening that screen afterwards is served from cache.
   */
  const beverageQuery = useQuery({
    queryFn: () => fetchMyBeveragePreference(memberId),
    queryKey: beverageQueryKeys.me(ownerKey),
    staleTime: SUMMARY_STALE_TIME_MS,
  });

  const sideDishQuery = useQuery({
    queryFn: () => fetchMySideDishes(today.dateKey, memberId),
    queryKey: sideDishQueryKeys.mine(ownerKey, today.dateKey),
    staleTime: SUMMARY_STALE_TIME_MS,
  });

  const suggestionQuery = useQuery({
    queryFn: () => fetchMySuggestions(memberId),
    queryKey: suggestionQueryKeys.mine(ownerKey),
    staleTime: SUMMARY_STALE_TIME_MS,
  });

  const leavePlanQuery = useQuery({
    queryFn: () => fetchMyLeavePlan(today.year, today.month, memberId),
    queryKey: leaveQueryKeys.myPlan(ownerKey, today.year, today.month),
    staleTime: SUMMARY_STALE_TIME_MS,
  });

  const profile = useMemo(() => {
    const me = meQuery.data;

    return {
      branchName:
        branchesQuery.data?.find((branch) => branch.id === me?.branchId)
          ?.name ?? null,
      certificationLabel: resolveCertificationLabel(
        me,
        certificationsQuery.data,
      ),
      joinDateLabel: formatJoinDate(me?.joinDate),
      joinedDayCount: getJoinedDayCount(me?.joinDate, today.dateKey),
      name: me?.name ?? null,
      seatLabel: formatSeatLabel(me?.seatNumber),
    };
  }, [
    branchesQuery.data,
    certificationsQuery.data,
    meQuery.data,
    today.dateKey,
  ]);

  /**
   * Two filters, both necessary. `/api/leaves/me/plan` returns the member's
   * whole leave history whichever month is asked for, so the month has to be
   * narrowed; and it merges office-assigned special and fixed leaves in, which
   * would inflate the count with recurring days the member never requested.
   * Only their own LEAVE rows are counted.
   */
  const requestedLeaveCount = useMemo(
    () =>
      (leavePlanQuery.data ?? []).filter(
        (entry) =>
          entry.source === 'LEAVE' &&
          entry.leaveDate >= monthStart &&
          entry.leaveDate <= monthEnd,
      ).length,
    [leavePlanQuery.data, monthEnd, monthStart],
  );

  /**
   * The last seven calendar days, not the last seven reported days: a day the
   * member never attended is a real zero and has to keep its slot, otherwise
   * the bars silently close the gap and a patchy week reads as a full one.
   */
  const weekPoints = useMemo(() => {
    const byDate = new Map(
      (reportQuery.data?.days ?? []).map((day) => [
        day.studyDate,
        day.totalRecognizedStudyDuration.totalSeconds,
      ]),
    );

    return Array.from({ length: 7 }, (_, index) => {
      const dateKey = addDays(today.dateKey, index - 6);

      return {
        emphasis: dateKey === today.dateKey,
        label: getWeekdayLabel(dateKey),
        value: byDate.get(dateKey) ?? 0,
      };
    });
  }, [reportQuery.data, today.dateKey]);

  /** Days of this month that have actually happened, today included. */
  const elapsedDayCount = Number(today.dateKey.slice(8, 10));
  const attendedDayCount = reportQuery.data?.attendedDayCount ?? 0;
  const studySeconds =
    reportQuery.data?.totals.totalRecognizedStudyDuration.totalSeconds ?? 0;

  /**
   * One short fact per menu row. A row with nothing to say shows nothing —
   * an empty value is quieter than "예정 없음" repeated five times down a
   * list, and the row still reads as navigation.
   */
  const menuValues = useMemo(() => {
    const nextLeave = [...(leavePlanQuery.data ?? [])]
      .filter((entry) => entry.leaveDate >= today.dateKey)
      .sort((left, right) => left.leaveDate.localeCompare(right.leaveDate))[0];
    const meals = sideDishQuery.data ?? [];
    const hasLunch = meals.some((order) => order.mealType === 'LUNCH');
    const hasDinner = meals.some((order) => order.mealType === 'DINNER');
    const drinkCount = beverageQuery.data?.items?.length ?? 0;
    const openSuggestions = (suggestionQuery.data ?? []).filter(
      (row) => !row.isResolved,
    ).length;

    return {
      beverages: drinkCount > 0 ? `${drinkCount}개` : null,
      leaves: nextLeave ? formatMonthDay(nextLeave.leaveDate) : null,
      profile: profile.seatLabel,
      sideDishes:
        hasLunch && hasDinner
          ? '점심·저녁 신청'
          : hasLunch
            ? '점심 신청됨'
            : hasDinner
              ? '저녁 신청됨'
              : null,
      suggestions: openSuggestions > 0 ? `검토 중 ${openSuggestions}건` : null,
    };
  }, [
    beverageQuery.data,
    leavePlanQuery.data,
    profile.seatLabel,
    sideDishQuery.data,
    suggestionQuery.data,
    today.dateKey,
  ]);

  return {
    member: meQuery.data ?? null,
    menuValues,
    profile: {
      ...profile,
      errorMessage: meQuery.isError
        ? meQuery.error.message
        : branchesQuery.isError
          ? branchesQuery.error.message
          : null,
      loading: meQuery.isPending,
      onRetry: () => {
        void meQuery.refetch();
        void branchesQuery.refetch();
        void certificationsQuery.refetch();
      },
    },
    stats: {
      attendedDayCount,
      /** Mean over days actually attended, so a rest day does not dilute it. */
      averageSeconds:
        attendedDayCount > 0 ? Math.round(studySeconds / attendedDayCount) : 0,
      elapsedDayCount,
      errorMessage: reportQuery.isError
        ? reportQuery.error.message
        : leavePlanQuery.isError
          ? leavePlanQuery.error.message
          : null,
      requestedLeaveCount,
      loading: reportQuery.isPending || leavePlanQuery.isPending,
      onRetry: () => {
        void reportQuery.refetch();
        void leavePlanQuery.refetch();
      },
      studySeconds,
      weekPoints,
    },
    today,
  };
}
