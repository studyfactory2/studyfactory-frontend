import { Badge } from '../../../../shared/ui';
import { formatKoreanDate } from '../model/study.dates';
import { formatDurationClock } from '../model/study.format';
import { getStudyDayStatusView } from '../model/study.status';
import type { StudyDayRow } from '../model/study.types';
import '../styles/StudyRecords.css';

export type StudyRecordListProps = {
  onSelectDate: (dateKey: string) => void;
  rows: readonly StudyDayRow[];
  selectedDateKey: string;
};

export function StudyRecordList({
  onSelectDate,
  rows,
  selectedDateKey,
}: StudyRecordListProps) {
  return (
    <ol className="member-study__list">
      {rows.map((row) => {
        const view = getStudyDayStatusView(row.status);
        const recorded = row.status === 'active' || row.status === 'done';
        const checkedIn = row.presenceStartLabel;
        const checkedOut = row.presenceEndLabel;

        return (
          <li key={row.dateKey}>
            <button
              aria-label={`${formatKoreanDate(row.dateKey)} ${view.label}`}
              aria-pressed={row.dateKey === selectedDateKey}
              className={[
                'member-study__list-card',
                row.dateKey === selectedDateKey ? 'is-selected' : '',
                row.isToday ? 'is-today' : '',
                row.status === 'future' ? 'is-future' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onSelectDate(row.dateKey)}
              type="button"
            >
              <span className="member-study__list-day">
                <strong>{row.weekdayLabel}</strong>
                {row.isToday && <small>오늘</small>}
              </span>

              <span className="member-study__list-body">
                <span className="member-study__list-head">
                  {row.status === 'future' ? (
                    <span className="member-study__list-dash">—</span>
                  ) : (
                    <Badge tone={view.tone}>{view.label}</Badge>
                  )}
                  {row.status !== 'future' && (
                    <em>
                      {recorded && checkedIn
                        ? `${checkedIn} – ${row.status === 'active' ? '진행 중' : (checkedOut ?? '—')}`
                        : '입퇴실 기록 없음'}
                    </em>
                  )}
                </span>
                {recorded && (
                  <span className="member-study__list-split">
                    정규 {formatDurationClock(row.periodSeconds)} · 휴식{' '}
                    {formatDurationClock(row.breakSeconds)}
                  </span>
                )}
              </span>

              <span className="member-study__list-total">
                {recorded ? formatDurationClock(row.totalSeconds) : '—'}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
