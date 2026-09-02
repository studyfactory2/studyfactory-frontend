export const MEMBER_ROLES = ['MEMBER', 'STAFF', 'ADMIN'] as const;

export type MemberRole = (typeof MEMBER_ROLES)[number];

export type SessionCredentials = {
  accessToken: string;
  refreshToken: string;
};

export type SessionOwnerKey =
  `member:${number}:branch:${number}:role:${MemberRole}`;

export type Session = {
  accessToken: string | null;
  branchId: number | null;
  isAuthenticated: boolean;
  memberId: number | null;
  memberName: string | null;
  ownerKey: SessionOwnerKey | null;
  refreshToken: string | null;
  role: MemberRole | null;
};
