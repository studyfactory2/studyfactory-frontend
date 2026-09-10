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

export type StudyPresenceCheckInMethod = 'MANAGER' | 'QR';
export type StudyPresenceCloseReason = 'CHECK_OUT' | 'MEMBER_DELETED';
export type StudyPresenceCheckoutMethod =
  'AUTO_MIDNIGHT' | 'MANAGER' | 'MEMBER_DELETED' | 'QR';

export type StudyPresenceManagerSessionResponse = {
  sessionId: number;
  memberId: number;
  /** Null when the session belongs to another branch than the member row. */
  memberName: string | null;
  memberRole: 'ADMIN' | 'MEMBER' | 'STAFF' | null;
  seatNumber: number | null;
  branchId: number;
  checkedInAt: string;
  checkInMethod: StudyPresenceCheckInMethod | null;
  checkedInByMemberId: number | null;
  manualCheckInReason: string | null;
  checkedOutAt: string | null;
  closeReason: StudyPresenceCloseReason | null;
  closedByMemberId: number | null;
  checkoutMethod: StudyPresenceCheckoutMethod | null;
  currentlyActive: boolean;
  overlapStartedAt: string;
  overlapEndedAt: string;
  presenceDuration: StudyPresenceDurationResponse;
};

export type StudyPresenceManualCheckInInput = {
  checkedInAt: string;
  reason: string;
};

/**
 * Records a member's missed door check-in. The backend pins the operation to
 * the signed-in STAFF/ADMIN member's branch and accepts only a MEMBER target.
 */
export async function manualCheckInStudyPresenceMember(
  targetMemberId: number,
  input: StudyPresenceManualCheckInInput,
  expectedMemberId: number,
  expectedBranchId: number,
) {
  const response = await apiRequest<StudyPresenceManagerSessionResponse>(
    `/api/study-presence/members/${targetMemberId}/manual-check-in`,
    {
      body: JSON.stringify(input),
      expectedMemberId,
      method: 'POST',
    },
  );

  assertManagerPresenceResponse(response, {
    active: true,
    branchId: expectedBranchId,
    memberId: targetMemberId,
  });

  if (response.checkInMethod !== 'MANAGER') {
    throw new ApiRequestError('수동 입실 방식이 아닌 응답을 받았습니다.', 409);
  }

  return response;
}

/** Manual checkout always closes the supplied active session at server time. */
export async function manualCheckOutStudyPresenceSession(
  sessionId: number,
  targetMemberId: number,
  expectedMemberId: number,
  expectedBranchId: number,
) {
  const response = await apiRequest<StudyPresenceManagerSessionResponse>(
    `/api/study-presence/sessions/${sessionId}/manual-check-out`,
    { expectedMemberId, method: 'POST' },
  );

  assertManagerPresenceResponse(response, {
    active: false,
    branchId: expectedBranchId,
    memberId: targetMemberId,
    sessionId,
  });

  return response;
}

function assertManagerPresenceResponse(
  response: StudyPresenceManagerSessionResponse,
  expected: {
    active: boolean;
    branchId: number;
    memberId: number;
    sessionId?: number;
  },
) {
  if (
    response.branchId !== expected.branchId ||
    response.memberId !== expected.memberId ||
    response.memberRole !== 'MEMBER' ||
    response.currentlyActive !== expected.active ||
    (expected.sessionId !== undefined &&
      response.sessionId !== expected.sessionId)
  ) {
    throw new ApiRequestError(
      '요청한 회원 또는 입퇴실 세션과 다른 응답을 받았습니다.',
      409,
    );
  }
}

export type StudyPresenceLiveResponse = {
  branchId: number;
  zoneId: string;
  asOf: string;
  memberCount: number;
  sessions: StudyPresenceManagerSessionResponse[];
};

export type StudyPresenceManagerHistoryResponse = {
  branchId: number;
  memberId: number | null;
  fromDate: string;
  toDate: string;
  zoneId: string;
  asOf: string;
  sessionCount: number;
  totalPresenceDuration: StudyPresenceDurationResponse;
  sessions: StudyPresenceManagerSessionResponse[];
};

/**
 * Every presence session that overlaps one Seoul calendar day in one branch.
 * The branch is sent explicitly: an ADMIN may read any branch, STAFF is
 * pinned to their own by the backend. This is intentionally different from
 * `live`: closed sessions remain in the response, so the attendance board can
 * show both the first check-in and the final check-out for the day.
 */
export async function fetchDailyStudyPresenceHistory(
  date: string,
  expectedMemberId: number,
  branchId: number,
) {
  const query = new URLSearchParams({ branchId: String(branchId), date });
  const response = await apiRequest<StudyPresenceManagerHistoryResponse>(
    `/api/study-presence/history?${query}`,
    { expectedMemberId },
  );

  if (
    response.branchId !== branchId ||
    response.memberId !== null ||
    response.fromDate !== date ||
    response.toDate !== date
  ) {
    throw new ApiRequestError(
      '요청한 지점 또는 날짜와 다른 입퇴실 기록을 받았습니다.',
      409,
    );
  }

  if (response.sessions.some((session) => session.branchId !== branchId)) {
    throw new ApiRequestError(
      '다른 지점의 입퇴실 기록이 포함되어 있습니다.',
      409,
    );
  }

  return response;
}

/**
 * Who is sitting in one branch at this moment. The branch is sent explicitly:
 * an ADMIN may read any branch, STAFF is pinned to their own by the backend.
 * Every row is validated against the branch that was asked for.
 */
export async function fetchLiveStudyPresence(
  expectedMemberId: number,
  branchId: number,
) {
  const query = new URLSearchParams({ branchId: String(branchId) });
  const response = await apiRequest<StudyPresenceLiveResponse>(
    `/api/study-presence/live?${query}`,
    { expectedMemberId },
  );

  if (response.branchId !== branchId) {
    throw new ApiRequestError(
      '다른 지점의 실시간 입실 정보를 받았습니다.',
      409,
    );
  }

  if (response.sessions.some((session) => session.branchId !== branchId)) {
    throw new ApiRequestError(
      '다른 지점의 실시간 입실 정보가 포함되어 있습니다.',
      409,
    );
  }

  return response;
}
