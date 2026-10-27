import { useId } from 'react';
import {
  formatFullKoreanDate,
  getDayOfMonth,
  getWeekStartKey,
  listDateKeys,
  SEOUL_WEEKDAY_LABELS,
} from '../model/study.dates';
import { formatDurationClock, toPercentage } from '../model/study.format';
import type { StudyDayRow, StudyRangeKey } from '../model/study.types';
import '../styles/StudyDateSelector.css';

export type StudyDateSelectorProps = {
  maxDaySeconds: number;
  onSelectDate: (dateKey: string) => void;
  range: StudyRangeKey;
  rows: readonly StudyDayRow[];
  selectedDateKey: string;
};

const MONDAY_FIRST_LABELS = [
  ...SEOUL_WEEKDAY_LABELS.slice(1),
  SEOUL_WEEKDAY_LABELS[0],
];

function getDateDescription(row: StudyDayRow) {
  const status =
    row.status === 'future'
      ? '아직 오지 않은 날짜'
      : row.status === 'active'
        ? '입실 중'
        : row.status === 'done'
          ? '기록 완료'
          : '입실 기록 없음';

  return [
    formatFullKoreanDate(row.dateKey),
    row.isToday ? '오늘' : '',
    status,
    `총 인정 시간 ${formatDurationClock(row.totalSeconds)}`,
    `교시 학습 ${formatDurationClock(row.periodSeconds)}`,
    `휴식 시간 공부 ${formatDurationClock(row.breakSeconds)}`,
  ]
    .filter(Boolean)
    .join(', ');
}

export function StudyDateSelector({
  maxDaySeconds,
  onSelectDate,
  range,
  rows,
  selectedDateKey,
}: StudyDateSelectorProps) {
  const headingId = useId();
  const isMonth = range === 'month';
  const firstDateKey = rows[0]?.dateKey;
  const leadingDays =
    isMonth && firstDateKey
      ? listDateKeys(getWeekStartKey(firstDateKey), firstDateKey).slice(0, -1)
      : [];

  return (
    <div className="member-study__date-selector">
      <header className="member-study__date-selector-header">
        <h3 id={headingId}>날짜별 학습</h3>
        <span>{isMonth ? '날짜 선택' : '시:분'}</span>
      </header>

      {isMonth && (
        <div aria-hidden="true" className="member-study__month-weekdays">
          {MONDAY_FIRST_LABELS.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      )}

      <div
        aria-labelledby={headingId}
        className={[
          'member-study__dates',
          isMonth ? 'is-month' : 'is-week',
          maxDaySeconds <= 0 ? 'is-empty' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        role="group"
      >
        {leadingDays.map((dateKey) => (
          <span aria-hidden="true" key={dateKey} />
        ))}
        {rows.map((row) => {
          const selected = row.dateKey === selectedDateKey;
          const hasRecognizedTime =
            row.periodSeconds > 0 || row.breakSeconds > 0;

          return (
            <button
              aria-current={row.isToday ? 'date' : undefined}
              aria-label={getDateDescription(row)}
              aria-pressed={selected}
              className={[
                'member-study__date-button',
                selected ? 'is-selected' : '',
                row.isToday ? 'is-today' : '',
                row.status === 'future' ? 'is-future' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              key={row.dateKey}
              onClick={() => onSelectDate(row.dateKey)}
              type="button"
            >
              <span aria-hidden="true" className="member-study__date-label">
                {!isMonth && <small>{row.weekdayLabel}</small>}
                <strong>{getDayOfMonth(row.dateKey)}</strong>
              </span>

              <span aria-hidden="true" className="member-study__date-bars">
                {hasRecognizedTime ? (
                  <span className="member-study__date-stack">
                    <span
                      className="member-study__date-bar is-break"
                      style={{
                        height: `${toPercentage(row.breakSeconds, maxDaySeconds)}%`,
                      }}
                    />
                    <span
                      className="member-study__date-bar is-period"
                      style={{
                        height: `${toPercentage(row.periodSeconds, maxDaySeconds)}%`,
                      }}
                    />
                  </span>
                ) : (
                  <span className="member-study__date-baseline" />
                )}
              </span>

              {!isMonth && (
                <span aria-hidden="true" className="member-study__date-value">
                  {row.status === 'future'
                    ? '—'
                    : formatDurationClock(row.totalSeconds).slice(0, -3)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <ul aria-label="인정 시간 구성" className="member-study__date-legend">
        <li>
          <span aria-hidden="true" className="is-period" />
          교시 학습
        </li>
        <li>
          <span aria-hidden="true" className="is-break" />
          휴식 시간 공부
        </li>
      </ul>
    </div>
  );
}
