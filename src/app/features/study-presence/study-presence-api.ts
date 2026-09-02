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
