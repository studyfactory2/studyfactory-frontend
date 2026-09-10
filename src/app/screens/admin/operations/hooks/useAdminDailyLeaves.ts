import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { SessionOwnerKey } from '../../../../core/session';
import { leaveQueryKeys } from '../../../../features/leaves/leave-query-keys';
import { fetchDailyLeaveStatuses } from '../../../../features/leaves/leaves-api';
import { useSeoulToday } from '../../../../shared/hooks/useSeoulToday';
import { addDays } from '../../../../shared/lib/seoul-date';
import {
  buildAdminDailyLeaveMembers,
  countAdminLeaveRecords,
  filterAdminDailyLeaveMembers,
  summarizeAdminDailyLeaves,
  type AdminLeaveFilter,
} from '../model/admin-daily-leaves';

const DAILY_STALE_TIME_MS = 60 * 1_000;
const LIVE_REFETCH_MS = 60 * 1_000;
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type DateSelection = { mode: 'today' } | { dateKey: string; mode: 'fixed' };

const TODAY_SELECTION = { mode: 'today' } as const;

type UseAdminDailyLeavesArgs = {
  branchId: number;
  memberId: number;
  ownerKey: SessionOwnerKey;
};

export function useAdminDailyLeaves({
  branchId,
  memberId,
  ownerKey,
}: UseAdminDailyLeavesArgs) {
  const today = useSeoulToday();
  const [selection, setSelection] = useState<DateSelection>(TODAY_SELECTION);
  const [filter, setFilter] = useState<AdminLeaveFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const dateKey =
    selection.mode === 'today' ? today.dateKey : selection.dateKey;
  /* A future date becomes live if this screen stays open until that day. */
  const isToday = dateKey === today.dateKey;

  const dailyQuery = useQuery({
    queryFn: () => fetchDailyLeaveStatuses(dateKey, branchId, memberId),
    queryKey: leaveQueryKeys.dailyStatus(ownerKey, branchId, dateKey),
    refetchInterval: isToday ? LIVE_REFETCH_MS : false,
    refetchOnWindowFocus: isToday ? 'always' : false,
    staleTime: DAILY_STALE_TIME_MS,
  });

  const members = useMemo(
    () => buildAdminDailyLeaveMembers(dailyQuery.data ?? []),
    [dailyQuery.data],
  );
  const visibleMembers = useMemo(
    () => filterAdminDailyLeaveMembers(members, filter, searchQuery),
    [filter, members, searchQuery],
  );
  const filterCounts = useMemo(
    () => ({
      AFTERNOON: countAdminLeaveRecords(members, 'AFTERNOON'),
      ALL: countAdminLeaveRecords(members),
      FULL: countAdminLeaveRecords(members, 'FULL'),
      MORNING: countAdminLeaveRecords(members, 'MORNING'),
      OTHER: countAdminLeaveRecords(members, 'OTHER'),
    }),
    [members],
  );
  const metrics = useMemo(() => summarizeAdminDailyLeaves(members), [members]);
  const filtersActive = filter !== 'ALL' || searchQuery.trim() !== '';

  const selectDate = useCallback(
    (nextDateKey: string) => {
      if (!isValidDateKey(nextDateKey)) {
        return;
      }

      setSelection(
        nextDateKey === today.dateKey
          ? TODAY_SELECTION
          : { dateKey: nextDateKey, mode: 'fixed' },
      );
    },
    [today.dateKey],
  );

  const clearFilters = useCallback(() => {
    setFilter('ALL');
    setSearchQuery('');
  }, []);

  return {
    date: {
      dateKey,
      isToday,
      onDateChange: selectDate,
      onNextDay: () => selectDate(addDays(dateKey, 1)),
      onPreviousDay: () => selectDate(addDays(dateKey, -1)),
      onToday: () => setSelection(TODAY_SELECTION),
    },
    filter: {
      active: filtersActive,
      counts: filterCounts,
      onChange: setFilter,
      onClear: clearFilters,
      onSearchChange: setSearchQuery,
      searchQuery,
      value: filter,
    },
    list: {
      members: visibleMembers,
      recordCount: countAdminLeaveRecords(visibleMembers),
      totalRecordCount: filterCounts.ALL,
    },
    metrics,
    request: {
      errorMessage: dailyQuery.isError ? dailyQuery.error.message : null,
      loading: dailyQuery.isPending,
      onRefresh: () => void dailyQuery.refetch(),
      onRetry: () => void dailyQuery.refetch(),
      refreshing: dailyQuery.isFetching && dailyQuery.data !== undefined,
    },
  };
}

function isValidDateKey(value: string) {
  return DATE_KEY_PATTERN.test(value) && addDays(value, 0) === value;
}

export type AdminDailyLeavesState = ReturnType<typeof useAdminDailyLeaves>;
