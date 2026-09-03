import type { CertificationResponse } from '../../../../features/certifications/certifications-api';
import type { MemberResponse } from '../../../../features/members/members-api';
import {
  SEOUL_DAY_MS,
  getSeoulDayStartMs,
} from '../../../../shared/lib/seoul-date';

/**
 * A seat is optional: an operator can clear it, and a member who has not been
 * given a desk yet simply has none.
 */
export function formatSeatLabel(seatNumber: number | null | undefined) {
  return typeof seatNumber === 'number'
    ? `${seatNumber}번 좌석`
    : '좌석 미배정';
}

/**
 * The registered certificate wins; otherwise the free-text field the member
 * filled in at signup; otherwise nothing is registered at all.
 */
export function resolveCertificationLabel(
  member: MemberResponse | undefined,
  certifications: readonly CertificationResponse[] | undefined,
) {
  if (!member) {
    return null;
  }

  const registered = certifications?.find(
    (certification) => certification.id === member.certificationId,
  );

  if (registered) {
    return registered.content;
  }

  const freeText = member.preparingCertifications?.trim();

  return freeText ? freeText : '미등록';
}

/** Day 1 is the join date itself. Null for a missing or future join date. */
export function getJoinedDayCount(
  joinDate: string | null | undefined,
  todayKey: string,
) {
  if (!joinDate) {
    return null;
  }

  const joinedMs = getSeoulDayStartMs(joinDate);
  const todayMs = getSeoulDayStartMs(todayKey);

  if (Number.isNaN(joinedMs) || joinedMs > todayMs) {
    return null;
  }

  return Math.round((todayMs - joinedMs) / SEOUL_DAY_MS) + 1;
}

export function formatJoinDate(joinDate: string | null | undefined) {
  if (!joinDate) {
    return '가입일 미등록';
  }

  const [year, month, day] = joinDate.split('-').map(Number);

  return Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)
    ? `${year}년 ${month}월 ${day}일`
    : joinDate;
}
