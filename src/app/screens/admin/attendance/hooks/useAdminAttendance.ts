import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { SessionOwnerKey } from '../../../../core/session';
import { attendanceQueryKeys } from '../../../../features/attendances/attendance-query-keys';
import { fetchDailyAttendanceBoard } from '../../../../features/attendances/attendances-api';
import {
  buildAttendanceMembers,
  type AttendanceBoardMember,
} from '../../../../features/attendances/workspace/model/attendance-board';
import { memberQueryKeys } from '../../../../features/members/member-query-keys';
import { selectAttendanceRoster } from '../../../../features/attendances/workspace/model/attendance-targets';
import {
  fetchBranchMembers,
  fetchPendingPreRegistrations,
} from '../../../../features/members/members-api';
import { studyPresenceQueryKeys } from '../../../../features/study-presence/study-presence-query-keys';
import { fetchDailyStudyPresenceHistory } from '../../../../features/study-presence/study-presence-api';
import { useAdminAttendanceActions } from './useAdminAttendanceActions';

const BOARD_STALE_TIME_MS = 60 * 1_000;
const PRESENCE_STALE_TIME_MS = 15 * 1_000;
const ROSTER_STALE_TIME_MS = 5 * 60 * 1_000;
const TODAY_REFETCH_INTERVAL_MS = 30 * 1_000;

type UseAdminAttendanceArgs = {
  branchId: number;
  dateKey: string;
  isToday: boolean;
  memberId: number;
  ownerKey: SessionOwnerKey;
  writeEnabled: boolean;
};

/**
 * Attendance data for one selected Admin branch and Seoul date. Actions are
 * exposed only for the actual current Seoul day; past boards stay read-only.
 * The pending request is part of the board's integrity boundary: until it has
 * loaded, the roster cannot safely be called the current member roster.
 */
export function useAdminAttendance({
  branchId,
  dateKey,
  isToday,
  memberId,
  ownerKey,
  writeEnabled,
}: UseAdminAttendanceArgs) {
  const boardQuery = useQuery({
    queryFn: () => fetchDailyAttendanceBoard(dateKey, branchId, memberId),
    queryKey: attendanceQueryKeys.dailyBoard(ownerKey, branchId, dateKey),
    refetchInterval: isToday ? TODAY_REFETCH_INTERVAL_MS : false,
    refetchOnWindowFocus: 'always',
    staleTime: BOARD_STALE_TIME_MS,
  });
  const presenceQuery = useQuery({
    queryFn: () => fetchDailyStudyPresenceHistory(dateKey, memberId, branchId),
    queryKey: studyPresenceQueryKeys.managerDailyHistory(
      ownerKey,
      branchId,
      dateKey,
    ),
    refetchInterval: isToday ? TODAY_REFETCH_INTERVAL_MS : false,
    refetchOnWindowFocus: 'always',
    staleTime: PRESENCE_STALE_TIME_MS,
  });
  const rosterQuery = useQuery({
    queryFn: () => fetchBranchMembers(branchId, memberId),
    queryKey: memberQueryKeys.branch(ownerKey, branchId),
    refetchOnWindowFocus: 'always',
    staleTime: ROSTER_STALE_TIME_MS,
  });
  const pendingQuery = useQuery({
    queryFn: () => fetchPendingPreRegistrations(branchId, memberId),
    queryKey: memberQueryKeys.pending(ownerKey, branchId),
    refetchOnWindowFocus: 'always',
    staleTime: ROSTER_STALE_TIME_MS,
  });

  const currentMemberRoster = useMemo(() => {
    if (rosterQuery.data === undefined || pendingQuery.data === undefined) {
      return undefined;
    }

    const pendingMemberIds = new Set(
      pendingQuery.data.map((registration) => registration.id),
    );

    return selectAttendanceRoster(rosterQuery.data, branchId, pendingMemberIds);
  }, [branchId, pendingQuery.data, rosterQuery.data]);

  const members = useMemo<AttendanceBoardMember[]>(
    () =>
      buildAttendanceMembers(
        boardQuery.data,
        presenceQuery.data,
        currentMemberRoster,
      ),
    [boardQuery.data, currentMemberRoster, presenceQuery.data],
  );

  const attendanceActions = useAdminAttendanceActions({
    attendanceMembers: members,
    branchId,
    dateKey,
    memberId,
    ownerKey,
    roster: currentMemberRoster ?? [],
    writeEnabled,
  });

  const refresh = useCallback(() => {
    void boardQuery.refetch();
    void presenceQuery.refetch();
    void rosterQuery.refetch();
    void pendingQuery.refetch();
  }, [boardQuery, pendingQuery, presenceQuery, rosterQuery]);

  const retryBoard = useCallback(() => {
    void boardQuery.refetch();
    void rosterQuery.refetch();
    void pendingQuery.refetch();
  }, [boardQuery, pendingQuery, rosterQuery]);

  const retryPresence = useCallback(() => {
    void presenceQuery.refetch();
  }, [presenceQuery]);

  const boardErrorMessage = boardQuery.isError
    ? boardQuery.error.message
    : rosterQuery.isError
      ? rosterQuery.error.message
      : pendingQuery.isError
        ? `등록 대기 목록을 불러오지 못해 현재 사원을 나눌 수 없어요. ${pendingQuery.error.message}`
        : null;

  return {
    board: {
      errorMessage: boardErrorMessage,
      loading:
        boardQuery.isPending || rosterQuery.isPending || pendingQuery.isPending,
      members,
      onRetry: retryBoard,
      ready: boardQuery.data !== undefined && currentMemberRoster !== undefined,
    },
    freshness: {
      onRefresh: refresh,
      refreshing:
        boardQuery.isFetching ||
        presenceQuery.isFetching ||
        rosterQuery.isFetching ||
        pendingQuery.isFetching,
    },
    interaction:
      writeEnabled && currentMemberRoster !== undefined
        ? attendanceActions.interaction
        : undefined,
    presence: {
      errorMessage: presenceQuery.isError ? presenceQuery.error.message : null,
      onRetry: retryPresence,
      ready: presenceQuery.data !== undefined,
    },
    writePending: attendanceActions.anyPending,
  };
}
