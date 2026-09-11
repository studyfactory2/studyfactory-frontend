import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSession, type SessionOwnerKey } from '../../../core/session';
import {
  ManagerMemberLeaveView,
  readManagerLeaveRoute,
  removeManagerLeaveSearch,
} from '../../../features/manager-leaves';
import {
  ManagerSuggestionInbox,
  ManagerTodoBoard,
  useManagerSuggestions,
  useManagerTodos,
} from '../../../features/manager-operations';
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
import { StaffSeatPanel } from './components/StaffSeatPanel';
import { useStaffSchedule } from './hooks/useStaffSchedule';
import { useStaffSeats } from './hooks/useStaffSeats';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const directLeaveContext = readManagerLeaveRoute(searchParams);
  const [activeView, setActiveView] = useState<OperationsView>('work');
  const visibleView = directLeaveContext === null ? activeView : 'member-leave';

  const changeView = (nextView: OperationsView) => {
    setActiveView(nextView);

    if (directLeaveContext !== null) {
      setSearchParams(removeManagerLeaveSearch(searchParams), {
        replace: true,
      });
    }
  };

  return (
    <div className="staff-operations">
      <header className="staff-operations__intro">
        <div>
          <p>STAFF · OPERATIONS</p>
          <h2>운영</h2>
          <span>오늘 업무와 좌석을 관리하고 내 신청·근무표를 확인해요.</span>
        </div>
        <strong>{formatKoreanDate(today.dateKey)}</strong>
      </header>

      <OperationsTabs active={visibleView} onChange={changeView} />

      <section>
        {visibleView === 'work' ? (
          <StaffWorkView
            branchId={branchId}
            memberId={memberId}
            ownerKey={ownerKey}
          />
        ) : visibleView === 'leave' ? (
          <StaffLeavePanel memberId={memberId} ownerKey={ownerKey} />
        ) : visibleView === 'member-leave' ? (
          <ManagerMemberLeaveView
            branchId={branchId}
            context={directLeaveContext}
            memberId={memberId}
            ownerKey={ownerKey}
          />
        ) : visibleView === 'meals' ? (
          <StaffSideDishPanel memberId={memberId} ownerKey={ownerKey} />
        ) : visibleView === 'schedule' ? (
          <StaffScheduleView
            branchId={branchId}
            memberId={memberId}
            memberName={memberName}
            ownerKey={ownerKey}
            todayDateKey={today.dateKey}
          />
        ) : (
          <StaffSeatView
            branchId={branchId}
            memberId={memberId}
            ownerKey={ownerKey}
          />
        )}
      </section>
    </div>
  );
}

function StaffSeatView({
  branchId,
  memberId,
  ownerKey,
}: {
  branchId: number;
  memberId: number;
  ownerKey: SessionOwnerKey;
}) {
  const seats = useStaffSeats({ branchId, memberId, ownerKey });

  return <StaffSeatPanel seats={seats} />;
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
  const todos = useManagerTodos({ branchId, memberId, ownerKey });
  const suggestions = useManagerSuggestions({ branchId, memberId, ownerKey });

  return (
    <div className="manager-work">
      <div className="manager-work__grid">
        <ManagerTodoBoard todos={todos} />
        <ManagerSuggestionInbox suggestions={suggestions} />
      </div>
    </div>
  );
}
