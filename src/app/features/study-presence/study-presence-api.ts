import { apiRequest, ApiRequestError } from '../../core/api/api-client';

export type StudyPresenceSessionResponse = {
  sessionId: number | null;
  branchId: number | null;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  closeReason: string | null;
  active: boolean;
};

export type StudyPresenceStatusResponse = {
  checkedIn: boolean;
  session: StudyPresenceSessionResponse | null;
};

export type StudyPresenceQrAction = 'checkIn' | 'checkOut';

export type StudyPresenceDurationResponse = {
  totalSeconds: number;
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
};

export type StudyPresenceSelfSessionResponse = {
  sessionId: number;
  branchId: number;
  checkedInAt: string;
  checkedOutAt: string | null;
  currentlyActive: boolean;
  overlapStartedAt: string;
  overlapEndedAt: string;
  presenceDuration: StudyPresenceDurationResponse;
};

export type StudyPresenceSelfHistoryResponse = {
  memberId: number;
  fromDate: string;
  toDate: string;
  zoneId: string;
  asOf: string;
  sessionCount: number;
  totalPresenceDuration: StudyPresenceDurationResponse;
  sessions: StudyPresenceSelfSessionResponse[];
};

export async function fetchMyStudyPresence(
  expectedMemberId: number,
  expectedBranchId: number,
) {
  const response = await apiRequest<StudyPresenceStatusResponse>(
    '/api/study-presence/me',
    { expectedMemberId },
  );

  const branchId = response.session?.branchId ?? null;

  if (branchId !== null && branchId !== expectedBranchId) {
    throw new ApiRequestError('다른 지점의 입실 정보를 받았습니다.', 409);
  }

  return response;
}

/**
 * Self history is member-wide, not branch-scoped: after a branch transfer the
 * backend deliberately returns sessions from the previous branch alongside the
 * current one (StudyPresenceQueryServiceTest#findOwnHistoryAcrossBranches).
 * Only the member and the requested range are validated here — a branch check
 * would reject a legitimate response.
 */
export async function fetchMyStudyPresenceHistory(
  from: string,
  to: string,
  expectedMemberId: number,
) {
  const query = new URLSearchParams({ from, to });
  const response = await apiRequest<StudyPresenceSelfHistoryResponse>(
    `/api/study-presence/me/history?${query}`,
    { expectedMemberId },
  );

  if (
    response.memberId !== expectedMemberId ||
    response.fromDate !== from ||
    response.toDate !== to
  ) {
    throw new ApiRequestError(
      '요청한 회원 또는 기간과 다른 입퇴실 기록을 받았습니다.',
      409,
    );
  }

  return response;
}

export async function submitStudyPresenceQr(
  action: StudyPresenceQrAction,
  qrToken: string,
  expectedMemberId: number,
  expectedBranchId: number,
) {
  const path =
    action === 'checkIn'
      ? '/api/study-presence/check-in'
      : '/api/study-presence/check-out';
  const response = await apiRequest<StudyPresenceSessionResponse>(path, {
    body: JSON.stringify({ qrToken }),
    expectedMemberId,
    method: 'POST',
  });

  if (response.branchId !== expectedBranchId) {
    throw new ApiRequestError('다른 지점의 입퇴실 응답을 받았습니다.', 409);
  }

  return response;
}
