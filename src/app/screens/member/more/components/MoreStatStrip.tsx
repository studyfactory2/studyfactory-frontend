import { RotateCcw } from 'lucide-react';
import { formatDurationKorean } from '../../../../shared/lib/duration';
import { Spinner } from '../../../../shared/ui';
import '../styles/MoreStatStrip.css';

export type MoreStatStripProps = {
  attendedDayCount: number;
  errorMessage: string | null;
  requestedLeaveCount: number;
  loading: boolean;
  monthLabel: string;
  onRetry: () => void;
  studySeconds: number;
};

export function MoreStatStrip({
  attendedDayCount,
  errorMessage,
  requestedLeaveCount,
  loading,
  monthLabel,
  onRetry,
  studySeconds,
}: MoreStatStripProps) {
  if (loading) {
    return (
      <section className="member-more__stats is-plain" role="status">
        <Spinner size="sm" />
        <span>이번 달 기록을 불러오는 중이에요.</span>
      </section>
    );
  }

  if (errorMessage !== null) {
    return (
      <section className="member-more__stats is-plain is-error" role="alert">
        <RotateCcw aria-hidden="true" size={16} />
        <span>{errorMessage}</span>
        <button onClick={onRetry} type="button">
          다시 시도
        </button>
      </section>
    );
  }

  return (
    <dl aria-label={`${monthLabel} 요약`} className="member-more__stats">
      <div>
        <dt>이번 달 공부 시간</dt>
        <dd>{formatDurationKorean(studySeconds)}</dd>
      </div>
      <div>
        <dt>출석 일수</dt>
        <dd>
          {attendedDayCount}
          <small>일</small>
        </dd>
      </div>
      <div>
        <dt>이번 달 신청 휴무</dt>
        <dd>
          {requestedLeaveCount}
          <small>일</small>
        </dd>
      </div>
    </dl>
  );
}
