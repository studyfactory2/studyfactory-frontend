import { useId, useState } from 'react';
import { Plus } from 'lucide-react';
import { memberRoutes } from '../../../../core/router/routes';
import { useSession, type SessionOwnerKey } from '../../../../core/session';
import {
  formatKoreanDate,
  formatKoreanMonth,
} from '../../../../shared/lib/seoul-date';
import {
  Button,
  ScreenHeader,
  SectionEmpty,
  SectionError,
  SectionLoading,
} from '../../../../shared/ui';
import { LeaveCalendar } from './components/LeaveCalendar';
import { LeaveDayModal } from './components/LeaveDayModal';
import { LeaveUpcomingList } from './components/LeaveUpcomingList';
import { useMemberLeaves } from './hooks/useMemberLeaves';
import { canRequestLeave } from './model/leave.month';
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
  const [requestDateKey, setRequestDateKey] = useState<string | null>(null);
  const requestDateId = useId();
  const requestHintId = useId();
  const monthLabel = formatKoreanMonth(visibleMonth.year, visibleMonth.month);
  const requestCell =
    leaves.selectedCell ??
    leaves.cells.find(
      (cell) => cell.inMonth && cell.dateKey === requestDateKey,
    ) ??
    leaves.cells.find((cell) => cell.inMonth && cell.isToday) ??
    leaves.cells.find((cell) => cell.inMonth);
  const canOpenRequest =
    !plan.loading &&
    plan.errorMessage === null &&
    !leaves.saving &&
    requestCell !== undefined &&
    canRequestLeave(requestCell);
  const requestHint = plan.loading
    ? '휴무 일정을 불러온 뒤 신청할 수 있어요.'
    : plan.errorMessage !== null
      ? '휴무 일정을 다시 불러온 뒤 신청해 주세요.'
      : requestCell?.isPast
        ? '지난 날짜에는 휴무를 신청할 수 없어요.'
        : requestCell && !canRequestLeave(requestCell)
          ? '선택한 날짜에는 휴무를 신청할 수 없어요.'
          : '다른 날짜는 달력에서 선택해 주세요.';

  const selectDay = (dateKey: string) => {
    setRequestDateKey(dateKey);
    leaves.onSelectDay(dateKey);
  };
  const navigateMonth = (navigate: () => void) => {
    setRequestDateKey(null);
    navigate();
  };

  return (
    <section className="member-leaves">
      <ScreenHeader
        backLabel="홈"
        backTo={memberRoutes.home}
        eyebrow="MEMBER · LEAVE"
        subtitle="날짜를 눌러 휴무를 신청하고 취소해요 · 서울 기준"
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
              isCurrentMonth={leaves.isCurrentMonth}
              monthLabel={monthLabel}
              onGoToday={() => navigateMonth(leaves.onGoToday)}
              onNextMonth={() => navigateMonth(leaves.onNextMonth)}
              onPreviousMonth={() => navigateMonth(leaves.onPreviousMonth)}
              onSelectDay={selectDay}
              selectedDateKey={requestCell?.dateKey ?? null}
            />
          )}

          <div className="member-leaves__request">
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
            <Button
              aria-describedby={`${requestDateId} ${requestHintId}`}
              className="member-leaves__request-button"
              disabled={!canOpenRequest}
              onClick={() => {
                if (canOpenRequest && requestCell) {
                  selectDay(requestCell.dateKey);
                }
              }}
            >
              <Plus aria-hidden="true" size={18} />
              휴무 신청
            </Button>
            <p className="member-leaves__request-hint" id={requestHintId}>
              {requestHint}
            </p>
          </div>
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
              <p>달력 아래 휴무 신청 버튼으로 신청할 수 있어요.</p>
            </SectionEmpty>
          ) : (
            <LeaveUpcomingList onSelectDay={selectDay} rows={leaves.upcoming} />
          )}
        </section>
      </div>

      <LeaveDayModal
        cell={leaves.selectedCell}
        onClose={leaves.onCloseDay}
        onCreate={leaves.onCreateLeave}
        onDelete={leaves.onDeleteLeave}
        pendingDeleteId={leaves.pendingDeleteId}
        saving={leaves.saving}
      />
    </section>
  );
}
