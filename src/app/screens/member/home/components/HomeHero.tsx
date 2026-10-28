import { ChevronDown, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { memberRoutes } from '../../../../core/router/routes';
import { Dial } from '../../../../shared/ui';
import { formatTimeOfDay } from '../model/home.dates';
import {
  formatDurationClock,
  formatDurationKorean,
} from '../model/home.format';
import { HomeDayTimeline, type HomeDayBlock } from './HomeDayTimeline';
import { HomeSectionError, HomeSectionLoading } from './HomeSectionState';
import '../styles/HomeHero.css';

export type HomeHeroProps = {
  asOf: string | null;
  dayBlocks: readonly HomeDayBlock[];
  memberName: string;
  onStudyTimeRetry: () => void;
  recognizedSeconds: number | null;
  recognizedPeriodSeconds: number | null;
  recognizedBreakSeconds: number | null;
  studyTimeError: string | null;
  studyTimeLoading: boolean;
};

export function HomeHero({
  asOf,
  dayBlocks,
  memberName,
  onStudyTimeRetry,
  recognizedSeconds,
  recognizedPeriodSeconds,
  recognizedBreakSeconds,
  studyTimeError,
  studyTimeLoading,
}: HomeHeroProps) {
  const reportTime = asOf ? formatTimeOfDay(asOf) : null;

  const availableSeconds = dayBlocks
    .filter((block) => !block.isBreak && !block.excludedByLeave)
    .reduce((total, block) => total + block.availableSeconds, 0);
  const earnedRatio =
    availableSeconds > 0 ? (recognizedSeconds ?? 0) / availableSeconds : 0;
  const dialCaption =
    earnedRatio > 1 ? '100%+' : `${Math.round(earnedRatio * 100)}%`;

  return (
    <section
      aria-labelledby="member-home-hero-title"
      className="instrument member-home__hero"
    >
      <header className="member-home__hero-head">
        <h2 className="member-home__hero-title" id="member-home-hero-title">
          <span className="member-home__sr-only">{memberName}님의 </span>
          <span className="member-home__hero-title-desktop">
            오늘 인정 학습 시간
          </span>
          <span className="member-home__hero-title-mobile">오늘 학습시간</span>
        </h2>
        {!studyTimeLoading && studyTimeError === null && reportTime && (
          <span className="member-home__hero-as-of">{reportTime} 기준</span>
        )}
      </header>

      {studyTimeLoading ? (
        <HomeSectionLoading label="학습 시간을 불러오는 중이에요." />
      ) : studyTimeError !== null ? (
        <HomeSectionError message={studyTimeError} onRetry={onStudyTimeRetry} />
      ) : (
        <>
          <div className="member-home__hero-readout">
            <strong>{formatDurationKorean(recognizedSeconds ?? 0)}</strong>
          </div>
          <dl className="member-home__hero-breakdown">
            <div>
              <dt>교시</dt>
              <dd>{formatDurationKorean(recognizedPeriodSeconds ?? 0)}</dd>
            </div>
            <div>
              <dt>휴식 학습</dt>
              <dd>{formatDurationKorean(recognizedBreakSeconds ?? 0)}</dd>
            </div>
          </dl>
        </>
      )}
      <div className="member-home__hero-navigation">
        {!studyTimeLoading && studyTimeError === null && (
          <details className="member-home__hero-details">
            <summary>
              학습 기록 자세히 <ChevronDown aria-hidden="true" size={14} />
            </summary>
            <div className="member-home__hero-detail-content">
              <div className="member-home__hero-figure">
                <Dial
                  caption={dialCaption}
                  label="오늘 인정 학습 진행률"
                  size={72}
                  value={earnedRatio}
                />
                <div className="member-home__hero-exact">
                  <strong>{formatDurationClock(recognizedSeconds ?? 0)}</strong>
                  <small>
                    오늘 교시 시간 {Math.round(availableSeconds / 60)}분 기준 ·
                    서울
                  </small>
                </div>
              </div>
              <HomeDayTimeline blocks={dayBlocks} />
            </div>
          </details>
        )}
        <Link
          aria-label="주간·월간 학습 기록 보기"
          className="member-home__hero-report-link"
          to={memberRoutes.study}
        >
          주간·월간 기록 <ChevronRight aria-hidden="true" size={14} />
        </Link>
      </div>
    </section>
  );
}
