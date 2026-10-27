import { formatDurationClock } from '../model/study.format';
import '../styles/StudySummary.css';

export type StudySummaryProps = {
  attendedDayCount: number;
  averageSecondsPerAttendedDay: number;
};

export function StudySummary({
  attendedDayCount,
  averageSecondsPerAttendedDay,
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
        </dd>
      </div>
    </dl>
  );
}
