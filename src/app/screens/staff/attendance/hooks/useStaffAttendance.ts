import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { SessionOwnerKey } from '../../../../core/session';
import { attendanceQueryKeys } from '../../../../features/attendances/attendance-query-keys';
import { getOperationalAttendanceSlot } from '../../../../features/attendances/attendance-rules';
import { fetchDailyAttendanceBoard } from '../../../../features/attendances/attendances-api';
import { studyPresenceQueryKeys } from '../../../../features/study-presence/study-presence-query-keys';
import { fetchDailyStudyPresenceHistory } from '../../../../features/study-presence/study-presence-api';
import { useSeoulClock } from '../../../../shared/hooks/useSeoulClock';
import { useSeoulToday } from '../../../../shared/hooks/useSeoulToday';
import { buildSeatedAttendanceMembers } from '../model/staff-attendance';

const BOARD_STALE_TIME_MS = 60 * 1_000;
const ATTENDANCE_REFETCH_MS = 30 * 1_000;
const PRESENCE_STALE_TIME_MS = 15 * 1_000;
const STUDY_START_SECONDS = 9 * 60 * 60;

type UseStaffAttendanceArgs = {
  branchId: number;
  memberId: number;
  ownerKey: SessionOwnerKey;
};

export function useStaffAttendance({
  branchId,
  memberId,
  ownerKey,
}: UseStaffAttendanceArgs) {
  const today = useSeoulToday();
  const clock = useSeoulClock();
  const operationalSlot = getOperationalAttendanceSlot(clock.secondsOfDay);
  const beforeStudyStart = clock.secondsOfDay < STUDY_START_SECONDS;
  const activeSlot = beforeStudyStart ? null : operationalSlot;

  const boardQuery = useQuery({
    queryFn: () => fetchDailyAttendanceBoard(today.dateKey, branchId, memberId),
    queryKey: attendanceQueryKeys.dailyBoard(ownerKey, branchId, today.dateKey),
    refetchInterval: ATTENDANCE_REFETCH_MS,
    refetchOnWindowFocus: 'always',
    staleTime: BOARD_STALE_TIME_MS,
  });

  const presenceQuery = useQuery({
    queryFn: () =>
      fetchDailyStudyPresenceHistory(today.dateKey, memberId, branchId),
    queryKey: studyPresenceQueryKeys.managerDailyHistory(
      ownerKey,
      branchId,
      today.dateKey,
    ),
    refetchInterval: ATTENDANCE_REFETCH_MS,
    refetchOnWindowFocus: 'always',
    staleTime: PRESENCE_STALE_TIME_MS,
  });

  const members = useMemo(
    () => buildSeatedAttendanceMembers(boardQuery.data, presenceQuery.data),
    [boardQuery.data, presenceQuery.data],
  );

  const refresh = useCallback(() => {
    void boardQuery.refetch();
    void presenceQuery.refetch();
  }, [boardQuery, presenceQuery]);

  const periodLabel =
    operationalSlot === null
      ? '운영 종료'
      : beforeStudyStart
        ? '1교시 준비'
        : `${operationalSlot}교시 기준`;

  return {
    board: {
      errorMessage: boardQuery.isError ? boardQuery.error.message : null,
      loading: boardQuery.isPending,
      members,
      onRetry: () => void boardQuery.refetch(),
      ready: boardQuery.data !== undefined,
    },
    freshness: {
      onRefresh: refresh,
      refreshing: boardQuery.isFetching || presenceQuery.isFetching,
    },
    period: {
      activeSlot,
      label: periodLabel,
      operationalSlot,
    },
    presence: {
      errorMessage: presenceQuery.isError ? presenceQuery.error.message : null,
      onRetry: () => void presenceQuery.refetch(),
      ready: presenceQuery.data !== undefined,
    },
    today,
  };
}
