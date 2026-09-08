export type OperationalAttendanceSlot = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const SLOT_BOUNDARIES = [
  { before: 10 * 60 * 60 + 30 * 60, slot: 1 },
  { before: 12 * 60 * 60 + 5 * 60, slot: 2 },
  { before: 14 * 60 * 60 + 30 * 60, slot: 3 },
  { before: 16 * 60 * 60 + 15 * 60, slot: 4 },
  { before: 17 * 60 * 60 + 50 * 60, slot: 5 },
  { before: 20 * 60 * 60 + 25 * 60, slot: 6 },
  { before: 22 * 60 * 60, slot: 7 },
] as const satisfies ReadonlyArray<{
  before: number;
  slot: OperationalAttendanceSlot;
}>;

/**
 * The study floor stays operational through breaks, so a break belongs to the
 * class that follows it. Before the first class it previews slot 1; at 22:00
 * the operating day is finished. This also preserves the backend's deliberate
 * slot-4 overlap: both morning and afternoon leave are excluded around 4교시.
 */
export function getOperationalAttendanceSlot(
  secondsOfDay: number,
): OperationalAttendanceSlot | null {
  return (
    SLOT_BOUNDARIES.find((boundary) => secondsOfDay < boundary.before)?.slot ??
    null
  );
}
