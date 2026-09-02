import { CalendarClock, CalendarOff, Coffee } from 'lucide-react';
import { Badge } from '../../../../shared/ui';
import { formatKoreanDate } from '../model/study.dates';
import { formatDurationClock, formatTimeSpan } from '../model/study.format';
import { getBreakLabel, getPeriodLabel } from '../model/study.labels';
import type { StudyDayRow } from '../model/study.types';
import { StudySectionEmpty } from './StudySectionState';
import '../styles/StudyDayDetail.css';

export type StudyDayDetailProps = {
  row: StudyDayRow | null;
};

export function StudyDayDetail({ row }: StudyDayDetailProps) {
  if (row === null) {
    return (
      <StudySectionEmpty title="날짜를 선택해 주세요">
        <p>기록에서 날짜를 고르면 교시별 인정 시간을 볼 수 있어요.</p>
      </StudySectionEmpty>
    );
  }

  const dateLabel = (
    <p className="member-study__detail-date">{formatKoreanDate(row.dateKey)}</p>
  );

  /*
   * The report always returns all seven periods, so `periods.length` says
   * nothing about whether a day happened. The day's own status does.
   */
  if (row.status === 'future') {
    return (
      <div className="member-study__detail">
        {dateLabel}
        <StudySectionEmpty title="아직 오지 않은 날짜예요">
          <p>
            <CalendarClock aria-hidden="true" size={14} />
            입실하면 그날의 교시별 인정 시간이 여기에 표시돼요.
          </p>
        </StudySectionEmpty>
      </div>
    );
  }

  if (row.status === 'none') {
    return (
      <div className="member-study__detail">
        {dateLabel}
        <StudySectionEmpty title="이 날은 입실 기록이 없어요">
          <p>
            {row.excludedPeriodCount > 0
              ? `휴가로 ${row.excludedPeriodCount}개 교시가 인정 대상에서 제외된 날이에요.`
              : '입실 기록이 있는 날에는 교시별 인정 시간이 표시돼요.'}
          </p>
        </StudySectionEmpty>
      </div>
    );
  }

  const studiedBreaks = row.breaks.filter(
    (studyBreak) => studyBreak.recognizedDuration.totalSeconds > 0,
  );

  return (
    <div className="member-study__detail">
      {dateLabel}

      <dl className="member-study__detail-totals">
        <div>
          <dt>정규</dt>
          <dd>{formatDurationClock(row.periodSeconds)}</dd>
        </div>
        <div>
          <dt>휴식</dt>
          <dd>{formatDurationClock(row.breakSeconds)}</dd>
        </div>
        <div className="is-total">
          <dt>총 인정</dt>
          <dd>{formatDurationClock(row.totalSeconds)}</dd>
        </div>
      </dl>

      <ol className="member-study__detail-periods">
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
              <span className="member-study__detail-period-value">
                {formatDurationClock(period.recognizedDuration.totalSeconds)}
              </span>
            )}
          </li>
        ))}
      </ol>

      <section className="member-study__detail-breaks">
        <h4>
          <Coffee aria-hidden="true" size={14} />
          휴식 시간 공부
        </h4>
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
      </section>
    </div>
  );
}
