import type { MemberRole } from '../../../../core/session';
import type { PreRegistrationResponse } from '../../../../features/members/members-api';

export type RegistrationCodeDialogState =
  | { kind: 'closed' }
  | { kind: 'confirm'; registration: PreRegistrationResponse }
  | {
      kind: 'issued';
      name: string;
      role: Exclude<MemberRole, 'MEMBER'>;
      code: string | null;
      expiresAt: string | null;
    };

const seoulExpiryFormatter = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

/** RegistrationCodeService emits a UTC LocalDateTime without an offset. */
export function formatRegistrationCodeExpiry(value: string | null) {
  if (value === null) {
    return null;
  }

  const date = new Date(
    /(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value}Z`,
  );

  return Number.isNaN(date.getTime())
    ? null
    : `${seoulExpiryFormatter.format(date)} (한국 시간)`;
}
