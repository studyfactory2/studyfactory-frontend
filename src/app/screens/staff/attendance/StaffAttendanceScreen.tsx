import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSession } from '../../../core/session';
import type { SessionOwnerKey } from '../../../core/session';
import {
  AttendanceBoard,
  type AttendanceLeaveManagementTarget,
} from '../../../features/attendances/workspace/components/AttendanceBoard';
import {
  ManagerOperationsOverview,
  useManagerOperations,
} from '../../../features/manager-operations';
import { AttendanceMemberLeaveModal } from '../../../features/manager-leaves';
import { EmptyState } from '../../../shared/ui';
import { AttendanceDateBar } from '../../../features/attendances/workspace/components/AttendanceDateBar';
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
  const [leaveTarget, setLeaveTarget] =
    useState<AttendanceLeaveManagementTarget | null>(null);
  const [searchParams] = useSearchParams();
  const date = useAttendanceDate();
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
      <AttendanceDateBar date={date} writePending={attendance.writePending} />
      <AttendanceBoard
        activeSlot={attendance.period.activeSlot}
        dateKey={date.dateKey}
        errorMessage={attendance.board.errorMessage}
        interaction={attendance.actions}
        isToday={date.isToday}
        loading={attendance.board.loading}
        members={attendance.board.members}
        onManageLeave={setLeaveTarget}
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
      <AttendanceMemberLeaveModal
        branchId={branchId}
        dateKey={date.dateKey}
        memberId={memberId}
        onClose={() => setLeaveTarget(null)}
        ownerKey={ownerKey}
        target={leaveTarget}
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
