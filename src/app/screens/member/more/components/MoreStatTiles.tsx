import { Sparkline } from '../../../../shared/ui';
import { formatDurationClock } from '../../../../shared/lib/duration';
import type { BarSeriesPoint } from '../../../../shared/ui';
import '../styles/MoreStatTiles.css';

export type MoreStatTilesProps = {
  attendedDayCount: number;
  averageSeconds: number;
  elapsedDayCount: number;
  hidden: boolean;
  requestedLeaveCount: number;
  weekPoints: readonly BarSeriesPoint[];
};

/** Hidden rather than skeletoned: the month panel above already says it is loading. */
export function MoreStatTiles({
  attendedDayCount,
  averageSeconds,
  elapsedDayCount,
  hidden,
  requestedLeaveCount,
  weekPoints,
}: MoreStatTilesProps) {
  if (hidden) {
    return null;
  }

  return (
    <dl className="member-more__tiles">
      <div className="member-more__tile-stat">
        <dt>출석 일수</dt>
        <dd>
          {attendedDayCount}
          <i> / {elapsedDayCount}일</i>
        </dd>
        <Sparkline
          caption="최근 7일 학습 추이"
          values={weekPoints.map((point) => point.value)}
        />
      </div>
      <div className="member-more__tile-stat">
        <dt>신청한 휴무</dt>
        <dd>
          {requestedLeaveCount}
          <i> 일</i>
        </dd>
      </div>
      <div className="member-more__tile-stat">
        <dt>출석일 평균</dt>
        <dd>{formatDurationClock(averageSeconds)}</dd>
      </div>
    </dl>
  );
}
