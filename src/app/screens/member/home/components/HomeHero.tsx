import type { ReactNode } from 'react';
import { Badge, Dial } from '../../../../shared/ui';
import { useLiveElapsedSeconds } from '../hooks/useLiveElapsedSeconds';
import { formatKoreanDate, formatTimeOfDay } from '../model/home.dates';
import { formatDurationClock } from '../model/home.format';
import { HomeDayTimeline, type HomeDayBlock } from './HomeDayTimeline';
import { HomeSectionError, HomeSectionLoading } from './HomeSectionState';
import '../styles/HomeHero.css';

export type HomeHeroProps = {
  checkedIn: boolean;
  checkedInAt: string | null;
  dayBlocks: readonly HomeDayBlock[];
  dateKey: string;
  memberName: string;
  presenceAction: ReactNode;
  presenceError: string | null;
  presenceLoading: boolean;
  onPresenceRetry: () => void;
  onStudyTimeRetry: () => void;
  recognizedSeconds: number | null;
  studyTimeError: string | null;
  studyTimeLoading: boolean;
};

export function HomeHero({
  checkedIn,
  checkedInAt,
  dayBlocks,
  dateKey,
  memberName,
  presenceAction,
  presenceError,
  presenceLoading,
  onPresenceRetry,
  onStudyTimeRetry,
  recognizedSeconds,
  studyTimeError,
  studyTimeLoading,
}: HomeHeroProps) {
  const elapsedSeconds = useLiveElapsedSeconds(checkedIn ? checkedInAt : null);
  const checkedInTime = checkedInAt ? formatTimeOfDay(checkedInAt) : null;

  /**
   * The dial measures today's recognised time against the 교시 minutes only.
   * Break study is recognised on top of those, so the ratio can legitimately
   * pass 1 — a member who studied through the short breaks has earned more
   * than the timetable offered. That is a good outcome, not an error, so the
   * ring fills and the caption says so rather than printing an impossible
   * number like 118%.
   */
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
        <p className="member-home__hero-date">{formatKoreanDate(dateKey)}</p>
        <h2 className="member-home__hero-title" id="member-home-hero-title">
          {memberName}님, 오늘도 반가워요.
        </h2>
      </header>

      {studyTimeLoading ? (
        <HomeSectionLoading label="학습 시간을 불러오는 중이에요." />
      ) : studyTimeError !== null ? (
        <HomeSectionError message={studyTimeError} onRetry={onStudyTimeRetry} />
      ) : (
        <>
          <div className="member-home__hero-figure">
            <Dial
              caption={dialCaption}
              label="오늘 인정 학습 진행률"
              size={88}
              value={earnedRatio}
            />
            <div className="member-home__hero-readout">
              <span className="instrument__label">오늘 인정 학습 시간</span>
              <strong>{formatDurationClock(recognizedSeconds ?? 0)}</strong>
              <small>
                오늘 교시 시간 {Math.round(availableSeconds / 60)}분 기준 · 서울
              </small>
            </div>
          </div>

          <HomeDayTimeline blocks={dayBlocks} />
        </>
      )}

      <div className="member-home__hero-presence">
        {presenceLoading ? (
          <HomeSectionLoading label="입실 상태를 확인하는 중이에요." />
        ) : presenceError !== null ? (
          <HomeSectionError message={presenceError} onRetry={onPresenceRetry} />
        ) : (
          <>
            <Badge dot tone={checkedIn ? 'positive' : 'neutral'}>
              {checkedIn ? '입실 중' : '입실 기록 없음'}
            </Badge>
            {checkedIn ? (
              <dl className="member-home__hero-facts">
                {checkedInTime && (
                  <div>
                    <dt>입실</dt>
                    <dd>{checkedInTime}</dd>
                  </div>
                )}
                {elapsedSeconds !== null && (
                  <div>
                    <dt>입실 후 경과</dt>
                    <dd>{formatDurationClock(elapsedSeconds)}</dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="member-home__hero-note">
                출입구 QR로 입실하면 학습 시간이 기록돼요.
              </p>
            )}
            {presenceAction}
          </>
        )}
      </div>
    </section>
  );
}
