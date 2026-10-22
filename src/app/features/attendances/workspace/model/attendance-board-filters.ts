import type { OperationalAttendanceSlot } from '../../attendance-rules';
import type { AttendanceBoardMember } from './attendance-board';
import { hasMangmiSeatLayout } from './attendance-seat-layout.ts';

export type AttendanceFilter = 'all' | 'unmarked' | 'hide-vacant';

type MemberFilterOptions = {
  activeSlot: OperationalAttendanceSlot | null;
  filter: AttendanceFilter;
  interactive: boolean;
  isToday: boolean;
  operationalSlot: OperationalAttendanceSlot | null;
  query: string;
  selectedMemberId: number | null;
};

/** Hiding vacant layout rows never excludes a person, even without a seat. */
export function filterAttendanceMembers(
  members: readonly AttendanceBoardMember[],
  {
    activeSlot,
    filter,
    interactive,
    isToday,
    operationalSlot,
    query,
    selectedMemberId,
  }: MemberFilterOptions,
) {
  const normalizedQuery = query.trim().toLocaleLowerCase('ko');
  const filterSlot = operationalSlot ?? 7;
  const readOnlyUnmarkedSlotCount =
    !isToday || operationalSlot === null ? 7 : (activeSlot ?? 0);

  return members.filter((member) => {
    const matchesQuery =
      normalizedQuery.length === 0 ||
      member.name.toLocaleLowerCase('ko').includes(normalizedQuery) ||
      (member.seatNumber === null
        ? '미배정'.includes(normalizedQuery)
        : String(member.seatNumber).includes(normalizedQuery));
    const matchesFilter =
      member.memberId === selectedMemberId ||
      filter !== 'unmarked' ||
      (member.stage === 'active' &&
        (!isToday || !interactive
          ? member.slots
              .slice(0, readOnlyUnmarkedSlotCount)
              .some((cell) => cell.state === 'unmarked')
          : activeSlot !== null &&
            member.slots[filterSlot - 1]?.state === 'unmarked'));

    return matchesQuery && matchesFilter;
  });
}

/** Vacancies remain read-only layout markers, separate from member records. */
export function filterAttendanceVacancies(
  vacantSeatNumbers: readonly number[],
  {
    branchName,
    filter,
    query,
  }: {
    branchName: string | null;
    filter: AttendanceFilter;
    query: string;
  },
) {
  if (filter !== 'all' || !hasMangmiSeatLayout(branchName)) return [];

  const normalizedQuery = query.trim().toLocaleLowerCase('ko');
  return vacantSeatNumbers.filter(
    (seatNumber) =>
      seatNumber <= 102 &&
      (normalizedQuery.length === 0 ||
        '공석'.includes(normalizedQuery) ||
        String(seatNumber).includes(normalizedQuery)),
  );
}
