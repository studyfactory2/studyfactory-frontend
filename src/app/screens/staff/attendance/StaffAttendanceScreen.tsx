import { useNavigate, useSearchParams } from 'react-router-dom';
import { staffRoutes } from '../../../core/router/routes';
import { useSession } from '../../../core/session';
import type { SessionOwnerKey } from '../../../core/session';
import { AttendanceBoard } from '../../../features/attendances/workspace/components/AttendanceBoard';
import {
  ManagerOperationsOverview,
  useManagerOperations,
} from '../../../features/manager-operations';
import { createManagerLeaveSearch } from '../../../features/manager-leaves';
import { EmptyState } from '../../../shared/ui';
import { useStaffAttendance } from './hooks/useStaffAttendance';
import '../../../features/attendances/workspace/styles/attendance-workspace.css';
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const attendance = useStaffAttendance({ branchId, memberId, ownerKey });
  const operations = useManagerOperations({
    branchId,
    dateKey: attendance.today.dateKey,
    memberId,
    ownerKey,
  });

  return (
    <div className="staff-attendance">
      <ManagerOperationsOverview
        initialSection={toCockpitSection(searchParams.get('panel'))}
        operations={operations}
      />
      <AttendanceBoard
        activeSlot={attendance.period.activeSlot}
        dateKey={attendance.today.dateKey}
        errorMessage={attendance.board.errorMessage}
        interaction={attendance.actions}
        isToday
        loading={attendance.board.loading}
        members={attendance.board.members}
        onManageLeave={(target) => {
          navigate(
            `${staffRoutes.operations}?${createManagerLeaveSearch(target)}`,
          );
        }}
        onRefresh={() => {
          attendance.freshness.onRefresh();
          operations.onRefresh();
        }}
        onRetry={attendance.board.onRetry}
        operationalSlot={attendance.period.operationalSlot}
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
