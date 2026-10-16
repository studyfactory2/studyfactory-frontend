import type { DailyAttendanceBoard } from '../../attendances-api';

const STRONG_DIVIDER_SEATS = new Set([
  8, 18, 23, 28, 33, 38, 43, 48, 53, 59, 63, 67, 71, 75, 79, 83, 84, 88, 91, 94,
  97, 100,
]);
const SOFT_DIVIDER_SEATS = new Set([10, 12, 14, 16, 51]);

/** These legacy walking-order cues describe Mangmi's two physical rooms only. */
export function hasMangmiSeatLayout(
  branchName: string | null | undefined,
): boolean {
  return branchName?.trim() === '망미점';
}

export function getAttendanceSeatLayoutClassName(
  branchName: string | null | undefined,
  seatNumber: number | null,
): string {
  if (
    !hasMangmiSeatLayout(branchName) ||
    seatNumber === null ||
    !Number.isSafeInteger(seatNumber) ||
    seatNumber < 1 ||
    seatNumber > 102
  ) {
    return '';
  }

  const classes: string[] = [];

  if (seatNumber === 55) {
    classes.push('is-seat-room-start');
  } else if (STRONG_DIVIDER_SEATS.has(seatNumber)) {
    classes.push('is-seat-divider-strong');
  } else if (SOFT_DIVIDER_SEATS.has(seatNumber)) {
    classes.push('is-seat-divider-soft');
  }

  if (seatNumber === 102) classes.push('is-seat-room-end');
  if (seatNumber >= 8 && seatNumber <= 17) classes.push('is-seat-zone-light');
  if (seatNumber === 53 || seatNumber === 54) classes.push('is-seat-zone-dark');
  // The legacy final stylesheet gives seat 83 the same second-room surface.
  if (seatNumber >= 55) classes.push('is-seat-second-room');

  return classes.join(' ');
}

/** Never turn a filtered-out occupant into a vacancy or invent missing seats. */
export function getAttendanceVacantSeatNumbers(
  board: DailyAttendanceBoard | undefined,
): number[] {
  const seats = new Set<number>();

  for (const row of board?.rows ?? []) {
    if (
      row.memberId === null &&
      row.seatNumber !== null &&
      Number.isSafeInteger(row.seatNumber) &&
      row.seatNumber > 0
    ) {
      seats.add(row.seatNumber);
    }
  }

  return [...seats].sort((left, right) => left - right);
}
