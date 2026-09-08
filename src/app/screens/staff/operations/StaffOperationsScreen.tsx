import { useState } from 'react';
import { useSession, type SessionOwnerKey } from '../../../core/session';
import { useSeoulToday } from '../../../shared/hooks/useSeoulToday';
import {
  formatKoreanDate,
  getWeekdayName,
} from '../../../shared/lib/seoul-date';
import { EmptyState } from '../../../shared/ui';
import {
  OperationsTabs,
  type OperationsView,
} from './components/OperationsTabs';
import { StaffLeavePanel } from './components/StaffLeavePanel';
import { StaffSideDishPanel } from './components/StaffSideDishPanel';
import { StaffSchedulePanel } from './components/StaffSchedulePanel';
import { SuggestionInbox } from './components/SuggestionInbox';
import { TodoBoard } from './components/TodoBoard';
import { useStaffSuggestions } from './hooks/useStaffSuggestions';
import { useStaffSchedule } from './hooks/useStaffSchedule';
import { useStaffTodos } from './hooks/useStaffTodos';
import './styles/staff-operations.css';

export function StaffOperationsScreen() {
  const session = useSession();

  if (
    session.memberId === null ||
    session.branchId === null ||
    session.ownerKey === null
  ) {
    return (
      <EmptyState
        description="잠시 후에도 이 화면이 보이면 다시 로그인해 주세요."
        title="로그인 정보를 확인하는 중이에요."
      />
    );
  }

  return (
    <StaffOperationsContent
      branchId={session.branchId}
      key={session.ownerKey}
      memberId={session.memberId}
      memberName={session.memberName}
      ownerKey={session.ownerKey}
    />
  );
}

function StaffOperationsContent({
  branchId,
  memberId,
  memberName,
  ownerKey,
}: {
  branchId: number;
  memberId: number;
  memberName: string | null;
  ownerKey: SessionOwnerKey;
}) {
  const today = useSeoulToday();
  const [activeView, setActiveView] = useState<OperationsView>('work');

  return (
    <div className="staff-operations">
      <header className="staff-operations__intro">
        <div>
          <p>STAFF · OPERATIONS</p>
          <h2>운영</h2>
          <span>오늘 업무를 처리하고 내 신청과 근무표를 확인해요.</span>
        </div>
        <strong>{formatKoreanDate(today.dateKey)}</strong>
      </header>

      <OperationsTabs active={activeView} onChange={setActiveView} />

      <section>
        {activeView === 'work' ? (
          <StaffWorkView
            branchId={branchId}
            memberId={memberId}
            ownerKey={ownerKey}
          />
        ) : activeView === 'leave' ? (
          <StaffLeavePanel memberId={memberId} ownerKey={ownerKey} />
        ) : activeView === 'meals' ? (
          <StaffSideDishPanel memberId={memberId} ownerKey={ownerKey} />
        ) : (
          <StaffScheduleView
            branchId={branchId}
            memberId={memberId}
            memberName={memberName}
            ownerKey={ownerKey}
            todayDateKey={today.dateKey}
          />
        )}
      </section>
    </div>
  );
}

function StaffScheduleView({
  branchId,
  memberId,
  memberName,
  ownerKey,
  todayDateKey,
}: {
  branchId: number;
  memberId: number;
  memberName: string | null;
  ownerKey: SessionOwnerKey;
  todayDateKey: string;
}) {
  const schedule = useStaffSchedule({
    branchId,
    memberId,
    memberName,
    ownerKey,
  });

  return (
    <StaffSchedulePanel
      schedule={schedule}
      todayWeekday={getWeekdayName(todayDateKey)}
    />
  );
}

function StaffWorkView({
  branchId,
  memberId,
  ownerKey,
}: {
  branchId: number;
  memberId: number;
  ownerKey: SessionOwnerKey;
}) {
  const todos = useStaffTodos({ branchId, memberId, ownerKey });
  const suggestions = useStaffSuggestions({ branchId, memberId, ownerKey });

  return (
    <div className="staff-operations__work-grid">
      <TodoBoard todos={todos} />
      <SuggestionInbox suggestions={suggestions} />
    </div>
  );
}
