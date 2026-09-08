import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { SessionOwnerKey } from '../../../../core/session';
import { staffScheduleQueryKeys } from '../../../../features/staff-schedules/staff-schedule-query-keys';
import { fetchStaffSchedules } from '../../../../features/staff-schedules/staff-schedules-api';
import {
  buildStaffScheduleDays,
  countAssignedScheduleDuties,
  countOwnScheduleDuties,
} from '../model/staff-schedule';

const SCHEDULE_STALE_TIME_MS = 30 * 60 * 1_000;

export function useStaffSchedule({
  branchId,
  memberId,
  memberName,
  ownerKey,
}: {
  branchId: number;
  memberId: number;
  memberName: string | null;
  ownerKey: SessionOwnerKey;
}) {
  const query = useQuery({
    queryFn: () => fetchStaffSchedules(branchId, memberId),
    queryKey: staffScheduleQueryKeys.board(ownerKey, branchId),
    staleTime: SCHEDULE_STALE_TIME_MS,
  });
  const days = useMemo(
    () => buildStaffScheduleDays(query.data ?? []),
    [query.data],
  );

  return {
    assignedCount: countAssignedScheduleDuties(days),
    days,
    errorMessage: query.isError ? query.error.message : null,
    loading: query.isPending,
    memberName,
    onRetry: () => void query.refetch(),
    ownCount: countOwnScheduleDuties(days, memberName),
    ready: query.data !== undefined,
    refreshing: query.isFetching && !query.isPending,
  };
}
