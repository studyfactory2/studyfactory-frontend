import type { RoomLayout } from '../../../../features/rooms/rooms-api';
import { hasSeat } from './admin-members';

export type LayoutSeat = { number: number; roomName: string };

/** Turns the real room geometry into unique, ordered seat choices. */
export function listLayoutSeats(rooms: readonly RoomLayout[]): LayoutSeat[] {
  const seats = new Map<number, LayoutSeat>();

  for (const room of rooms) {
    for (const item of room.items) {
      if (
        item.type === 'SEAT' &&
        item.number !== null &&
        Number.isInteger(item.number) &&
        item.number > 0 &&
        !seats.has(item.number)
      ) {
        seats.set(item.number, { number: item.number, roomName: room.name });
      }
    }
  }

  return [...seats.values()].sort((left, right) => left.number - right.number);
}

/** Member data is authoritative for occupancy; every role reserves its seat. */
export function collectOccupiedSeats(
  roster: readonly { id: number; seatNumber: number | null }[],
  pending: readonly { id: number; seatNumber: number | null }[],
  exceptMemberId: number | null,
) {
  const occupied = new Set<number>();

  for (const person of [...roster, ...pending]) {
    if (person.id !== exceptMemberId && hasSeat(person.seatNumber)) {
      occupied.add(person.seatNumber);
    }
  }

  return occupied;
}

export type SeatChoiceState = 'available' | 'current' | 'map-missing' | 'taken';

export type SeatChoice = {
  number: number;
  roomName: string | null;
  state: SeatChoiceState;
};

type BuildSeatChoicesArgs = {
  currentSeat: number | null;
  draftSeat: number | null;
  layoutSeats: readonly LayoutSeat[] | null;
  occupied: ReadonlySet<number> | null;
};

/**
 * Offers real unoccupied seats plus the edited record's current seat. A draft
 * choice that becomes unavailable remains visible and disabled for correction.
 */
export function buildSeatChoices({
  currentSeat,
  draftSeat,
  layoutSeats,
  occupied,
}: BuildSeatChoicesArgs): SeatChoice[] {
  const choices = new Map<number, SeatChoice>();

  if (currentSeat !== null) {
    const layoutSeat = layoutSeats?.find((seat) => seat.number === currentSeat);

    choices.set(currentSeat, {
      number: currentSeat,
      roomName: layoutSeat?.roomName ?? null,
      state:
        layoutSeats !== null && layoutSeat === undefined
          ? 'map-missing'
          : 'current',
    });
  }

  if (layoutSeats !== null && occupied !== null) {
    for (const seat of layoutSeats) {
      if (!occupied.has(seat.number) && !choices.has(seat.number)) {
        choices.set(seat.number, {
          number: seat.number,
          roomName: seat.roomName,
          state: 'available',
        });
      }
    }
  }

  if (draftSeat !== null && !choices.has(draftSeat)) {
    choices.set(draftSeat, {
      number: draftSeat,
      roomName: null,
      state: 'taken',
    });
  }

  return [...choices.values()].sort(
    (left, right) => left.number - right.number,
  );
}

export function describeSeatChoice(choice: SeatChoice) {
  const room = choice.roomName === null ? '' : ` · ${choice.roomName}`;

  switch (choice.state) {
    case 'available':
      return `${choice.number}번${room}`;
    case 'current':
      return `${choice.number}번${room} (현재)`;
    case 'map-missing':
      return `${choice.number}번 · 배치도에 없는 좌석 (현재)`;
    case 'taken':
      return `${choice.number}번 · 지금은 선택할 수 없는 좌석`;
  }
}

export function describeRegistrationSeat(seatNumber: number | null) {
  return hasSeat(seatNumber) ? `${seatNumber}번 좌석` : '좌석 미배정';
}
