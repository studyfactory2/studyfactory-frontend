import { CalendarDays } from 'lucide-react';
import type { SessionOwnerKey } from '../../../../core/session';
import { formatKoreanMonth } from '../../../../shared/lib/seoul-date';
import {
  Card,
  SectionEmpty,
  SectionError,
  SectionLoading,
} from '../../../../shared/ui';
import { LeaveCalendar } from '../../../member/more/leaves/components/LeaveCalendar';
import { LeaveDayModal } from '../../../member/more/leaves/components/LeaveDayModal';
import { LeaveUpcomingList } from '../../../member/more/leaves/components/LeaveUpcomingList';
import { useMemberLeaves } from '../../../member/more/leaves/hooks/useMemberLeaves';

export function StaffLeavePanel({
  memberId,
  ownerKey,
}: {
  memberId: number;
  ownerKey: SessionOwnerKey;
}) {
  const leaves = useMemberLeaves(memberId, ownerKey);
  const monthLabel = formatKoreanMonth(
    leaves.visibleMonth.year,
    leaves.visibleMonth.month,
  );

  return (
    <div className="staff-operations__request-view">
      <header className="staff-operations__request-heading">
        <span aria-hidden="true">
          <CalendarDays size={20} />
        </span>
        <div>
          <h3>내 휴무</h3>
          <p>날짜를 눌러 휴무를 신청하거나 내가 신청한 휴무를 취소해요.</p>
        </div>
      </header>

      <div className="staff-operations__request-grid is-leave">
        <Card className="staff-operations__request-card">
          {leaves.plan.loading ? (
            <SectionLoading label="휴무 일정을 불러오는 중이에요." />
          ) : leaves.plan.errorMessage ? (
            <SectionError
              message={leaves.plan.errorMessage}
              onRetry={leaves.plan.onRetry}
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
        </Card>

        <Card className="staff-operations__request-card">
          <header className="staff-operations__request-card-header">
            <h4>예정된 휴무</h4>
            <span>{monthLabel}</span>
          </header>

          {leaves.plan.loading ? (
            <SectionLoading label="휴무 일정을 불러오는 중이에요." />
          ) : leaves.plan.errorMessage ? (
            <SectionError
              message={leaves.plan.errorMessage}
              onRetry={leaves.plan.onRetry}
            />
          ) : leaves.upcoming.length === 0 ? (
            <SectionEmpty title="예정된 휴무가 없어요">
              <p>달력에서 날짜를 눌러 신청할 수 있어요.</p>
            </SectionEmpty>
          ) : (
            <LeaveUpcomingList
              onSelectDay={leaves.onSelectDay}
              rows={leaves.upcoming}
            />
          )}
        </Card>
      </div>

      <LeaveDayModal
        cell={leaves.selectedCell}
        onClose={leaves.onCloseDay}
        onCreate={leaves.onCreateLeave}
        onDelete={leaves.onDeleteLeave}
        pendingDeleteId={leaves.pendingDeleteId}
        saving={leaves.saving}
      />
    </div>
  );
}
