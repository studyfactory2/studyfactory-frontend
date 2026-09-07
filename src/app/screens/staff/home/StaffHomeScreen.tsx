import { useSession } from '../../../core/session';
import type { SessionOwnerKey } from '../../../core/session';
import { EmptyState } from '../../../shared/ui';
import { getWeekdayName } from '../../../shared/lib/seoul-date';
import { StaffHomeAside } from './components/StaffHomeAside';
import { StaffHomeHero } from './components/StaffHomeHero';
import { StaffHomeJobs } from './components/StaffHomeJobs';
import { StaffHomeTodos } from './components/StaffHomeTodos';
import { useStaffHome } from './hooks/useStaffHome';
import './styles/staff-home.css';

export function StaffHomeScreen() {
  const session = useSession();

  /*
   * ProtectedRoute has already established a STAFF session, so this only guards
   * the window between a session being cleared and the redirect landing. The
   * work is in a child component because the hook underneath cannot be called
   * conditionally.
   */
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
    <StaffHomeContent
      branchId={session.branchId}
      memberId={session.memberId}
      memberName={session.memberName}
      ownerKey={session.ownerKey}
    />
  );
}

function StaffHomeContent({
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
  const home = useStaffHome({ branchId, memberId, memberName, ownerKey });

  return (
    <div className="staff-home">
      <StaffHomeHero room={home.room} shifts={home.shifts} />
      <StaffHomeJobs jobs={home.jobs} />

      <div className="staff-home__body">
        <StaffHomeTodos
          errorMessage={home.todos.errorMessage}
          loading={home.todos.loading}
          onRetry={home.todos.onRetry}
          preview={home.todos.preview}
          remainingCount={home.todos.remainingCount}
        />
        <StaffHomeAside
          meals={home.meals}
          shifts={home.shifts}
          todayWeekday={getWeekdayName(home.today.dateKey)}
        />
      </div>
    </div>
  );
}
