import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { SessionOwnerKey } from '../../../../core/session';
import { memberQueryKeys } from '../../../../features/members/member-query-keys';
import {
  fetchBranchMembers,
  fetchPendingPreRegistrations,
} from '../../../../features/members/members-api';
import { roomQueryKeys } from '../../../../features/rooms/room-query-keys';
import { fetchRoomLayouts } from '../../../../features/rooms/rooms-api';
import {
  buildSeatChoices,
  collectOccupiedSeats,
  listLayoutSeats,
} from '../model/pre-registration-form';

/* Same freshness as the screen's roster queries, which these share a cache with. */
const SEAT_SOURCES_STALE_TIME_MS = 60 * 1_000;

type UseSeatOptionsArgs = {
  branchId: number;
  /** The edited record's stored seat; null when creating or unassigned. */
  currentSeat: number | null;
  draftSeat: number | null;
  /** The edited record, left out of occupancy; null when creating. */
  exceptMemberId: number | null;
  memberId: number;
  ownerKey: SessionOwnerKey;
};

/**
 * Seats the editor may offer: the branch's room layouts for what exists,
 * and the branch roster plus the pending list for who already sits where.
 * The roster queries are the ones the screen already holds (same keys), so
 * opening the editor costs one layout request; it is only mounted while the
 * editor is open, so the layout is never fetched for a screen that is only
 * being read.
 */
export function useSeatOptions({
  branchId,
  currentSeat,
  draftSeat,
  exceptMemberId,
  memberId,
  ownerKey,
}: UseSeatOptionsArgs) {
  const roomQuery = useQuery({
    queryFn: () => fetchRoomLayouts(branchId, memberId),
    queryKey: roomQueryKeys.layouts(ownerKey, branchId),
    staleTime: SEAT_SOURCES_STALE_TIME_MS,
  });
  const membersQuery = useQuery({
    queryFn: () => fetchBranchMembers(branchId, memberId),
    queryKey: memberQueryKeys.branch(ownerKey, branchId),
    refetchOnWindowFocus: 'always',
    staleTime: SEAT_SOURCES_STALE_TIME_MS,
  });
  const pendingQuery = useQuery({
    queryFn: () => fetchPendingPreRegistrations(branchId, memberId),
    queryKey: memberQueryKeys.pending(ownerKey, branchId),
    refetchOnWindowFocus: 'always',
    staleTime: SEAT_SOURCES_STALE_TIME_MS,
  });

  const layoutSeats = useMemo(
    () =>
      roomQuery.data === undefined ? null : listLayoutSeats(roomQuery.data),
    [roomQuery.data],
  );
  const occupied = useMemo(
    () =>
      membersQuery.data === undefined || pendingQuery.data === undefined
        ? null
        : collectOccupiedSeats(
            membersQuery.data,
            pendingQuery.data,
            exceptMemberId,
          ),
    [exceptMemberId, membersQuery.data, pendingQuery.data],
  );
  const choices = useMemo(
    () => buildSeatChoices({ currentSeat, draftSeat, layoutSeats, occupied }),
    [currentSeat, draftSeat, layoutSeats, occupied],
  );

  const errorMessage = roomQuery.isError
    ? `좌석 배치도를 불러오지 못했어요. ${roomQuery.error.message}`
    : membersQuery.isError
      ? `좌석 사용 현황을 불러오지 못했어요. ${membersQuery.error.message}`
      : pendingQuery.isError
        ? `좌석 사용 현황을 불러오지 못했어요. ${pendingQuery.error.message}`
        : null;

  return {
    choices,
    errorMessage,
    loading:
      roomQuery.isPending || membersQuery.isPending || pendingQuery.isPending,
    onRetry: () => {
      for (const query of [roomQuery, membersQuery, pendingQuery]) {
        if (query.isError) {
          void query.refetch();
        }
      }
    },
    /** True once every source is in and seats can be offered. */
    ready: layoutSeats !== null && occupied !== null,
  };
}

export type SeatOptionsState = ReturnType<typeof useSeatOptions>;
