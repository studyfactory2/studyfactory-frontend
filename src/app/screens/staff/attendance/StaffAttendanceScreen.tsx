import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useSession } from '../../../core/session';
import type { SessionOwnerKey } from '../../../core/session';
import { fetchBranches } from '../../../features/branches/branches-api';
import { branchQueryKeys } from '../../../features/branches/branch-query-keys';
import { AttendanceBoard } from '../../../features/attendances/workspace/components/AttendanceBoard';
import {
  ManagerOperationsOverview,
  useManagerOperations,
} from '../../../features/manager-operations';
import { useAttendanceLeaveDialog } from '../../../features/manager-leaves/hooks/useAttendanceLeaveDialog';
import { useAttendanceLeaveReturn } from '../../../features/manager-leaves/hooks/useAttendanceLeaveReturn';
import { EmptyState } from '../../../shared/ui';
import { useAttendanceDate } from '../../../features/attendances/workspace/hooks/useAttendanceDate';
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
      key={`${session.ownerKey}:${session.branchId}`}
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
  const branchesQuery = useQuery({
    queryFn: fetchBranches,
    queryKey: branchQueryKeys.all(),
    staleTime: 5 * 60 * 1000,
  });
  const branchName =
    branchesQuery.data?.find((branch) => branch.id === branchId)?.name ?? null;
  const date = useAttendanceDate();
  const leaveDialog = useAttendanceLeaveDialog({
    branchId,
    dateKey: date.dateKey,
    ownerKey,
  });
  const leaveReturnFocusRef = useAttendanceLeaveReturn({
    dateKey: date.dateKey,
    scopeKey: `${ownerKey}:${branchId}`,
    target: leaveDialog.target,
  });
  const attendance = useStaffAttendance({
    branchId,
    memberId,
    ownerKey,
    dateKey: date.dateKey,
    isToday: date.isToday,
  });
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
        branchName={branchName}
        date={date}
        dateKey={date.dateKey}
        errorMessage={attendance.board.errorMessage}
        interaction={attendance.actions}
        isToday={date.isToday}
        loading={attendance.board.loading}
        members={attendance.board.members}
        leaveDialog={{ ...leaveDialog, restoreFocusRef: leaveReturnFocusRef }}
        onRefresh={() => {
          attendance.freshness.onRefresh();
          operations.onRefresh();
        }}
        onRetry={attendance.board.onRetry}
        operationalSlot={attendance.period.operationalSlot}
        presenceErrorMessage={attendance.presence.errorMessage}
        presenceOnRetry={attendance.presence.onRetry}
        presenceReady={attendance.presence.ready}
        ready={attendance.board.ready}
        refreshing={attendance.freshness.refreshing}
        vacantSeatNumbers={attendance.board.vacantSeatNumbers}
        writePending={attendance.writePending}
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
