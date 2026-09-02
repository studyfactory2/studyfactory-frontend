import type { StudyDayStatus } from './study.types';

export type StudyDayStatusView = {
  label: string;
  status: StudyDayStatus;
  tone: 'neutral' | 'positive' | 'special';
};

export function getStudyDayStatus({
  dateKey,
  hasActiveSession,
  sessionCount,
  todayKey,
}: {
  dateKey: string;
  hasActiveSession: boolean;
  sessionCount: number;
  todayKey: string;
}): StudyDayStatus {
  if (dateKey > todayKey) {
    return 'future';
  }

  if (hasActiveSession) {
    return 'active';
  }

  return sessionCount > 0 ? 'done' : 'none';
}

export function getStudyDayStatusView(
  status: StudyDayStatus,
): StudyDayStatusView {
  if (status === 'active') {
    return { label: '진행 중', status, tone: 'special' };
  }

  if (status === 'done') {
    return { label: '완료', status, tone: 'positive' };
  }

  if (status === 'none') {
    return { label: '기록 없음', status, tone: 'neutral' };
  }

  return { label: '—', status, tone: 'neutral' };
}
