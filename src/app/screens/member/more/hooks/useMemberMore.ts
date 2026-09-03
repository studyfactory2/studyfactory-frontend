import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { SessionOwnerKey } from '../../../../core/session';
import { branchQueryKeys } from '../../../../features/branches/branch-query-keys';
import { fetchBranches } from '../../../../features/branches/branches-api';
import { certificationQueryKeys } from '../../../../features/certifications/certification-query-keys';
import { fetchCertifications } from '../../../../features/certifications/certifications-api';
import { leaveQueryKeys } from '../../../../features/leaves/leave-query-keys';
import { fetchMyLeavePlan } from '../../../../features/leaves/leaves-api';
import { memberQueryKeys } from '../../../../features/members/member-query-keys';
import { fetchMe } from '../../../../features/members/members-api';
import { studyTimeQueryKeys } from '../../../../features/study-time/study-time-query-keys';
import { fetchMyStudyTimeReport } from '../../../../features/study-time/study-time-api';
import { useSeoulToday } from '../../../../shared/hooks/useSeoulToday';
import {
  getMonthEndKey,
  getMonthStartKey,
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

  return {
    member: meQuery.data ?? null,
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
      attendedDayCount: reportQuery.data?.attendedDayCount ?? 0,
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
      studySeconds:
        reportQuery.data?.totals.totalRecognizedStudyDuration.totalSeconds ?? 0,
    },
    today,
  };
}
