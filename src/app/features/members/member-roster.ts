import type { MemberResponse, PreRegistrationResponse } from './members-api';

/**
 * The branch roster also contains people who have only been pre-registered.
 * The pending endpoint is the source of truth for removing those unsigned rows.
 */
export function excludePendingMembers(
  members: MemberResponse[],
  pending: PreRegistrationResponse[],
) {
  const pendingIds = new Set(pending.map((registration) => registration.id));

  return members.filter((member) => !pendingIds.has(member.id));
}
