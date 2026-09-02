import {
  formatDurationClock,
  formatDurationKorean,
} from '../model/study.format';
import '../styles/StudySummary.css';

export type StudySummaryProps = {
  attendedDayCount: number;
  averageSecondsPerAttendedDay: number;
  breakSeconds: number;
  periodSeconds: number;
};

export function StudySummary({
  attendedDayCount,
  averageSecondsPerAttendedDay,
  breakSeconds,
  periodSeconds,
}: StudySummaryProps) {
  return (
    <dl className="member-study__summary">
      <div>
        <dt>출석 일수</dt>
        <dd>
          <strong>{attendedDayCount}</strong>
          <span>일</span>
        </dd>
      </div>
      <div>
        <dt>출석일 평균</dt>
        <dd>
          <strong>{formatDurationClock(averageSecondsPerAttendedDay)}</strong>
          <span>{formatDurationKorean(averageSecondsPerAttendedDay)}</span>
        </dd>
      </div>
      <div className="is-period">
        <dt>정규 공부</dt>
        <dd>
          <strong>{formatDurationClock(periodSeconds)}</strong>
          <span>교시 시간 내</span>
        </dd>
      </div>
      <div className="is-break">
        <dt>휴식 공부</dt>
        <dd>
          <strong>{formatDurationClock(breakSeconds)}</strong>
          <span>휴식 시간 내</span>
        </dd>
      </div>
    </dl>
  );
}
