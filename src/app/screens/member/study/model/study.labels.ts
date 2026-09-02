import type {
  StudyTimeBreakName,
  StudyPeriodName,
} from '../../../../features/study-time/study-time-api';
import type { StudyRangeKey } from './study.types';

const BREAK_LABELS: Record<StudyTimeBreakName, string> = {
  AFTER_FIRST: '1교시 후 휴식',
  AFTER_FOURTH: '4교시 후 휴식',
  AFTER_SIXTH: '6교시 후 휴식',
  AFTER_THIRD: '3교시 후 휴식',
  DINNER: '저녁시간',
  LUNCH: '점심시간',
};

const PERIOD_NUMBERS: Record<StudyPeriodName, number> = {
  FIFTH: 5,
  FIRST: 1,
  FOURTH: 4,
  SECOND: 2,
  SEVENTH: 7,
  SIXTH: 6,
  THIRD: 3,
};

export const STUDY_RANGE_OPTIONS: readonly {
  key: StudyRangeKey;
  label: string;
}[] = [
  { key: 'today', label: '오늘' },
  { key: 'week', label: '주간' },
  { key: 'month', label: '월간' },
];

export function getPeriodLabel(periodNumber: number) {
  return `${periodNumber}교시`;
}

export function getPeriodLabelByName(period: StudyPeriodName) {
  return getPeriodLabel(PERIOD_NUMBERS[period]);
}

export function getBreakLabel(studyBreak: StudyTimeBreakName) {
  return BREAK_LABELS[studyBreak];
}

export function getRangeLabel(range: StudyRangeKey) {
  if (range === 'today') {
    return '오늘';
  }

  return range === 'week' ? '이번 주' : '이번 달';
}
