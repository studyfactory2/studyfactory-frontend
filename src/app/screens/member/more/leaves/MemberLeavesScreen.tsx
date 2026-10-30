import { useId, useRef, useState } from 'react';
import { memberRoutes } from '../../../../core/router/routes';
import { useSession, type SessionOwnerKey } from '../../../../core/session';
import {
  formatKoreanDate,
  formatKoreanMonth,
} from '../../../../shared/lib/seoul-date';
import {
  ScreenHeader,
  SectionEmpty,
  SectionError,
  SectionLoading,
} from '../../../../shared/ui';
import { LeaveCalendar } from './components/LeaveCalendar';
import { LeaveDayForm } from './components/LeaveDayForm';
import { LeaveUpcomingList } from './components/LeaveUpcomingList';
import { useMemberLeaves } from './hooks/useMemberLeaves';
import './styles/MemberLeavesScreen.css';
import '../styles/member-detail-desktop.css';

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
  const leaves = useMemberLeaves(memberId, queryOwnerKey, {
    allowOverlappingFullDay: true,
  });
  const { plan, visibleMonth } = leaves;
  const [requestDateKey, setRequestDateKey] = useState<string | null>(null);
  const requestDateId = useId();
  const requestFormRef = useRef<HTMLElement>(null);
  const monthLabel = formatKoreanMonth(visibleMonth.year, visibleMonth.month);
  const requestCell =
    leaves.cells.find(
      (cell) => cell.inMonth && cell.dateKey === requestDateKey,
    ) ??
    leaves.cells.find((cell) => cell.inMonth && cell.isToday) ??
    leaves.cells.find((cell) => cell.inMonth);
  const isPlanReady = !plan.loading && plan.errorMessage === null;
  const requestHint = plan.loading
    ? '휴무 일정을 불러온 뒤 신청할 수 있어요.'
    : plan.errorMessage !== null
      ? '휴무 일정을 다시 불러온 뒤 신청해 주세요.'
      : '달력에서 날짜를 선택해 주세요.';

  const selectDay = (dateKey: string) => {
    if (!leaves.saving) {
      setRequestDateKey(dateKey);
    }
  };
  const navigateMonth = (navigate: () => void) => {
    if (!leaves.saving) {
      setRequestDateKey(null);
      navigate();
    }
  };

  return (
    <section className="member-leaves">
      <ScreenHeader
        backLabel="홈"
        backTo={memberRoutes.home}
        eyebrow="MEMBER · LEAVE"
        title="휴무"
      />

      {/* Two cards that were stacked; side by side they fill the width the
       * workspace actually gives them, and the calendar keeps its cell size. */}
      <div className="member-leaves__split">
        <div className="member-leaves__card">
          {plan.loading ? (
            <SectionLoading label="휴무 일정을 불러오는 중이에요." />
          ) : plan.errorMessage !== null ? (
            <SectionError message={plan.errorMessage} onRetry={plan.onRetry} />
          ) : (
            <LeaveCalendar
              cells={leaves.cells}
              disabled={leaves.saving}
              isCurrentMonth={leaves.isCurrentMonth}
              monthLabel={monthLabel}
              onGoToday={() => navigateMonth(leaves.onGoToday)}
              onNextMonth={() => navigateMonth(leaves.onNextMonth)}
              onPreviousMonth={() => navigateMonth(leaves.onPreviousMonth)}
              onSelectDay={selectDay}
              selectedDateKey={requestCell?.dateKey ?? null}
            />
          )}

          <section
            aria-labelledby={requestDateId}
            className="member-leaves__request"
            ref={requestFormRef}
          >
            <div
              aria-atomic="true"
              aria-live="polite"
              className="member-leaves__request-date"
              id={requestDateId}
            >
              <span>선택한 날짜</span>
              <strong>
                {requestCell
                  ? formatKoreanDate(requestCell.dateKey)
                  : '날짜를 선택해 주세요'}
              </strong>
            </div>
            {isPlanReady && requestCell ? (
              <LeaveDayForm
                cell={requestCell}
                key={requestCell.dateKey}
                onCreate={leaves.onCreateLeave}
                onDelete={leaves.onDeleteLeave}
                pendingDeleteId={leaves.pendingDeleteId}
                saving={leaves.saving}
              />
            ) : (
              <p className="member-leaves__request-hint">{requestHint}</p>
            )}
          </section>
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
            <SectionLoading label="휴무 일정을 불러오는 중이에요." />
          ) : plan.errorMessage !== null ? (
            <SectionError message={plan.errorMessage} onRetry={plan.onRetry} />
          ) : leaves.upcoming.length === 0 ? (
            <SectionEmpty title="예정된 휴무가 없어요">
              <p>날짜를 선택하고 달력 아래에서 휴무를 신청할 수 있어요.</p>
            </SectionEmpty>
          ) : (
            <LeaveUpcomingList
              disabled={leaves.saving}
              onSelectDay={(dateKey) => {
                selectDay(dateKey);
                requestFormRef.current?.scrollIntoView({
                  behavior: 'smooth',
                  block: 'start',
                });
              }}
              rows={leaves.upcoming}
            />
          )}
        </section>
      </div>
    </section>
  );
}
