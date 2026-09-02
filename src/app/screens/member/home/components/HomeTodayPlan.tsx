import { Check, ChevronRight, ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';
import { memberRoutes } from '../../../../core/router/routes';
import type { TodayPeriodPlan } from '../model/home.types';
import {
  HomeSectionEmpty,
  HomeSectionError,
  HomeSectionLoading,
} from './HomeSectionState';
import '../styles/HomeTodayPlan.css';

export type HomeTodayPlanProps = {
  errorMessage: string | null;
  loading: boolean;
  onRetry: () => void;
  periods: TodayPeriodPlan[];
};

export function HomeTodayPlan({
  errorMessage,
  loading,
  onRetry,
  periods,
}: HomeTodayPlanProps) {
  return (
    <section
      aria-labelledby="member-home-today-title"
      className="member-home__card member-home__today"
    >
      <header className="member-home__card-header">
        <span className="member-home__card-icon">
          <ClipboardList aria-hidden="true" size={18} />
        </span>
        <h3 id="member-home-today-title">오늘의 계획</h3>
        <Link to={memberRoutes.plans}>
          편집 <ChevronRight aria-hidden="true" size={14} />
        </Link>
      </header>

      {loading ? (
        <HomeSectionLoading label="오늘의 계획을 불러오는 중이에요." />
      ) : errorMessage !== null ? (
        <HomeSectionError message={errorMessage} onRetry={onRetry} />
      ) : periods.length === 0 ? (
        <HomeSectionEmpty title="오늘 등록된 계획이 없어요.">
          <span>계획 화면에서 교시별 할 일을 추가해 보세요.</span>
          <Link className="member-home__empty-link" to={memberRoutes.plans}>
            계획 추가하기
          </Link>
        </HomeSectionEmpty>
      ) : (
        <ol className="member-home__today-list">
          {periods.map((period) => (
            <li
              className={period.row.isBreak ? 'is-break' : ''}
              key={period.row.periodIndex}
            >
              <div className="member-home__today-period">
                <strong>{period.row.label}</strong>
                <small>{period.row.time}</small>
              </div>
              <ul className="member-home__today-items">
                {period.items.map((item) => (
                  <li className={item.done ? 'is-done' : ''} key={item.id}>
                    <i aria-hidden="true">
                      {item.done && <Check size={11} strokeWidth={3} />}
                    </i>
                    <span>{item.content}</span>
                    <em className="member-home__sr-only">
                      {item.done ? '완료' : '미완료'}
                    </em>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
