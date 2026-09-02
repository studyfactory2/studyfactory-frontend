import { apiRequest, ApiRequestError } from '../../core/api/api-client';

export type StudyTimeDurationResponse = {
  totalSeconds: number;
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
};

/** Mirrors the backend StudyPeriod enum (7 periods, 09:00 – 22:00). */
export type StudyPeriodName =
  'FIRST' | 'SECOND' | 'THIRD' | 'FOURTH' | 'FIFTH' | 'SIXTH' | 'SEVENTH';

/** Mirrors the backend StudyBreak enum (the six gaps between periods). */
export type StudyTimeBreakName =
  | 'AFTER_FIRST'
  | 'LUNCH'
  | 'AFTER_THIRD'
  | 'AFTER_FOURTH'
  | 'DINNER'
  | 'AFTER_SIXTH';

export type StudyTimePeriodReportResponse = {
  period: StudyPeriodName;
  periodNumber: number;
  weeklyPlanIndex: number;
  /** LocalTime, serialized as HH:mm or HH:mm:ss. */
  startsAt: string;
  endsAt: string;
  excludedByLeave: boolean;
  recognizedDuration: StudyTimeDurationResponse;
};

export type StudyTimeBreakReportResponse = {
  studyBreak: StudyTimeBreakName;
  startsAt: string;
  endsAt: string;
  excludedByLeave: boolean;
  recognizedDuration: StudyTimeDurationResponse;
};

export type StudyTimeReportTotalsResponse = {
  presenceDuration: StudyTimeDurationResponse;
  recognizedPeriodDuration: StudyTimeDurationResponse;
  recognizedBreakDuration: StudyTimeDurationResponse;
  totalRecognizedStudyDuration: StudyTimeDurationResponse;
};

export type StudyTimeDailyReportResponse = {
  studyDate: string;
  excludedPeriods: StudyPeriodName[];
  presenceDuration: StudyTimeDurationResponse;
  recognizedPeriodDuration: StudyTimeDurationResponse;
  recognizedBreakDuration: StudyTimeDurationResponse;
  totalRecognizedStudyDuration: StudyTimeDurationResponse;
  periods: StudyTimePeriodReportResponse[];
  breaks: StudyTimeBreakReportResponse[];
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
