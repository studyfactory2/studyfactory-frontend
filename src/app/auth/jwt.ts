import { MEMBER_ROLES, type MemberRole } from './types';

export type AccessTokenPayload = {
  branchId: number | null;
  memberId: number | null;
  name: string | null;
  role: MemberRole | null;
};

const emptyPayload: AccessTokenPayload = {
  branchId: null,
  memberId: null,
  name: null,
  role: null,
};

export function decodeAccessToken(token: string): AccessTokenPayload {
  try {
    const rawPayload = token.split('.')[1];

    if (!rawPayload) {
      return emptyPayload;
    }

    const claims = JSON.parse(decodeBase64Url(rawPayload)) as {
      branchId?: unknown;
      name?: unknown;
      role?: unknown;
      sub?: unknown;
    };

    return {
      branchId: toMemberId(claims.branchId),
      memberId: toMemberId(claims.sub),
      name: typeof claims.name === 'string' ? claims.name : null,
      role: toMemberRole(claims.role),
    };
  } catch {
    return emptyPayload;
  }
}

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

function toMemberId(value: unknown): number | null {
  const parsed = typeof value === 'string' ? Number(value) : value;

  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : null;
}

function toMemberRole(value: unknown): MemberRole | null {
  return typeof value === 'string' && MEMBER_ROLES.includes(value as MemberRole)
    ? (value as MemberRole)
    : null;
}
