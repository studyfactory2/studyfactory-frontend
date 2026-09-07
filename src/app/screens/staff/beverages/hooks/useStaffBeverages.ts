import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SessionOwnerKey } from '../../../../core/session';
import { attendanceQueryKeys } from '../../../../features/attendances/attendance-query-keys';
import { fetchDailyAttendanceBoard } from '../../../../features/attendances/attendances-api';
import { beverageQueryKeys } from '../../../../features/beverages/beverage-query-keys';
import { buildMakingBoard } from '../../../../features/beverages/beverage-rules';
import {
  fetchMemberBeverages,
  replaceMemberBeverageItems,
  type BeverageItemInput,
} from '../../../../features/beverages/beverages-api';
import { leaveQueryKeys } from '../../../../features/leaves/leave-query-keys';
import { fetchDailyLeaveStatuses } from '../../../../features/leaves/leaves-api';
import { roomQueryKeys } from '../../../../features/rooms/room-query-keys';
import { fetchRoomLayouts } from '../../../../features/rooms/rooms-api';
import { useSeoulToday } from '../../../../shared/hooks/useSeoulToday';
import { formatTimeOfDayFromEpochMs } from '../../../../shared/lib/seoul-date';
import { useToast } from '../../../../shared/ui';
import {
  buildRoomViews,
  findLateLeaves,
  findTodayChanges,
  findUnseatedDrinkers,
} from '../model/staff-beverages';

const DAILY_STALE_TIME_MS = 60 * 1_000;
/** Seats move rarely, and never during a drink round. */
const ROOM_STALE_TIME_MS = 30 * 60 * 1_000;

/** The member whose drinks are open in the editor. */
export type BeverageEditorTarget = {
  items: BeverageItemInput[];
  memberId: number;
  memberName: string;
  seatNumber: number | null;
};

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
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [editorMemberId, setEditorMemberId] = useState<number | null>(null);

  /*
   * The app-wide default is not to refetch on focus, which is right for a
   * member reading their own plan. This screen is different: a staff phone
   * comes back from the lock screen mid-round, and a member may have changed
   * their drink at 08:50. Both daily reads refetch on focus for that reason.
   */
  const beverageQuery = useQuery({
    queryFn: () => fetchMemberBeverages(branchId, memberId),
    queryKey: beverageQueryKeys.members(ownerKey, branchId),
    refetchOnWindowFocus: true,
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
    refetchOnWindowFocus: true,
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
    refetchOnWindowFocus: true,
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

  /*
   * The editor target is derived from the query rather than copied into state,
   * so a refetch that lands while the editor is open cannot leave it showing a
   * list the server no longer has.
   */
  const editorTarget = useMemo<BeverageEditorTarget | null>(() => {
    const member = beverageQuery.data?.find(
      (row) => row.memberId === editorMemberId,
    );

    if (!member) {
      return null;
    }

    return {
      items: member.items.map((item) => ({ name: item.name, note: item.note })),
      memberId: member.memberId,
      memberName: member.memberName,
      seatNumber: member.seatNumber,
    };
  }, [beverageQuery.data, editorMemberId]);

  const closeEditor = useCallback(() => setEditorMemberId(null), []);

  const saveMutation = useMutation({
    mutationFn: ({
      items,
      targetMemberId,
    }: {
      items: BeverageItemInput[];
      targetMemberId: number;
    }) => replaceMemberBeverageItems(targetMemberId, items, branchId, memberId),
    onError: (error: Error) => toast(error.message, 'error'),
    onSuccess: async () => {
      closeEditor();
      toast('음료를 저장했어요.', 'success');
      /* The root key also covers the staff home tile, so it updates too. */
      await queryClient.invalidateQueries({
        queryKey: beverageQueryKeys.all(ownerKey),
      });
    },
  });

  const refresh = useCallback(() => {
    void beverageQuery.refetch();
    void boardQuery.refetch();
    void leaveQuery.refetch();
  }, [beverageQuery, boardQuery, leaveQuery]);

  /* The oldest of the two reads the counts depend on — the honest "as of". */
  const updatedAtMs = Math.min(
    beverageQuery.dataUpdatedAt || Number.MAX_SAFE_INTEGER,
    boardQuery.dataUpdatedAt || Number.MAX_SAFE_INTEGER,
  );

  return {
    alerts: {
      changes,
      errorMessage: leaveQuery.isError ? leaveQuery.error.message : null,
      lateLeaves,
      loading: leaveQuery.isPending,
    },
    editor: {
      onClose: closeEditor,
      onOpen: (targetMemberId: number) => setEditorMemberId(targetMemberId),
      onSave: (items: BeverageItemInput[]) => {
        if (editorTarget === null) {
          return;
        }

        saveMutation.mutate({ items, targetMemberId: editorTarget.memberId });
      },
      saving: saveMutation.isPending,
      target: editorTarget,
    },
    freshness: {
      onRefresh: refresh,
      refreshing: beverageQuery.isFetching || boardQuery.isFetching,
      updatedAtLabel:
        updatedAtMs === Number.MAX_SAFE_INTEGER
          ? null
          : formatTimeOfDayFromEpochMs(updatedAtMs),
    },
    making: {
      ...making,
      errorMessage: beverageQuery.isError
        ? beverageQuery.error.message
        : boardQuery.isError
          ? boardQuery.error.message
          : null,
      loading: beverageQuery.isPending || boardQuery.isPending,
      onRetry: refresh,
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
