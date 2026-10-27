import { Radio } from 'lucide-react';
import { SectionError, SectionLoading } from '../../../../shared/ui';
import { formatDurationClock } from '../model/study.format';
import '../styles/StudyHero.css';

export type StudyHeroProps = {
  breakSeconds: number;
  errorMessage: string | null;
  isLive: boolean;
  loading: boolean;
  onRetry: () => void;
  periodSeconds: number;
  rangeLabel: string;
  totalSeconds: number;
};

export function StudyHero({
  breakSeconds,
  errorMessage,
  isLive,
  loading,
  onRetry,
  periodSeconds,
  rangeLabel,
  totalSeconds,
}: StudyHeroProps) {
  return (
    <section
      aria-labelledby="member-study-hero-title"
      className="member-study__hero"
    >
      <header className="member-study__hero-head">
        <h2 className="member-study__hero-title" id="member-study-hero-title">
          {rangeLabel} 인정 학습 시간
        </h2>
        {isLive && (
          <span className="member-study__hero-live">
            <Radio aria-hidden="true" size={12} />
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
          </p>

          <dl className="member-study__hero-breakdown">
            <div>
              <dt>교시 학습</dt>
              <dd>{formatDurationClock(periodSeconds)}</dd>
            </div>
            <div>
              <dt>휴식 시간 공부</dt>
              <dd>{formatDurationClock(breakSeconds)}</dd>
            </div>
          </dl>
        </>
      )}
    </section>
  );
}
