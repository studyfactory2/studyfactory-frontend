import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { memberRoutes } from '../../../../core/router/routes';
import { useSession, type SessionOwnerKey } from '../../../../core/session';
import { formatKoreanMonth } from '../../../../shared/lib/seoul-date';
import { LeaveCalendar } from './components/LeaveCalendar';
import { LeaveDayModal } from './components/LeaveDayModal';
import {
  LeaveSectionEmpty,
  LeaveSectionError,
  LeaveSectionLoading,
} from './components/LeaveSectionState';
import { LeaveUpcomingList } from './components/LeaveUpcomingList';
import { useMemberLeaves } from './hooks/useMemberLeaves';
import './styles/MemberLeavesScreen.css';

export function MemberLeavesScreen() {
  const { memberId, ownerKey } = useSession();

  if (memberId === null || ownerKey === null) {
    return null;
  }

  return (
    <MemberLeaves key={ownerKey} memberId={memberId} queryOwnerKey={ownerKey} />
  );
}

function MemberLeaves({
  memberId,
  queryOwnerKey,
}: {
  memberId: number;
  queryOwnerKey: SessionOwnerKey;
}) {
  const leaves = useMemberLeaves(memberId, queryOwnerKey);
  const { plan, visibleMonth } = leaves;
  const monthLabel = formatKoreanMonth(visibleMonth.year, visibleMonth.month);

  return (
    <section className="member-leaves">
      <header className="member-leaves__header">
        <Link className="member-leaves__back" to={memberRoutes.more}>
          <ChevronLeft aria-hidden="true" size={16} />
          더보기
        </Link>
        <p className="member-leaves__eyebrow">MEMBER · LEAVE</p>
        <h2 className="member-leaves__title">휴무</h2>
        <p className="member-leaves__subtitle">
          날짜를 눌러 휴무를 신청하고 취소해요 · 서울 기준
        </p>
      </header>

      <div className="member-leaves__card">
        {plan.loading ? (
          <LeaveSectionLoading label="휴무 일정을 불러오는 중이에요." />
        ) : plan.errorMessage !== null ? (
          <LeaveSectionError
            message={plan.errorMessage}
            onRetry={plan.onRetry}
          />
        ) : (
          <LeaveCalendar
            cells={leaves.cells}
            isCurrentMonth={leaves.isCurrentMonth}
            monthLabel={monthLabel}
            onGoToday={leaves.onGoToday}
            onNextMonth={leaves.onNextMonth}
            onPreviousMonth={leaves.onPreviousMonth}
            onSelectDay={leaves.onSelectDay}
            selectedDateKey={leaves.selectedCell?.dateKey ?? null}
          />
        )}

        <ul className="member-leaves__legend">
          <li>
            <i className="member-leaves__legend-swatch is-own" />
            내가 신청한 휴무
          </li>
          <li>
            <i className="member-leaves__legend-swatch is-office" />
            지점이 등록한 휴무
          </li>
        </ul>
      </div>

      <section
        aria-labelledby="member-leaves-upcoming-title"
        className="member-leaves__card"
      >
        <header className="member-leaves__card-header">
          <h3 id="member-leaves-upcoming-title">예정된 휴무</h3>
          <span>{monthLabel}</span>
        </header>

        {plan.loading ? (
          <LeaveSectionLoading label="휴무 일정을 불러오는 중이에요." />
        ) : plan.errorMessage !== null ? (
          <LeaveSectionError
            message={plan.errorMessage}
            onRetry={plan.onRetry}
          />
        ) : leaves.upcoming.length === 0 ? (
          <LeaveSectionEmpty title="예정된 휴무가 없어요">
            <p>달력에서 날짜를 눌러 휴무를 신청할 수 있어요.</p>
          </LeaveSectionEmpty>
        ) : (
          <LeaveUpcomingList
            onSelectDay={leaves.onSelectDay}
            rows={leaves.upcoming}
          />
        )}
      </section>

      <LeaveDayModal
        cell={leaves.selectedCell}
        onClose={leaves.onCloseDay}
        onCreate={leaves.onCreateLeave}
        onDelete={leaves.onDeleteLeave}
        saving={leaves.saving}
      />
    </section>
  );
}
