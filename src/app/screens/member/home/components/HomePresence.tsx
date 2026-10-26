import type { ReactNode } from 'react';
import { useLiveElapsedSeconds } from '../hooks/useLiveElapsedSeconds';
import { formatKoreanDate, formatTimeOfDay } from '../model/home.dates';
import { formatDurationClock } from '../model/home.format';
import { HomeSectionError, HomeSectionLoading } from './HomeSectionState';
import '../styles/HomePresence.css';

type HomePresenceProps = {
  checkedIn: boolean;
  checkedInAt: string | null;
  dateKey: string;
  presenceAction: ReactNode;
  presenceError: string | null;
  presenceLoading: boolean;
  onPresenceRetry: () => void;
};

export function HomePresence({
  checkedIn,
  checkedInAt,
  dateKey,
  presenceAction,
  presenceError,
  presenceLoading,
  onPresenceRetry,
}: HomePresenceProps) {
  const elapsedSeconds = useLiveElapsedSeconds(checkedIn ? checkedInAt : null);
  const checkedInTime = checkedInAt ? formatTimeOfDay(checkedInAt) : null;

  return (
    <div className="member-home__presence-bar">
      <div className="member-home__presence-copy">
        <p className="member-home__hero-date">{formatKoreanDate(dateKey)}</p>
        {presenceLoading ? (
          <HomeSectionLoading label="입실 상태를 확인하는 중이에요." />
        ) : presenceError !== null ? (
          <HomeSectionError message={presenceError} onRetry={onPresenceRetry} />
        ) : (
          <p className="member-home__presence-status">
            {checkedIn ? '입실 중' : '현재 미입실'}
          </p>
        )}
      </div>
      {!presenceLoading && presenceError === null && (
        <div className="member-home__presence-action">{presenceAction}</div>
      )}
      {!presenceLoading &&
        presenceError === null &&
        checkedIn &&
        (checkedInTime !== null || elapsedSeconds !== null) && (
          <p className="member-home__presence-elapsed">
            {checkedInTime !== null && <span>{checkedInTime} 입실</span>}
            {checkedInTime !== null && elapsedSeconds !== null && (
              <span aria-hidden="true">·</span>
            )}
            {elapsedSeconds !== null && (
              <span>입실 후 경과 {formatDurationClock(elapsedSeconds)}</span>
            )}
          </p>
        )}
    </div>
  );
}
