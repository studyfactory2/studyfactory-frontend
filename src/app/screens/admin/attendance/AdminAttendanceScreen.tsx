import { useState } from 'react';
import { useSession, type SessionOwnerKey } from '../../../core/session';
import { getOperationalAttendanceSlot } from '../../../features/attendances/attendance-rules';
import { AttendanceBoard } from '../../../features/attendances/workspace/components/AttendanceBoard';
import { useAttendanceLeaveDialog } from '../../../features/manager-leaves/hooks/useAttendanceLeaveDialog';
import { useAttendanceLeaveReturn } from '../../../features/manager-leaves/hooks/useAttendanceLeaveReturn';
import {
  ManagerOperationsOverview,
  ManagerOperationsWorkspace,
  type ManagerOperationsView,
  useManagerOperations,
} from '../../../features/manager-operations';
import { useSeoulClock } from '../../../shared/hooks/useSeoulClock';
import { EmptyState } from '../../../shared/ui';
import { useAdminBranchScope } from '../hooks/useAdminBranchScope';
import { useAttendanceDate } from '../../../features/attendances/workspace/hooks/useAttendanceDate';
import { useAdminAttendance } from './hooks/useAdminAttendance';
import '../../../features/attendances/workspace/styles/attendance-workspace.css';
import './styles/admin-attendance.css';

const STUDY_START_SECONDS = 9 * 60 * 60;
// Actual 3교시 start; the operational attendance slot advances during lunch.
const ADMIN_LUNCH_BADGE_CUTOFF_SECONDS = 13 * 60 * 60 + 20 * 60;

export function AdminAttendanceScreen() {
  const { selectedBranch, selectedBranchId } = useAdminBranchScope();
  const session = useSession();

  if (session.memberId === null || session.ownerKey === null) {
    return (
      <EmptyState
        description="잠시 후에도 이 화면이 보이면 다시 로그인해 주세요."
        title="로그인 정보를 확인하는 중이에요."
      />
    );
  }

  return (
    <AdminAttendanceContent
      branchId={selectedBranchId}
      branchName={selectedBranch.name}
      key={`${session.ownerKey}:${selectedBranchId}`}
      memberId={session.memberId}
      ownerKey={session.ownerKey}
    />
  );
}

function AdminAttendanceContent({
  branchId,
  branchName,
  memberId,
  ownerKey,
}: {
  branchId: number;
  branchName: string;
  memberId: number;
  ownerKey: SessionOwnerKey;
}) {
  const [operationsView, setOperationsView] =
    useState<ManagerOperationsView | null>(null);
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
  const clock = useSeoulClock(ADMIN_LUNCH_BADGE_CUTOFF_SECONDS);
  const operations = useManagerOperations({
    branchId,
    dateKey: clock.dateKey,
    memberId,
    ownerKey,
  });
  const clockMatchesSelectedDay =
    date.isToday && clock.dateKey === date.dateKey;
  const attendance = useAdminAttendance({
    branchId,
    dateKey: date.dateKey,
    isToday: date.isToday,
    memberId,
    ownerKey,
    writeEnabled: true,
  });
  const operationalSlot = clockMatchesSelectedDay
    ? getOperationalAttendanceSlot(clock.secondsOfDay)
    : null;
  const beforeStudyStart =
    clockMatchesSelectedDay && clock.secondsOfDay < STUDY_START_SECONDS;
  const activeSlot = beforeStudyStart ? null : operationalSlot;

  return (
    <div className="admin-attendance">
      <ManagerOperationsOverview
        hideSideDishPanelHeader
        excludeLunchFromBadge={
          clock.secondsOfDay >= ADMIN_LUNCH_BADGE_CUTOFF_SECONDS
        }
        onManageRequests={() => setOperationsView('member-requests')}
        onManageTasks={() => setOperationsView('tasks')}
        operations={operations}
      />

      {operationsView && (
        <ManagerOperationsWorkspace
          activeView={operationsView}
          onClose={() => {
            const closingView = operationsView;

            operations.todos.date.onGoToday();
            setOperationsView(null);
            window.requestAnimationFrame(() => {
              document
                .getElementById(`manager-operations-manage-${closingView}`)
                ?.focus();
            });
          }}
          onViewChange={setOperationsView}
          operations={operations}
        />
      )}

      <AttendanceBoard
        activeSlot={activeSlot}
        branchName={branchName}
        date={date}
        dateKey={date.dateKey}
        errorMessage={attendance.board.errorMessage}
        interaction={attendance.interaction}
        isToday={date.isToday}
        loading={attendance.board.loading}
        members={attendance.board.members}
        leaveDialog={{ ...leaveDialog, restoreFocusRef: leaveReturnFocusRef }}
        onRefresh={() => {
          attendance.freshness.onRefresh();
          operations.onRefresh();
        }}
        onRetry={attendance.board.onRetry}
        operationalSlot={operationalSlot}
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
