import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { SessionOwnerKey } from '../../../../core/session';
import { attendanceQueryKeys } from '../../../../features/attendances/attendance-query-keys';
import { fetchDailyAttendanceBoard } from '../../../../features/attendances/attendances-api';
import { beverageQueryKeys } from '../../../../features/beverages/beverage-query-keys';
import { fetchMemberBeverages } from '../../../../features/beverages/beverages-api';
import { leaveQueryKeys } from '../../../../features/leaves/leave-query-keys';
import { fetchDailyLeaveStatuses } from '../../../../features/leaves/leaves-api';
import { roomQueryKeys } from '../../../../features/rooms/room-query-keys';
import { fetchRoomLayouts } from '../../../../features/rooms/rooms-api';
import { useSeoulToday } from '../../../../shared/hooks/useSeoulToday';
import { buildMakingBoard } from '../../../../features/beverages/beverage-rules';
import {
  buildRoomViews,
  findLateLeaves,
  findTodayChanges,
  findUnseatedDrinkers,
} from '../model/staff-beverages';

const DAILY_STALE_TIME_MS = 60 * 1_000;
/** Seats move rarely, and never during a drink round. */
const ROOM_STALE_TIME_MS = 30 * 60 * 1_000;

type UseStaffBeveragesArgs = {
  branchId: number;
  memberId: number;
  ownerKey: SessionOwnerKey;
};

export function useStaffBeverages({
  branchId,
  memberId,
  ownerKey,
}: UseStaffBeveragesArgs) {
  const today = useSeoulToday();
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);

  const beverageQuery = useQuery({
    queryFn: () => fetchMemberBeverages(branchId, memberId),
    queryKey: beverageQueryKeys.members(ownerKey, branchId),
    staleTime: DAILY_STALE_TIME_MS,
  });

  /*
   * The board is here for one reason: it is the only place that says, per
   * member and per period, who is on leave this morning. Shared key with the
   * staff home and the 출석부 tab, so on this screen it is usually a cache hit.
   */
  const boardQuery = useQuery({
    queryFn: () => fetchDailyAttendanceBoard(today.dateKey, branchId, memberId),
    queryKey: attendanceQueryKeys.dailyBoard(ownerKey, branchId, today.dateKey),
    staleTime: DAILY_STALE_TIME_MS,
  });

  const roomQuery = useQuery({
    queryFn: () => fetchRoomLayouts(branchId, memberId),
    queryKey: roomQueryKeys.layouts(ownerKey, branchId),
    staleTime: ROOM_STALE_TIME_MS,
  });

  /*
   * Only the late-leave notice needs this. The deduction itself comes off the
   * board, which carries no request time — and the request time is the whole
   * point of that notice.
   */
  const leaveQuery = useQuery({
    queryFn: () => fetchDailyLeaveStatuses(today.dateKey, branchId, memberId),
    queryKey: leaveQueryKeys.dailyStatus(ownerKey, branchId, today.dateKey),
    staleTime: DAILY_STALE_TIME_MS,
  });

  const making = useMemo(
    () => buildMakingBoard(beverageQuery.data, boardQuery.data),
    [beverageQuery.data, boardQuery.data],
  );

  const rooms = useMemo(
    () => buildRoomViews(roomQuery.data, beverageQuery.data, boardQuery.data),
    [beverageQuery.data, boardQuery.data, roomQuery.data],
  );

  const unseated = useMemo(
    () => findUnseatedDrinkers(beverageQuery.data, boardQuery.data),
    [beverageQuery.data, boardQuery.data],
  );

  const changes = useMemo(
    () => findTodayChanges(beverageQuery.data, today.dateKey),
    [beverageQuery.data, today.dateKey],
  );

  const lateLeaves = useMemo(
    () => findLateLeaves(leaveQuery.data, today.dateKey),
    [leaveQuery.data, today.dateKey],
  );

  const selectedRoom =
    rooms.find((room) => room.id === selectedRoomId) ?? rooms[0] ?? null;

  return {
    alerts: {
      changes,
      errorMessage: leaveQuery.isError ? leaveQuery.error.message : null,
      lateLeaves,
      /* The change list rides on the beverage query, so it can render alone. */
      loading: leaveQuery.isPending,
    },
    making: {
      ...making,
      errorMessage: beverageQuery.isError
        ? beverageQuery.error.message
        : boardQuery.isError
          ? boardQuery.error.message
          : null,
      loading: beverageQuery.isPending || boardQuery.isPending,
      onRetry: () => {
        void beverageQuery.refetch();
        void boardQuery.refetch();
      },
      /* Deductions need the board; without it every count would read high. */
      ready: beverageQuery.isSuccess && boardQuery.isSuccess,
    },
    room: {
      errorMessage: roomQuery.isError ? roomQuery.error.message : null,
      loading: roomQuery.isPending || beverageQuery.isPending,
      onRetry: () => {
        void roomQuery.refetch();
        void beverageQuery.refetch();
      },
      onSelect: setSelectedRoomId,
      rooms,
      selected: selectedRoom,
      unseated,
    },
    today,
  };
}
