import { RotateCcw } from 'lucide-react';
import {
  BarSeries,
  Dial,
  Instrument,
  Spinner,
  type BarSeriesPoint,
} from '../../../../shared/ui';
import { formatDurationClock } from '../../../../shared/lib/duration';
import '../styles/MoreMonthPanel.css';

export type MoreMonthPanelProps = {
  attendedDayCount: number;
  elapsedDayCount: number;
  errorMessage: string | null;
  loading: boolean;
  monthLabel: string;
  onRetry: () => void;
  studySeconds: number;
  weekPoints: readonly BarSeriesPoint[];
};

/**
 * The dial shows attendance against the days of the month that have actually
 * happened. There is no monthly study target in the system, so inventing one
 * to fill the ring would be showing the member a number nobody agreed to.
 */
export function MoreMonthPanel({
  attendedDayCount,
  elapsedDayCount,
  errorMessage,
  loading,
  monthLabel,
  onRetry,
  studySeconds,
  weekPoints,
}: MoreMonthPanelProps) {
  if (loading) {
    return (
      <div className="member-more__month is-plain" role="status">
        <Spinner size="sm" />
        <span>이번 달 기록을 불러오는 중이에요.</span>
      </div>
    );
  }

  if (errorMessage !== null) {
    return (
      <div className="member-more__month is-plain is-error" role="alert">
        <RotateCcw aria-hidden="true" size={16} />
        <span>{errorMessage}</span>
        <button onClick={onRetry} type="button">
          다시 시도
        </button>
      </div>
    );
  }

  const rate = elapsedDayCount > 0 ? attendedDayCount / elapsedDayCount : 0;

  return (
    <Instrument
      className="member-more__month"
      label="이번 달 인정 학습"
      note={`${elapsedDayCount}일 중 ${attendedDayCount}일 출석`}
    >
      <div className="instrument__body">
        <Dial label={`${monthLabel} 출석률`} size={92} value={rate} />
        <div className="instrument__readout">
          <strong className="instrument__value">
            {formatDurationClock(studySeconds)}
          </strong>
          <span className="instrument__caption">
            {monthLabel} 1일부터 오늘까지 · 서울 기준
          </span>
        </div>
      </div>

      <div className="instrument__footer">
        <BarSeries caption="최근 7일 인정 학습 시간" points={weekPoints} />
      </div>
    </Instrument>
  );
}
