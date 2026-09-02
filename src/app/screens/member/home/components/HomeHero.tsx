import type { ReactNode } from 'react';
import { Clock3 } from 'lucide-react';
import { Badge } from '../../../../shared/ui';
import { useLiveElapsedSeconds } from '../hooks/useLiveElapsedSeconds';
import { formatKoreanDate, formatTimeOfDay } from '../model/home.dates';
import {
  formatDurationClock,
  formatDurationKorean,
} from '../model/home.format';
import { HomeSectionError, HomeSectionLoading } from './HomeSectionState';
import '../styles/HomeHero.css';

export type HomeHeroProps = {
  checkedIn: boolean;
  checkedInAt: string | null;
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

  return (
    <section
      aria-labelledby="member-home-hero-title"
      className="member-home__hero"
    >
      <p className="member-home__hero-date">{formatKoreanDate(dateKey)}</p>
      <h2 className="member-home__hero-title" id="member-home-hero-title">
        {memberName}님, 오늘도 반가워요.
      </h2>

      <div className="member-home__hero-metric">
        <p className="member-home__hero-metric-label">
          <Clock3 aria-hidden="true" size={15} />
          오늘 인정 학습 시간
        </p>
        {studyTimeLoading ? (
          <HomeSectionLoading label="학습 시간을 불러오는 중이에요." />
        ) : studyTimeError !== null ? (
          <HomeSectionError
            message={studyTimeError}
            onRetry={onStudyTimeRetry}
          />
        ) : (
          <p className="member-home__hero-metric-value">
            <strong>{formatDurationClock(recognizedSeconds ?? 0)}</strong>
            <span>{formatDurationKorean(recognizedSeconds ?? 0)}</span>
          </p>
        )}
      </div>

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
