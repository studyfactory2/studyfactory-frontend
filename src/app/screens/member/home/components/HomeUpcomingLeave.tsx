import { CalendarClock, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { memberRoutes } from '../../../../core/router/routes';
import type { MemberLeavePlanResponse } from '../../../../features/leaves/leaves-api';
import { formatKoreanDate } from '../model/home.dates';
import { formatLeaveSlots } from '../model/home.format';
import {
  HomeSectionEmpty,
  HomeSectionError,
  HomeSectionLoading,
} from './HomeSectionState';
import '../styles/HomeAside.css';

export type HomeUpcomingLeaveProps = {
  errorMessage: string | null;
  loading: boolean;
  onRetry: () => void;
  upcoming: MemberLeavePlanResponse | null;
};

export function HomeUpcomingLeave({
  errorMessage,
  loading,
  onRetry,
  upcoming,
}: HomeUpcomingLeaveProps) {
  const slotLabel = formatLeaveSlots(upcoming?.slots ?? null);

  return (
    <section
      aria-labelledby="member-home-leave-title"
      className="member-home__card member-home__aside-card"
    >
      <header className="member-home__card-header">
        <span className="member-home__card-icon">
          <CalendarClock aria-hidden="true" size={18} />
        </span>
        <h3 id="member-home-leave-title">다가오는 휴무</h3>
        <Link to={memberRoutes.more}>
          휴무 <ChevronRight aria-hidden="true" size={14} />
        </Link>
      </header>

      {loading ? (
        <HomeSectionLoading label="휴무 일정을 불러오는 중이에요." />
      ) : errorMessage !== null ? (
        <HomeSectionError message={errorMessage} onRetry={onRetry} />
      ) : upcoming === null ? (
        <HomeSectionEmpty title="예정된 휴무가 없어요.">
          <span>이번 달과 다음 달에 등록된 휴무가 없습니다.</span>
        </HomeSectionEmpty>
      ) : (
        <div className="member-home__leave">
          <p className="member-home__leave-date">
            {formatKoreanDate(upcoming.leaveDate)}
          </p>
          <p className="member-home__leave-label">{upcoming.label}</p>
          {slotLabel && <p className="member-home__leave-slots">{slotLabel}</p>}
        </div>
      )}
    </section>
  );
}
