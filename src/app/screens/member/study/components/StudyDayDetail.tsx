import { CalendarClock, CalendarOff, ChevronDown, Coffee } from 'lucide-react';
import { Badge, SectionEmpty } from '../../../../shared/ui';
import { formatKoreanDate } from '../model/study.dates';
import { formatDurationClock, formatTimeSpan } from '../model/study.format';
import { getBreakLabel, getPeriodLabel } from '../model/study.labels';
import { getStudyDayStatusView } from '../model/study.status';
import type { StudyDayRow } from '../model/study.types';
import '../styles/StudyDayDetail.css';

export type StudyDayDetailProps = {
  row: StudyDayRow | null;
  showTotal?: boolean;
};

export function StudyDayDetail({ row, showTotal = true }: StudyDayDetailProps) {
  if (row === null) {
    return (
      <SectionEmpty title="날짜를 선택해 주세요">
        <p>기록에서 날짜를 고르면 교시별 인정 시간을 볼 수 있어요.</p>
      </SectionEmpty>
    );
  }

  const statusView = getStudyDayStatusView(row.status);
  const dateHeader = (
    <header
      aria-atomic="true"
      aria-live="polite"
      className="member-study__detail-head"
    >
      <h3 className="member-study__detail-date">
        <span>{formatKoreanDate(row.dateKey)}</span>
        {row.isToday && <small>오늘</small>}
      </h3>
      {row.status !== 'future' && (
        <Badge tone={statusView.tone}>
          {row.status === 'active'
            ? '입실 중'
            : row.status === 'done'
              ? '기록 완료'
              : statusView.label}
        </Badge>
      )}
    </header>
  );

  /*
   * The report always returns all seven periods, so `periods.length` says
   * nothing about whether a day happened. The day's own status does.
   */
  if (row.status === 'future') {
    return (
      <div className="member-study__detail">
        {dateHeader}
        <SectionEmpty title="아직 오지 않은 날짜예요">
          <p>
            <CalendarClock aria-hidden="true" size={14} />
            입실하면 그날의 교시별 인정 시간이 여기에 표시돼요.
          </p>
        </SectionEmpty>
      </div>
    );
  }

  if (row.status === 'none') {
    return (
      <div className="member-study__detail">
        {dateHeader}
        <SectionEmpty title="이 날은 입실 기록이 없어요">
          <p>
            {row.excludedPeriodCount > 0
              ? `휴가로 ${row.excludedPeriodCount}개 교시가 인정 대상에서 제외된 날이에요.`
              : '입실 기록이 있는 날에는 교시별 인정 시간이 표시돼요.'}
          </p>
        </SectionEmpty>
      </div>
    );
  }

  const studiedBreaks = row.breaks.filter(
    (studyBreak) => studyBreak.recognizedDuration.totalSeconds > 0,
  );

  return (
    <div className="member-study__detail">
      {dateHeader}

      <div className="member-study__detail-presence">
        <span>
          {row.presenceStartLabel ?? '—'} 입실 ·{' '}
          {row.status === 'active'
            ? '진행 중'
            : `${row.presenceEndLabel ?? '—'} 퇴실`}
        </span>
        <span>입실 {row.sessionCount}회</span>
      </div>

      {showTotal && (
        <dl className="member-study__detail-total">
          <dt>이 날의 인정 학습 시간</dt>
          <dd>{formatDurationClock(row.totalSeconds)}</dd>
        </dl>
      )}

      <div className="member-study__detail-period-caption">
        <span>교시별 인정 시간</span>
        <span>시:분:초</span>
      </div>
      <ol
        aria-label="교시별 인정 시간"
        className="member-study__detail-periods"
      >
        {row.periods.map((period) => (
          <li
            className={period.excludedByLeave ? 'is-excluded' : ''}
            key={period.period}
          >
            <span className="member-study__detail-period-name">
              <strong>{getPeriodLabel(period.periodNumber)}</strong>
              <small>{formatTimeSpan(period.startsAt, period.endsAt)}</small>
            </span>
            {period.excludedByLeave ? (
              <Badge tone="special">
                <CalendarOff aria-hidden="true" size={12} />
                휴가 제외
              </Badge>
            ) : (
              <span
                className={[
                  'member-study__detail-period-value',
                  period.recognizedDuration.totalSeconds === 0 ? 'is-zero' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {formatDurationClock(period.recognizedDuration.totalSeconds)}
              </span>
            )}
          </li>
        ))}
      </ol>

      <details className="member-study__detail-breaks">
        <summary>
          <Coffee aria-hidden="true" size={14} />
          <span>휴식 시간 공부</span>
          <strong>{formatDurationClock(row.breakSeconds)}</strong>
          <ChevronDown
            aria-hidden="true"
            className="member-study__detail-breaks-chevron"
            size={14}
          />
        </summary>
        {studiedBreaks.length === 0 ? (
          <p className="member-study__detail-breaks-empty">
            휴식 시간에 기록된 공부가 없어요.
          </p>
        ) : (
          <ul>
            {studiedBreaks.map((studyBreak) => (
              <li key={studyBreak.studyBreak}>
                <span className="member-study__detail-period-name">
                  <strong>{getBreakLabel(studyBreak.studyBreak)}</strong>
                  <small>
                    {formatTimeSpan(studyBreak.startsAt, studyBreak.endsAt)}
                  </small>
                </span>
                <span className="member-study__detail-period-value">
                  {formatDurationClock(
                    studyBreak.recognizedDuration.totalSeconds,
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </details>
    </div>
  );
}
