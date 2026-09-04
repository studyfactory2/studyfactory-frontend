import { Radio } from 'lucide-react';
import { SectionError, SectionLoading } from '../../../../shared/ui';
import {
  formatDurationClock,
  formatDurationKorean,
  toPercentage,
} from '../model/study.format';
import { formatKoreanDate, formatShortDate } from '../model/study.dates';
import type { StudyDayRow, StudyRangeKey } from '../model/study.types';
import '../styles/StudyHero.css';

export type StudyHeroProps = {
  breakSeconds: number;
  dateRangeLabel: string;
  errorMessage: string | null;
  isLive: boolean;
  loading: boolean;
  onRetry: () => void;
  onSelectDate: (dateKey: string) => void;
  periodSeconds: number;
  range: StudyRangeKey;
  rangeLabel: string;
  rows: readonly StudyDayRow[];
  maxDaySeconds: number;
  selectedDateKey: string;
  totalSeconds: number;
};

export function StudyHero({
  breakSeconds,
  dateRangeLabel,
  errorMessage,
  isLive,
  loading,
  maxDaySeconds,
  onRetry,
  onSelectDate,
  periodSeconds,
  range,
  rangeLabel,
  rows,
  selectedDateKey,
  totalSeconds,
}: StudyHeroProps) {
  const periodShare = toPercentage(periodSeconds, totalSeconds);
  const breakShare = toPercentage(breakSeconds, totalSeconds);

  return (
    <section
      aria-labelledby="member-study-hero-title"
      className="member-study__hero"
    >
      <header className="member-study__hero-head">
        <div>
          <p className="member-study__hero-eyebrow">{rangeLabel} 누적</p>
          <h2 className="member-study__hero-title" id="member-study-hero-title">
            총 인정 학습 시간
          </h2>
        </div>
        {isLive && (
          <span className="member-study__hero-live">
            <Radio aria-hidden="true" size={13} />
            입실 중
          </span>
        )}
      </header>

      {loading ? (
        <SectionLoading label="학습 시간을 불러오는 중이에요." />
      ) : errorMessage !== null ? (
        <SectionError message={errorMessage} onRetry={onRetry} />
      ) : (
        <>
          <p className="member-study__hero-total">
            <strong>{formatDurationClock(totalSeconds)}</strong>
            <span>{dateRangeLabel}</span>
          </p>

          <div className="member-study__hero-composition">
            <div
              aria-hidden="true"
              className="member-study__hero-bar"
              data-empty={totalSeconds === 0 ? 'true' : undefined}
            >
              <span
                className="member-study__hero-bar-period"
                style={{ width: `${periodShare}%` }}
              />
              <span
                className="member-study__hero-bar-break"
                style={{ width: `${breakShare}%` }}
              />
            </div>
            <dl className="member-study__hero-legend">
              <div className="is-period">
                <dt>정규 공부</dt>
                <dd>{formatDurationClock(periodSeconds)}</dd>
              </div>
              <div className="is-break">
                <dt>휴식 공부</dt>
                <dd>{formatDurationClock(breakSeconds)}</dd>
              </div>
            </dl>
          </div>

          {range !== 'today' && (
            <ol
              aria-label="일별 인정 학습 시간"
              className={`member-study__hero-days is-${range}`}
            >
              {rows.map((row) => (
                <li key={row.dateKey}>
                  <button
                    aria-label={`${formatKoreanDate(row.dateKey)} 인정 ${formatDurationKorean(row.totalSeconds)}`}
                    aria-pressed={row.dateKey === selectedDateKey}
                    className={buildDayClassName(row, selectedDateKey)}
                    onClick={() => onSelectDate(row.dateKey)}
                    type="button"
                  >
                    <span className="member-study__hero-day-track">
                      {row.totalSeconds > 0 && (
                        <span
                          className="member-study__hero-day-fill"
                          style={{
                            height: `${toPercentage(row.totalSeconds, maxDaySeconds)}%`,
                          }}
                        />
                      )}
                    </span>
                    <span className="member-study__hero-day-label">
                      {range === 'week'
                        ? row.weekdayLabel
                        : formatShortDate(row.dateKey).split('.')[1]}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </section>
  );
}

function buildDayClassName(row: StudyDayRow, selectedDateKey: string) {
  return [
    'member-study__hero-day',
    row.dateKey === selectedDateKey ? 'is-selected' : '',
    row.isToday ? 'is-today' : '',
    row.status === 'active' ? 'is-active' : '',
  ]
    .filter(Boolean)
    .join(' ');
}
