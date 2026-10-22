export type ReasonCalendarMode = 'select' | 'history';

export type ReasonCalendarState = {
  dates: string[];
  inspectedDate: string;
  mode: ReasonCalendarMode;
};

export function selectReasonCalendarDate(
  state: ReasonCalendarState,
  dateKey: string,
  joinDate: string | null,
  maxDates = 31,
): ReasonCalendarState {
  const nextState = { ...state, inspectedDate: dateKey };

  if (state.mode === 'history') return nextState;

  if (state.dates.includes(dateKey)) {
    return {
      ...nextState,
      dates: state.dates.filter((date) => date !== dateKey).sort(),
    };
  }

  if (
    (joinDate !== null && dateKey < joinDate) ||
    state.dates.length >= maxDates
  ) {
    return nextState;
  }

  return { ...nextState, dates: [...state.dates, dateKey].sort() };
}

export function shortLeaveCalendarLabel(label: string): string {
  if (label === '오전반차') return '오전';
  if (label === '오후반차') return '오후';
  return label;
}

export function leaveHistorySourceLabel(
  sourceType:
    'MEMBER_LEAVE' | 'SPECIAL_LEAVE' | 'FIXED_LEAVE' | null | undefined,
): string | null {
  if (sourceType === 'SPECIAL_LEAVE') return '관리자등록';
  if (sourceType === 'FIXED_LEAVE') return '개인일정';
  return null;
}
