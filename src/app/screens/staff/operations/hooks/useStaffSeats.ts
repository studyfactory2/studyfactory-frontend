import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SessionOwnerKey } from '../../../../core/session';
import { attendanceQueryKeys } from '../../../../features/attendances/attendance-query-keys';
import { beverageQueryKeys } from '../../../../features/beverages/beverage-query-keys';
import { memberQueryKeys } from '../../../../features/members/member-query-keys';
import {
  fetchBranchMembers,
  type MemberResponse,
} from '../../../../features/members/members-api';
import { roomQueryKeys } from '../../../../features/rooms/room-query-keys';
import {
  fetchRoomLayouts,
  updateMemberSeat,
  type RoomLayoutItem,
} from '../../../../features/rooms/rooms-api';
import { useToast } from '../../../../shared/ui';

const SEATS_STALE_TIME_MS = 5 * 60 * 1_000;

export type StaffSeatAssignmentState =
  'assigned' | 'map-missing' | 'unassigned';

export type StaffSeatMember = MemberResponse & {
  assignmentState: StaffSeatAssignmentState;
  roomId: number | null;
  roomName: string | null;
};

export type StaffSeatCell = {
  item: RoomLayoutItem;
  member: StaffSeatMember | null;
};

export type StaffSeatRoom = {
  cells: StaffSeatCell[];
  cols: number;
  id: number;
  name: string;
  rows: number;
};

type UseStaffSeatsArgs = {
  branchId: number;
  memberId: number;
  ownerKey: SessionOwnerKey;
};

export function useStaffSeats({
  branchId,
  memberId,
  ownerKey,
}: UseStaffSeatsArgs) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);

  const memberQuery = useQuery({
    queryFn: () => fetchBranchMembers(branchId, memberId),
    queryKey: memberQueryKeys.branch(ownerKey, branchId),
    refetchOnWindowFocus: 'always',
    staleTime: SEATS_STALE_TIME_MS,
  });
  const roomQuery = useQuery({
    queryFn: () => fetchRoomLayouts(branchId, memberId),
    queryKey: roomQueryKeys.layouts(ownerKey, branchId),
    refetchOnWindowFocus: 'always',
    staleTime: SEATS_STALE_TIME_MS,
  });

  const view = useMemo(() => {
    const roomBySeat = new Map<number, { roomId: number; roomName: string }>();

    for (const room of roomQuery.data ?? []) {
      for (const item of room.items) {
        if (item.type === 'SEAT' && item.number !== null && item.number > 0) {
          roomBySeat.set(item.number, {
            roomId: room.id,
            roomName: room.name,
          });
        }
      }
    }

    const members: StaffSeatMember[] = (memberQuery.data ?? [])
      .filter((member) => member.role === 'MEMBER')
      .map((member) => {
        const mappedRoom =
          member.seatNumber !== null && member.seatNumber > 0
            ? roomBySeat.get(member.seatNumber)
            : undefined;
        const assignmentState: StaffSeatAssignmentState =
          member.seatNumber === null || member.seatNumber <= 0
            ? 'unassigned'
            : mappedRoom
              ? 'assigned'
              : 'map-missing';

        return {
          ...member,
          assignmentState,
          roomId: mappedRoom?.roomId ?? null,
          roomName: mappedRoom?.roomName ?? null,
        };
      })
      .sort(compareMembers);
    const memberBySeat = new Map<number, StaffSeatMember>();

    /* MemberResponse is authoritative for occupancy. The room payload's
       memberId can be stale while an assignment cache is being refreshed. */
    for (const member of members) {
      if (
        member.seatNumber !== null &&
        member.seatNumber > 0 &&
        !memberBySeat.has(member.seatNumber)
      ) {
        memberBySeat.set(member.seatNumber, member);
      }
    }

    const rooms: StaffSeatRoom[] = (roomQuery.data ?? []).map((room) => ({
      cells: room.items.map((item) => ({
        item,
        member:
          item.type === 'SEAT' && item.number !== null
            ? (memberBySeat.get(item.number) ?? null)
            : null,
      })),
      cols: room.cols,
      id: room.id,
      name: room.name,
      rows: room.rows,
    }));

    return {
      assignedCount: members.filter(
        (member) => member.assignmentState === 'assigned',
      ).length,
      mapMissingCount: members.filter(
        (member) => member.assignmentState === 'map-missing',
      ).length,
      members,
      rooms,
      unassignedCount: members.filter(
        (member) => member.assignmentState === 'unassigned',
      ).length,
    };
  }, [memberQuery.data, roomQuery.data]);

  const selectedMember =
    view.members.find((member) => member.id === selectedMemberId) ?? null;
  const selectedRoom =
    view.rooms.find((room) => room.id === selectedRoomId) ??
    view.rooms[0] ??
    null;

  const assignmentMutation = useMutation({
    mutationFn: ({
      seatNumber,
      targetMemberId,
    }: {
      seatNumber: number | null;
      targetMemberId: number;
    }) => updateMemberSeat(targetMemberId, seatNumber, branchId, memberId),
    onError: (error: Error) => toast(error.message, 'error'),
    onSuccess: (updatedMember) => {
      queryClient.setQueryData<MemberResponse[]>(
        memberQueryKeys.branch(ownerKey, branchId),
        (current) =>
          current?.map((member) =>
            member.id === updatedMember.id ? updatedMember : member,
          ),
      );
      toast(
        updatedMember.seatNumber === null
          ? `${updatedMember.name} 회원의 좌석을 해제했어요.`
          : `${updatedMember.name} 회원을 ${updatedMember.seatNumber}번 좌석에 배정했어요.`,
        'success',
      );

      void Promise.all([
        queryClient.invalidateQueries({
          queryKey: memberQueryKeys.all(ownerKey),
        }),
        queryClient.invalidateQueries({
          queryKey: roomQueryKeys.all(ownerKey),
        }),
        queryClient.invalidateQueries({
          queryKey: attendanceQueryKeys.all(ownerKey),
        }),
        queryClient.invalidateQueries({
          queryKey: beverageQueryKeys.all(ownerKey),
        }),
      ]);
    },
  });

  const refresh = useCallback(() => {
    void memberQuery.refetch();
    void roomQuery.refetch();
  }, [memberQuery, roomQuery]);

  return {
    ...view,
    assignment: {
      onSubmit: (targetMemberId: number, seatNumber: number | null) =>
        assignmentMutation.mutateAsync({ seatNumber, targetMemberId }),
      pending: assignmentMutation.isPending,
    },
    errorMessage: memberQuery.isError
      ? memberQuery.error.message
      : roomQuery.isError
        ? roomQuery.error.message
        : null,
    loading: memberQuery.isPending || roomQuery.isPending,
    onRefresh: refresh,
    onSelectMember: setSelectedMemberId,
    onSelectRoom: setSelectedRoomId,
    refreshing:
      !memberQuery.isPending &&
      !roomQuery.isPending &&
      (memberQuery.isFetching || roomQuery.isFetching),
    selectedMember,
    selectedRoom,
  };
}

function compareMembers(left: StaffSeatMember, right: StaffSeatMember) {
  const leftSeat =
    left.seatNumber !== null && left.seatNumber > 0
      ? left.seatNumber
      : Number.MAX_SAFE_INTEGER;
  const rightSeat =
    right.seatNumber !== null && right.seatNumber > 0
      ? right.seatNumber
      : Number.MAX_SAFE_INTEGER;

  return (
    leftSeat - rightSeat ||
    left.name.localeCompare(right.name, 'ko', { numeric: true }) ||
    left.id - right.id
  );
}
