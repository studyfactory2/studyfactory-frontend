import { Coffee, Square } from 'lucide-react';
import type {
  StudyBreakName,
  StudyBreakStatusResponse,
} from '../../../../features/study-breaks/study-breaks-api';
import { Badge, Button } from '../../../../shared/ui';
import { useLiveElapsedSeconds } from '../hooks/useLiveElapsedSeconds';
import { formatTimeOfDay } from '../model/home.dates';
import { formatDurationClock } from '../model/home.format';
import { HomeSectionError, HomeSectionLoading } from './HomeSectionState';
import '../styles/HomeBreakStudy.css';

const BREAK_LABELS: Record<StudyBreakName, string> = {
  AFTER_FIRST: '1교시 후 휴식',
  LUNCH: '점심시간',
  AFTER_THIRD: '3교시 후 휴식',
  AFTER_FOURTH: '4교시 후 휴식',
  DINNER: '저녁시간',
  AFTER_SIXTH: '6교시 후 휴식',
};

type HomeBreakStudyProps = {
  actionError: string | null;
  actionLoading: boolean;
  checkedIn: boolean;
  errorMessage: string | null;
  loading: boolean;
  onRetry: () => void;
  onStart: () => Promise<unknown>;
  onStop: () => Promise<unknown>;
  status: StudyBreakStatusResponse | null;
};

export function HomeBreakStudy({
  actionError,
  actionLoading,
  checkedIn,
  errorMessage,
  loading,
  onRetry,
  onStart,
  onStop,
  status,
}: HomeBreakStudyProps) {
  const elapsedSeconds = useLiveElapsedSeconds(
    status?.active ? (status.session?.startedAt ?? null) : null,
  );

  if (!checkedIn) {
    return null;
  }

  if (loading) {
    return (
      <section className="member-home__break-card">
        <HomeSectionLoading label="휴식시간을 확인하는 중이에요." />
      </section>
    );
  }

  if (errorMessage !== null) {
    return (
      <section className="member-home__break-card">
        <HomeSectionError message={errorMessage} onRetry={onRetry} />
      </section>
    );
  }

  if (!status || (!status.currentBreak && !status.active)) {
    return null;
  }

  const active = status.active;
  const endsAt = status.currentBreak
    ? formatTimeOfDay(status.currentBreak.endsAt)
    : null;
  const breakName =
    status.currentBreak?.studyBreak ?? status.session?.studyBreak;
  const actionDisabled = active ? !status.canStop : !status.canStart;

  const runAction = () => {
    void (active ? onStop() : onStart()).catch(() => undefined);
  };

  return (
    <section
      aria-labelledby="member-home-break-title"
      className="member-home__break-card"
    >
      <div className="member-home__break-icon">
        <Coffee aria-hidden="true" size={20} />
      </div>
      <div className="member-home__break-content">
        <div className="member-home__break-heading">
          <div>
            <p className="member-home__break-eyebrow">BREAK STUDY</p>
            <h3 id="member-home-break-title">
              {breakName ? BREAK_LABELS[breakName] : '휴식시간 공부'}
            </h3>
          </div>
          <Badge dot tone={active ? 'positive' : 'special'}>
            {active ? '기록 중' : '휴식 중'}
          </Badge>
        </div>

        <p className="member-home__break-description">
          {active
            ? '지금 공부한 시간은 휴식시간 학습으로 별도 기록돼요.'
            : `${endsAt ? `${endsAt}까지 ` : ''}공부한다면 시작 버튼을 눌러 주세요.`}
        </p>

        {active && elapsedSeconds !== null && (
          <p className="member-home__break-timer">
            <span>휴식시간 공부</span>
            <strong>{formatDurationClock(elapsedSeconds)}</strong>
          </p>
        )}

        {actionError && (
          <p className="member-home__break-error" role="alert">
            {actionError}
          </p>
        )}
      </div>

      <Button
        className="member-home__break-action"
        disabled={actionDisabled}
        loading={actionLoading}
        onClick={runAction}
        variant={active ? 'ghost' : 'primary'}
      >
        {active ? (
          <>
            <Square aria-hidden="true" size={15} />
            공부 종료
          </>
        ) : (
          '휴식시간 공부 시작'
        )}
      </Button>
    </section>
  );
}
