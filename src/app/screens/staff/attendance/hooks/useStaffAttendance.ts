import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { SessionOwnerKey } from '../../../../core/session';
import { attendanceQueryKeys } from '../../../../features/attendances/attendance-query-keys';
import { getOperationalAttendanceSlot } from '../../../../features/attendances/attendance-rules';
import { fetchDailyAttendanceBoard } from '../../../../features/attendances/attendances-api';
import { studyPresenceQueryKeys } from '../../../../features/study-presence/study-presence-query-keys';
import { fetchLiveStudyPresence } from '../../../../features/study-presence/study-presence-api';
import { useSeoulClock } from '../../../../shared/hooks/useSeoulClock';
import { useSeoulToday } from '../../../../shared/hooks/useSeoulToday';
import { formatTimeOfDayFromEpochMs } from '../../../../shared/lib/seoul-date';
import {
  buildActiveMemberSessions,
  buildAttendanceSummary,
  buildSeatedAttendanceMembers,
} from '../model/staff-attendance';

const BOARD_STALE_TIME_MS = 60 * 1_000;
const LIVE_REFETCH_MS = 30 * 1_000;
const LIVE_STALE_TIME_MS = 15 * 1_000;
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
    refetchInterval: LIVE_REFETCH_MS,
    refetchOnWindowFocus: 'always',
    staleTime: BOARD_STALE_TIME_MS,
  });

  const liveQuery = useQuery({
    queryFn: () => fetchLiveStudyPresence(memberId, branchId),
    queryKey: studyPresenceQueryKeys.live(ownerKey),
    refetchInterval: LIVE_REFETCH_MS,
    refetchOnWindowFocus: 'always',
    staleTime: LIVE_STALE_TIME_MS,
  });

  const members = useMemo(
    () => buildSeatedAttendanceMembers(boardQuery.data),
    [boardQuery.data],
  );
  const sessions = useMemo(
    () => buildActiveMemberSessions(liveQuery.data, branchId),
    [branchId, liveQuery.data],
  );
  const summary = useMemo(
    () =>
      buildAttendanceSummary({
        activeSlot,
        boardReady: boardQuery.isSuccess,
        liveReady: liveQuery.isSuccess,
        members,
        sessions,
      }),
    [activeSlot, boardQuery.isSuccess, liveQuery.isSuccess, members, sessions],
  );

  const refresh = useCallback(() => {
    void boardQuery.refetch();
    void liveQuery.refetch();
  }, [boardQuery, liveQuery]);

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
      ready: boardQuery.isSuccess,
    },
    freshness: {
      onRefresh: refresh,
      refreshing: boardQuery.isFetching || liveQuery.isFetching,
    },
    live: {
      asOfLabel:
        liveQuery.isSuccess && liveQuery.data
          ? formatSafeTime(liveQuery.data.asOf)
          : null,
      errorMessage: liveQuery.isError ? liveQuery.error.message : null,
      loading: liveQuery.isPending,
      onRetry: () => void liveQuery.refetch(),
      ready: liveQuery.isSuccess,
      sessions,
    },
    period: {
      activeSlot,
      label: periodLabel,
      operationalSlot,
    },
    summary,
    today,
  };
}

function formatSafeTime(value: string) {
  const epochMs = Date.parse(value);

  return Number.isFinite(epochMs) ? formatTimeOfDayFromEpochMs(epochMs) : null;
}
