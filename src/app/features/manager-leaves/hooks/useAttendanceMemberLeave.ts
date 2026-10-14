import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { SessionOwnerKey } from '../../../core/session';
import { useSeoulToday } from '../../../shared/hooks/useSeoulToday';
import {
  getNextMonth,
  getPreviousMonth,
  type SeoulMonth,
} from '../../../shared/lib/seoul-date';
import { selectAttendanceRoster } from '../../attendances/workspace/model/attendance-targets';
import { buildManagerLeaveCalendarCells } from '../../leaves/leave-management-model';
import { leaveQueryKeys } from '../../leaves/leave-query-keys';
import { fetchMemberMonthlyLeaves } from '../../leaves/leaves-api';
import { memberQueryKeys } from '../../members/member-query-keys';
import { excludePendingMembers } from '../../members/member-roster';
import {
  fetchBranchMembers,
  fetchPendingPreRegistrations,
  type MemberResponse,
  type PreRegistrationResponse,
} from '../../members/members-api';

const ROSTER_STALE_TIME_MS = 5 * 60 * 1_000;

export type UseAttendanceMemberLeaveArgs = {
  branchId: number;
  initialDateKey: string;
  memberId: number;
  ownerKey: SessionOwnerKey;
  targetMemberId: number;
};

/** Read-only, explicitly selected member data for the attendance leave viewer. */
export function useAttendanceMemberLeave({
  branchId,
  initialDateKey,
  memberId,
  ownerKey,
  targetMemberId,
}: UseAttendanceMemberLeaveArgs) {
  const today = useSeoulToday();
  const mounted = useRef(true);
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
    monthlyQuery.isFetchedAfterMount &&
    !monthlyQuery.isFetching;

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
      cells: buildManagerLeaveCalendarCells({
        month: month.month,
        rows: monthlyReady ? monthlyQuery.data : [],
        todayKey: today.dateKey,
        year: month.year,
      }),
      errorMessage:
        selectedMember !== null && monthlyQuery.isError
          ? monthlyQuery.error.message
          : null,
      loading:
        selectedMember !== null &&
        !monthlyQuery.isError &&
        (monthlyQuery.isPending ||
          !monthlyQuery.isFetchedAfterMount ||
          monthlyQuery.isFetching),
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
