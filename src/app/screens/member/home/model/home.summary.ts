import type { BeverageItemResponse } from '../../../../features/beverages/beverages-api';
import type { MemberLeavePlanResponse } from '../../../../features/leaves/leaves-api';
import type { StudyTimeReportResponse } from '../../../../features/study-time/study-time-api';

/** Display the server report verbatim; dayBlocks omit the four short breaks. */
export function getHomeStudySummary(
  report: StudyTimeReportResponse | undefined,
) {
  return {
    asOf: report?.asOf ?? null,
    recognizedSeconds:
      report?.totals.totalRecognizedStudyDuration.totalSeconds ?? null,
    recognizedPeriodSeconds:
      report?.totals.recognizedPeriodDuration.totalSeconds ?? null,
    recognizedBreakSeconds:
      report?.totals.recognizedBreakDuration.totalSeconds ?? null,
  };
}

export type HomeBeverageSummary = {
  errorMessage: string | null;
  items: readonly BeverageItemResponse[];
  loading: boolean;
};

export type HomeLeaveSummary = {
  errorMessage: string | null;
  loading: boolean;
  upcoming: MemberLeavePlanResponse | null;
};

export function getHomeBeverageLabel({
  errorMessage,
  items,
  loading,
}: HomeBeverageSummary) {
  if (loading) return '불러오는 중';
  if (errorMessage !== null) return '확인 필요';

  const names = items.map((item) => item.name.trim()).filter(Boolean);
  return names.length > 0 ? names.join(' · ') : '등록한 음료 없음';
}

export function getHomeLeaveLabel({
  errorMessage,
  loading,
  upcoming,
}: HomeLeaveSummary) {
  if (loading) return '불러오는 중';
  if (errorMessage !== null) return '확인 필요';
  if (upcoming === null) return '예정된 휴무 없음';

  const [, month, day] = upcoming.leaveDate.split('-');
  return `${Number(month)}/${Number(day)} ${upcoming.label}`;
}
