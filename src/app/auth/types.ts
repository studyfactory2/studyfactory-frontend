export const MEMBER_ROLES = ['MEMBER', 'STAFF', 'ADMIN'] as const;

export type MemberRole = (typeof MEMBER_ROLES)[number];

export type Session = {
  accessToken: string | null;
  memberName: string | null;
  refreshToken: string | null;
  role: MemberRole | null;
};
