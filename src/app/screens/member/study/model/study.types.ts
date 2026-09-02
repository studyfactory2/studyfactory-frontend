import type {
  StudyTimeBreakReportResponse,
  StudyTimeDailyReportResponse,
  StudyTimePeriodReportResponse,
} from '../../../../features/study-time/study-time-api';

export type StudyRangeKey = 'today' | 'week' | 'month';

export type StudyDateRange = {
  from: string;
  to: string;
};

/**
 * Real state only — a future date is simply "not yet", never "reserved" or
 * "scheduled", because the backend has no reservation concept.
 */
export type StudyDayStatus = 'active' | 'done' | 'future' | 'none';

export type StudyDayRow = {
  breakSeconds: number;
  breaks: StudyTimeBreakReportResponse[];
  dateKey: string;
  excludedPeriodCount: number;
  isToday: boolean;
  periodSeconds: number;
  periods: StudyTimePeriodReportResponse[];
  /**
   * Presence clamped to this Seoul calendar day. A session crossing midnight
   * contributes a fragment to every day it touches, so these are the day's
   * earliest effective start and latest effective end — not the raw check-in
   * and check-out of any single session.
   */
  presenceEndLabel: string | null;
  presenceSeconds: number;
  presenceStartLabel: string | null;
  report: StudyTimeDailyReportResponse | null;
  sessionCount: number;
  status: StudyDayStatus;
  totalSeconds: number;
  weekdayLabel: string;
};
