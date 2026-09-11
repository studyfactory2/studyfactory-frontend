import type { MemberRole } from '../../../../core/session';
import type { CertificationResponse } from '../../../../features/certifications/certifications-api';
import type {
  MemberResponse,
  PreRegistrationResponse,
} from '../../../../features/members/members-api';
import { excludePendingMembers } from '../../../../features/members/member-roster';

export type AdminMembersView = 'current' | 'pending';

export type AdminMemberRoleFilter = 'ALL' | MemberRole;

export type AdminMemberFilter = {
  query: string;
  role: AdminMemberRoleFilter;
};

export const ROLE_LABELS: Record<MemberRole, string> = {
  ADMIN: '관리자',
  MEMBER: '회원',
  STAFF: '스탭',
};

export const ROLE_FILTERS: readonly {
  label: string;
  value: AdminMemberRoleFilter;
}[] = [
  { label: '전체', value: 'ALL' },
  { label: '회원', value: 'MEMBER' },
  { label: '스탭', value: 'STAFF' },
  { label: '관리자', value: 'ADMIN' },
];

/* "10번" sorts after "9번", and 김서현/김서연 compare by syllable, not by code point. */
const nameCollator = new Intl.Collator('ko', {
  numeric: true,
  sensitivity: 'base',
});

export function hasSeat(seatNumber: number | null): seatNumber is number {
  return seatNumber !== null && Number.isInteger(seatNumber) && seatNumber > 0;
}

/**
 * The roster endpoint returns everyone attached to the branch, including
 * people who were pre-registered and have not signed up yet; the roster row
 * itself carries no flag for that. The pending list is the only source of
 * truth, so "current" is defined as roster minus pending — never guessed from
 * join dates, seats, roles, or certifications.
 */
export function splitCurrentMembers(
  members: MemberResponse[],
  pending: PreRegistrationResponse[],
) {
  return excludePendingMembers(members, pending);
}

/* Positive seats first in room order; everyone without a desk after them. */
function compareSeats(left: number | null, right: number | null) {
  const leftSeat = hasSeat(left) ? left : null;
  const rightSeat = hasSeat(right) ? right : null;

  if (leftSeat === null || rightSeat === null) {
    return leftSeat === rightSeat ? 0 : leftSeat === null ? 1 : -1;
  }

  return leftSeat - rightSeat;
}

/* Known dates first in calendar order; a missing date sinks to the end. */
function compareOptionalDates(left: string | null, right: string | null) {
  if (left === null || right === null) {
    return left === right ? 0 : left === null ? 1 : -1;
  }

  return left < right ? -1 : left > right ? 1 : 0;
}

export function sortCurrentMembers(members: MemberResponse[]) {
  return [...members].sort(
    (left, right) =>
      compareSeats(left.seatNumber, right.seatNumber) ||
      nameCollator.compare(left.name, right.name) ||
      left.id - right.id,
  );
}

export function sortPendingRegistrations(
  registrations: PreRegistrationResponse[],
) {
  return [...registrations].sort(
    (left, right) =>
      compareOptionalDates(left.expectedJoinDate, right.expectedJoinDate) ||
      compareSeats(left.seatNumber, right.seatNumber) ||
      nameCollator.compare(left.name, right.name) ||
      left.id - right.id,
  );
}

function normaliseText(text: string) {
  return text.replace(/\s+/g, '').toLowerCase();
}

/**
 * A number finds exactly that seat ("12" or "12번"); anything else matches
 * inside the name, ignoring spaces and case.
 */
export function matchesSearch(
  row: { name: string; seatNumber: number | null },
  query: string,
) {
  const needle = normaliseText(query).replace(/번$/, '');

  if (needle === '') {
    return true;
  }

  if (/^\d+$/.test(needle)) {
    return hasSeat(row.seatNumber) && row.seatNumber === Number(needle);
  }

  return normaliseText(row.name).includes(needle);
}

export function isFilterActive(filter: AdminMemberFilter) {
  return filter.query.trim() !== '' || filter.role !== 'ALL';
}

export function filterRows<
  T extends { name: string; role: MemberRole; seatNumber: number | null },
>(rows: T[], filter: AdminMemberFilter) {
  return rows.filter(
    (row) =>
      (filter.role === 'ALL' || row.role === filter.role) &&
      matchesSearch(row, filter.query),
  );
}

export type CertificationLookup = {
  byId: ReadonlyMap<number, string>;
  status: 'error' | 'loading' | 'ready';
};

export function buildCertificationLookup(
  certifications: CertificationResponse[] | undefined,
  status: CertificationLookup['status'],
): CertificationLookup {
  return {
    byId: new Map(
      (certifications ?? []).map((certification) => [
        certification.id,
        certification.content,
      ]),
    ),
    status,
  };
}

export type CertificationLabel = {
  /** True when the label is a real certification name. */
  resolved: boolean;
  text: string;
};

/**
 * Only a name from the certification list is ever shown as a name. While the
 * list is loading, or when it failed or does not contain the id, the id is
 * shown as such — never a guessed or placeholder name.
 */
export function describeCertification(
  certificationId: number | null,
  lookup: CertificationLookup,
): CertificationLabel | null {
  if (certificationId === null) {
    return null;
  }

  const name = lookup.byId.get(certificationId);

  if (name !== undefined) {
    return { resolved: true, text: name };
  }

  return {
    resolved: false,
    text:
      lookup.status === 'loading'
        ? '자격증 확인 중'
        : `자격증 #${certificationId}`,
  };
}

/**
 * Free text from the member record, most often one certification per line.
 * Split on line breaks only — a comma may be part of a name — and drop blanks.
 */
export function splitPreparingCertifications(text: string | null) {
  return (text ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '');
}

export type BeverageSummaryItem = {
  count: number;
  name: string;
  note: string | null;
};

/**
 * The drink preference as the roster stores it: names one per line, notes
 * keyed by name. Repeated names are folded into one entry with a count so a
 * two-cup order reads as "아아 ×2" rather than twice.
 */
export function summariseBeverages(
  drinkSetting: string,
  drinkNotes: Record<string, string>,
): BeverageSummaryItem[] {
  const items: BeverageSummaryItem[] = [];

  for (const line of drinkSetting.split(/\r?\n/)) {
    const name = line.trim();

    if (name === '') {
      continue;
    }

    const existing = items.find((item) => item.name === name);

    if (existing !== undefined) {
      existing.count += 1;
      continue;
    }

    const note = drinkNotes[name]?.trim();

    items.push({ count: 1, name, note: note ? note : null });
  }

  return items;
}

/** "2026-08-01" → "2026.08.01"; anything else is shown as received. */
export function formatDottedDate(dateKey: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);

  return match === null ? dateKey : `${match[1]}.${match[2]}.${match[3]}`;
}
