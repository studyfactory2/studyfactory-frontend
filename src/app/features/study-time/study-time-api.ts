import { apiRequest, ApiRequestError } from '../../core/api/api-client';

export type StudyTimeDurationResponse = {
  totalSeconds: number;
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
};

export type StudyTimeReportTotalsResponse = {
  presenceDuration: StudyTimeDurationResponse;
  recognizedPeriodDuration: StudyTimeDurationResponse;
  recognizedBreakDuration: StudyTimeDurationResponse;
  totalRecognizedStudyDuration: StudyTimeDurationResponse;
};

export type StudyTimeDailyReportResponse = {
  studyDate: string;
  presenceDuration: StudyTimeDurationResponse;
  recognizedPeriodDuration: StudyTimeDurationResponse;
  recognizedBreakDuration: StudyTimeDurationResponse;
  totalRecognizedStudyDuration: StudyTimeDurationResponse;
};

export type StudyTimeReportResponse = {
  memberId: number;
  branchId: number;
  zoneId: string;
  fromDate: string;
  toDate: string;
  asOf: string;
  attendedDayCount: number;
  totals: StudyTimeReportTotalsResponse;
  days: StudyTimeDailyReportResponse[];
};

export async function fetchMyStudyTimeReport(
  from: string,
  to: string,
  expectedMemberId: number,
) {
  const query = new URLSearchParams({ from, to });
  const response = await apiRequest<StudyTimeReportResponse>(
    `/api/study-time/me/report?${query}`,
    { expectedMemberId },
  );

  if (
    response.memberId !== expectedMemberId ||
    response.fromDate !== from ||
    response.toDate !== to
  ) {
    throw new ApiRequestError(
      '요청한 회원 또는 기간과 다른 학습 시간 응답을 받았습니다.',
      409,
    );
  }

  return response;
}
