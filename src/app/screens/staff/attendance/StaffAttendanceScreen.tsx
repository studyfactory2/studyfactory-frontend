import { useSearchParams } from 'react-router-dom';
import { useSession } from '../../../core/session';
import type { SessionOwnerKey } from '../../../core/session';
import { EmptyState } from '../../../shared/ui';
import { AttendanceBoard } from './components/AttendanceBoard';
import { AttendanceOperationsOverview } from './components/AttendanceOperationsOverview';
import { useStaffAttendance } from './hooks/useStaffAttendance';
import { useAttendanceOperations } from './hooks/useAttendanceOperations';
import './styles/staff-attendance.css';

export function StaffAttendanceScreen() {
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
    <StaffAttendanceContent
      branchId={session.branchId}
      memberId={session.memberId}
      ownerKey={session.ownerKey}
    />
  );
}

function StaffAttendanceContent({
  branchId,
  memberId,
  ownerKey,
}: {
  branchId: number;
  memberId: number;
  ownerKey: SessionOwnerKey;
}) {
  const [searchParams] = useSearchParams();
  const attendance = useStaffAttendance({ branchId, memberId, ownerKey });
  const operations = useAttendanceOperations({
    branchId,
    dateKey: attendance.today.dateKey,
    memberId,
    ownerKey,
  });

  return (
    <div className="staff-attendance">
      <AttendanceOperationsOverview
        initialSection={toCockpitSection(searchParams.get('panel'))}
        operations={operations}
      />
      <AttendanceBoard
        activeSlot={attendance.period.activeSlot}
        dateKey={attendance.today.dateKey}
        errorMessage={attendance.board.errorMessage}
        loading={attendance.board.loading}
        members={attendance.board.members}
        onManualCheckIn={attendance.actions.onManualCheckIn}
        onManualCheckOut={attendance.actions.onManualCheckOut}
        onResetMember={attendance.actions.onResetMember}
        onRefresh={() => {
          attendance.freshness.onRefresh();
          operations.onRefresh();
        }}
        onRetry={attendance.board.onRetry}
        onUpdateSlot={attendance.actions.onUpdateSlot}
        operationalSlot={attendance.period.operationalSlot}
        pendingCellKeys={attendance.actions.pendingCellKeys}
        pendingMemberIds={attendance.actions.pendingMemberIds}
        pendingPresenceMemberIds={attendance.actions.pendingPresenceMemberIds}
        pendingResetIds={attendance.actions.pendingResetIds}
        periodLabel={attendance.period.label}
        presenceErrorMessage={attendance.presence.errorMessage}
        presenceOnRetry={attendance.presence.onRetry}
        presenceReady={attendance.presence.ready}
        ready={attendance.board.ready}
        refreshing={attendance.freshness.refreshing}
      />
    </div>
  );
}

function toCockpitSection(value: string | null) {
  return value === 'tasks' ||
    value === 'member-requests' ||
    value === 'side-dish-orders'
    ? value
    : null;
}
