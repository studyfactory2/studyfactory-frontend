import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { SessionOwnerKey } from '../../../../core/session';
import { attendanceQueryKeys } from '../../../../features/attendances/attendance-query-keys';
import { fetchDailyAttendanceBoard } from '../../../../features/attendances/attendances-api';
import { beverageQueryKeys } from '../../../../features/beverages/beverage-query-keys';
import { buildMakingBoard } from '../../../../features/beverages/beverage-rules';
import { fetchMemberBeverages } from '../../../../features/beverages/beverages-api';
import { sideDishQueryKeys } from '../../../../features/side-dishes/side-dish-query-keys';
import { fetchDailySideDishes } from '../../../../features/side-dishes/side-dishes-api';
import { staffScheduleQueryKeys } from '../../../../features/staff-schedules/staff-schedule-query-keys';
import { fetchStaffSchedules } from '../../../../features/staff-schedules/staff-schedules-api';
import { studyPresenceQueryKeys } from '../../../../features/study-presence/study-presence-query-keys';
import { fetchLiveStudyPresence } from '../../../../features/study-presence/study-presence-api';
import { suggestionQueryKeys } from '../../../../features/suggestions/suggestion-query-keys';
import { fetchBranchSuggestions } from '../../../../features/suggestions/suggestions-api';
import { todoQueryKeys } from '../../../../features/todos/todo-query-keys';
import { fetchDailyTodos } from '../../../../features/todos/todos-api';
import { useSeoulToday } from '../../../../shared/hooks/useSeoulToday';
import {
  formatTimeOfDayFromEpochMs,
  getWeekdayName,
} from '../../../../shared/lib/seoul-date';
import {
  countOpenSuggestions,
  summariseMeals,
  summariseRoom,
  summariseShifts,
  summariseTodos,
} from '../model/staff-home';

/**
 * The branch changes by the minute, so "live" has to mean it. Sixty seconds is
 * slow enough to be cheap and fast enough that the ring is not lying by the
 * time someone looks up from it. TanStack pauses interval refetching while the
 * tab is hidden by default, so a phone in a pocket costs nothing.
 */
const LIVE_REFETCH_MS = 60 * 1_000;
const LIVE_STALE_TIME_MS = 30 * 1_000;
const DAILY_STALE_TIME_MS = 60 * 1_000;
/** The weekly grid is edited by an admin now and then, not during a shift. */
const SCHEDULE_STALE_TIME_MS = 30 * 60 * 1_000;

type UseStaffHomeArgs = {
  branchId: number;
  memberId: number;
  memberName: string | null;
  ownerKey: SessionOwnerKey;
};

export function useStaffHome({
  branchId,
  memberId,
  memberName,
  ownerKey,
}: UseStaffHomeArgs) {
  const today = useSeoulToday();
  const weekday = getWeekdayName(today.dateKey);

  const liveQuery = useQuery({
    queryFn: () => fetchLiveStudyPresence(memberId),
    queryKey: studyPresenceQueryKeys.live(ownerKey),
    refetchInterval: LIVE_REFETCH_MS,
    staleTime: LIVE_STALE_TIME_MS,
  });

  /*
   * The heaviest call on the screen — the board returns a row per seat, over a
   * hundred of them — but it is the only source for "who is expected today",
   * and it shares its key with the 출석부 tab, so opening that next is instant.
   * The alternative, GET /api/members, has no permission check at all on the
   * backend and would hand back every branch in the company.
   */
  const boardQuery = useQuery({
    queryFn: () => fetchDailyAttendanceBoard(today.dateKey, branchId, memberId),
    queryKey: attendanceQueryKeys.dailyBoard(ownerKey, branchId, today.dateKey),
    staleTime: DAILY_STALE_TIME_MS,
  });

  const beverageQuery = useQuery({
    queryFn: () => fetchMemberBeverages(branchId, memberId),
    queryKey: beverageQueryKeys.members(ownerKey, branchId),
    staleTime: DAILY_STALE_TIME_MS,
  });

  const todoQuery = useQuery({
    queryFn: () => fetchDailyTodos(today.dateKey, branchId, memberId),
    queryKey: todoQueryKeys.daily(ownerKey, branchId, today.dateKey),
    staleTime: LIVE_STALE_TIME_MS,
  });

  const suggestionQuery = useQuery({
    queryFn: () => fetchBranchSuggestions(memberId),
    queryKey: suggestionQueryKeys.branch(ownerKey),
    staleTime: DAILY_STALE_TIME_MS,
  });

  const sideDishQuery = useQuery({
    queryFn: () => fetchDailySideDishes(today.dateKey, branchId, memberId),
    queryKey: sideDishQueryKeys.daily(ownerKey, branchId, today.dateKey),
    staleTime: DAILY_STALE_TIME_MS,
  });

  const scheduleQuery = useQuery({
    queryFn: () => fetchStaffSchedules(branchId, memberId),
    queryKey: staffScheduleQueryKeys.board(ownerKey, branchId),
    staleTime: SCHEDULE_STALE_TIME_MS,
  });

  const room = useMemo(
    () => summariseRoom(boardQuery.data, liveQuery.data),
    [boardQuery.data, liveQuery.data],
  );
  /*
   * The same rule the beverages screen uses, not a second count of its own.
   * The drinks list is a standing preference with no date on it, so a plain sum
   * would include everyone on leave today and read high every morning.
   */
  const beverages = useMemo(
    () => buildMakingBoard(beverageQuery.data, boardQuery.data),
    [beverageQuery.data, boardQuery.data],
  );
  const todos = useMemo(() => summariseTodos(todoQuery.data), [todoQuery.data]);
  const meals = useMemo(
    () => summariseMeals(sideDishQuery.data),
    [sideDishQuery.data],
  );
  const shifts = useMemo(
    () => summariseShifts(scheduleQuery.data, weekday, memberName),
    [memberName, scheduleQuery.data, weekday],
  );
  const openSuggestionCount = useMemo(
    () => countOpenSuggestions(suggestionQuery.data),
    [suggestionQuery.data],
  );

  const roomReady = boardQuery.isSuccess && liveQuery.isSuccess;

  return {
    /**
     * A tile's number is null until its own queries have answered. Rendering a
     * zero from an empty cache would read as "nothing left to do", which is the
     * one thing this screen must never say by accident.
     */
    jobs: {
      beverages: {
        /* Null until the board is in too: the deduction depends on it. */
        cupCount: roomReady ? beverages.toMake : null,
        kindCount: beverages.kindCount,
        noteCount: beverages.noteCount,
      },
      errorMessage: beverageQuery.isError
        ? beverageQuery.error.message
        : suggestionQuery.isError
          ? suggestionQuery.error.message
          : todoQuery.isError
            ? todoQuery.error.message
            : null,
      onRetry: () => {
        void beverageQuery.refetch();
        void suggestionQuery.refetch();
        void todoQuery.refetch();
      },
      operations: {
        openSuggestionCount: suggestionQuery.isSuccess
          ? openSuggestionCount
          : null,
        remainingCount: todoQuery.isSuccess ? todos.remainingCount : null,
        urgentCount: todos.urgentCount,
      },
      room: {
        notSeatedCount: roomReady ? room.notSeatedCount : null,
        seatedCount: room.seatedCount,
        unmarkedCount: room.unmarkedCount,
      },
    },
    meals: {
      ...meals,
      errorMessage: sideDishQuery.isError ? sideDishQuery.error.message : null,
      loading: sideDishQuery.isPending,
      onRetry: () => void sideDishQuery.refetch(),
    },
    room: {
      ...room,
      asOfLabel: liveQuery.data
        ? formatTimeOfDayFromEpochMs(new Date(liveQuery.data.asOf).getTime())
        : null,
      errorMessage: liveQuery.isError
        ? liveQuery.error.message
        : boardQuery.isError
          ? boardQuery.error.message
          : null,
      loading: liveQuery.isPending || boardQuery.isPending,
      onRetry: () => {
        void liveQuery.refetch();
        void boardQuery.refetch();
      },
      ready: roomReady,
    },
    shifts: {
      ...shifts,
      errorMessage: scheduleQuery.isError ? scheduleQuery.error.message : null,
      loading: scheduleQuery.isPending,
      onRetry: () => void scheduleQuery.refetch(),
    },
    today,
    todos: {
      ...todos,
      errorMessage: todoQuery.isError ? todoQuery.error.message : null,
      loading: todoQuery.isPending,
      onRetry: () => void todoQuery.refetch(),
    },
  };
}
