import { apiRequest, ApiRequestError } from '../../core/api/api-client';

export type StudyBreakName =
  | 'AFTER_FIRST'
  | 'LUNCH'
  | 'AFTER_THIRD'
  | 'AFTER_FOURTH'
  | 'DINNER'
  | 'AFTER_SIXTH';

export type StudyBreakStartBlockReason =
  'NOT_CHECKED_IN' | 'OUTSIDE_BREAK' | 'ALREADY_ACTIVE';

export type StudyBreakWindowResponse = {
  studyBreak: StudyBreakName;
  startsAt: string;
  endsAt: string;
};

export type StudyBreakDurationResponse = {
  totalSeconds: number;
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
};

export type StudyBreakSessionResponse = {
  sessionId: number;
  presenceSessionId: number;
  branchId: number;
  studyDate: string;
  studyBreak: StudyBreakName;
  windowStartedAt: string;
  windowEndedAt: string;
  startedAt: string;
  endedAt: string | null;
  endReason: 'BREAK_ENDED' | 'MEMBER_STOP' | 'PRESENCE_ENDED' | null;
  active: boolean;
  elapsedDuration: StudyBreakDurationResponse;
};

export type StudyBreakStatusResponse = {
  zoneId: string;
  asOf: string;
  studyDate: string;
  checkedIn: boolean;
  currentBreak: StudyBreakWindowResponse | null;
  active: boolean;
  session: StudyBreakSessionResponse | null;
  canStart: boolean;
  canStop: boolean;
  startBlockReason: StudyBreakStartBlockReason | null;
};

export type StudyBreakCommandResponse = {
  changed: boolean;
  status: StudyBreakStatusResponse;
};

export function fetchMyStudyBreakStatus(expectedMemberId: number) {
  return apiRequest<StudyBreakStatusResponse>('/api/study-breaks/me/status', {
    expectedMemberId,
  });
}

export async function startMyBreakStudy(
  expectedMemberId: number,
  expectedBranchId: number,
) {
  return submitBreakCommand('start', expectedMemberId, expectedBranchId);
}

export async function stopMyBreakStudy(
  expectedMemberId: number,
  expectedBranchId: number,
) {
  return submitBreakCommand('stop', expectedMemberId, expectedBranchId);
}

async function submitBreakCommand(
  action: 'start' | 'stop',
  expectedMemberId: number,
  expectedBranchId: number,
) {
  const response = await apiRequest<StudyBreakCommandResponse>(
    `/api/study-breaks/me/${action}`,
    {
      expectedMemberId,
      method: 'POST',
    },
  );
  const responseBranchId = response.status.session?.branchId ?? null;

  if (responseBranchId !== null && responseBranchId !== expectedBranchId) {
    throw new ApiRequestError('다른 지점의 휴식시간 응답을 받았습니다.', 409);
  }

  return response;
}
