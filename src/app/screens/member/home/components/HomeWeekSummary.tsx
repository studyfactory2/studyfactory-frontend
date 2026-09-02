import { ChevronRight, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { memberRoutes } from '../../../../core/router/routes';
import {
  HomeSectionEmpty,
  HomeSectionError,
  HomeSectionLoading,
} from './HomeSectionState';
import '../styles/HomeWeekSummary.css';

export type HomeWeekSummaryProps = {
  errorMessage: string | null;
  loading: boolean;
  onRetry: () => void;
  summary: {
    completedCount: number;
    goal: string;
    totalCount: number;
  } | null;
};

export function HomeWeekSummary({
  errorMessage,
  loading,
  onRetry,
  summary,
}: HomeWeekSummaryProps) {
  const progress =
    summary && summary.totalCount > 0
      ? Math.round((summary.completedCount / summary.totalCount) * 100)
      : 0;

  return (
    <section
      aria-labelledby="member-home-week-title"
      className="member-home__card member-home__week"
    >
      <header className="member-home__card-header">
        <span className="member-home__card-icon">
          <Target aria-hidden="true" size={18} />
        </span>
        <h3 id="member-home-week-title">이번 주</h3>
        <Link to={memberRoutes.plans}>
          계획 <ChevronRight aria-hidden="true" size={14} />
        </Link>
      </header>

      {loading ? (
        <HomeSectionLoading label="주간 계획을 불러오는 중이에요." />
      ) : errorMessage !== null ? (
        <HomeSectionError message={errorMessage} onRetry={onRetry} />
      ) : summary === null ? (
        <HomeSectionEmpty title="주간 계획 정보가 없어요." />
      ) : (
        <>
          {summary.goal ? (
            <p className="member-home__week-goal">{summary.goal}</p>
          ) : (
            <p className="member-home__week-goal is-empty">
              이번 주 목표가 아직 비어 있어요.
            </p>
          )}

          <div className="member-home__week-progress">
            <p>
              <strong>{summary.completedCount}</strong>
              <span>/ {summary.totalCount} 완료</span>
            </p>
            <div
              aria-label={`이번 주 계획 ${summary.totalCount}개 중 ${summary.completedCount}개 완료`}
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={progress}
              className="member-home__week-track"
              role="progressbar"
            >
              <span style={{ width: `${progress}%` }} />
            </div>
          </div>
        </>
      )}
    </section>
  );
}
