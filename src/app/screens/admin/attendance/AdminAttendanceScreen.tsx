import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminRoutes } from '../../../core/router/routes';
import { useSession, type SessionOwnerKey } from '../../../core/session';
import { getOperationalAttendanceSlot } from '../../../features/attendances/attendance-rules';
import { AttendanceBoard } from '../../../features/attendances/workspace/components/AttendanceBoard';
import { createManagerLeaveSearch } from '../../../features/manager-leaves';
import {
  ManagerOperationsOverview,
  ManagerOperationsWorkspace,
  type ManagerOperationsView,
  useManagerOperations,
} from '../../../features/manager-operations';
import { useSeoulClock } from '../../../shared/hooks/useSeoulClock';
import { EmptyState, ScreenHeader } from '../../../shared/ui';
import { useAdminBranchScope } from '../hooks/useAdminBranchScope';
import { AdminAttendanceDateBar } from './components/AdminAttendanceDateBar';
import { useAdminAttendance } from './hooks/useAdminAttendance';
import { useAdminAttendanceDate } from './hooks/useAdminAttendanceDate';
import '../../../features/attendances/workspace/styles/attendance-workspace.css';
import './styles/admin-attendance.css';

const STUDY_START_SECONDS = 9 * 60 * 60;

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
  const navigate = useNavigate();
  const [operationsView, setOperationsView] =
    useState<ManagerOperationsView | null>(null);
  const date = useAdminAttendanceDate();
  const clock = useSeoulClock();
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
    writeEnabled: clockMatchesSelectedDay,
  });
  const operationalSlot = clockMatchesSelectedDay
    ? getOperationalAttendanceSlot(clock.secondsOfDay)
    : null;
  const beforeStudyStart =
    clockMatchesSelectedDay && clock.secondsOfDay < STUDY_START_SECONDS;
  const activeSlot = beforeStudyStart ? null : operationalSlot;
  const periodLabel = !date.isToday
    ? '기록 조회'
    : !clockMatchesSelectedDay
      ? '오늘 기록'
      : operationalSlot === null
        ? '운영 종료'
        : beforeStudyStart
          ? '1교시 준비'
          : `${operationalSlot}교시 기준`;

  return (
    <div className="admin-attendance">
      <ScreenHeader
        eyebrow="ADMIN · ATTENDANCE"
        subtitle={`${branchName} · 오늘 운영과 날짜별 교시 출석을 한곳에서 확인해요.`}
        title="출석 기록"
      />

      <ManagerOperationsOverview
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

      <AdminAttendanceDateBar
        branchName={branchName}
        dateKey={date.dateKey}
        isToday={date.isToday}
        maxDateKey={date.maxDateKey}
        nextDisabled={date.nextDisabled}
        onDateChange={date.onDateChange}
        onNextDay={date.onNextDay}
        onPreviousDay={date.onPreviousDay}
        onToday={date.onToday}
        writePending={attendance.writePending}
      />

      <AttendanceBoard
        activeSlot={activeSlot}
        dateKey={date.dateKey}
        errorMessage={attendance.board.errorMessage}
        interaction={attendance.interaction}
        isToday={date.isToday}
        loading={attendance.board.loading}
        members={attendance.board.members}
        onManageLeave={(target) => {
          navigate(
            `${adminRoutes.operations}?${createManagerLeaveSearch({
              ...target,
              branchId,
            })}`,
          );
        }}
        onRefresh={() => {
          attendance.freshness.onRefresh();
          operations.onRefresh();
        }}
        onRetry={attendance.board.onRetry}
        operationalSlot={operationalSlot}
        periodLabel={periodLabel}
        presenceErrorMessage={attendance.presence.errorMessage}
        presenceOnRetry={attendance.presence.onRetry}
        presenceReady={attendance.presence.ready}
        ready={attendance.board.ready}
        refreshing={attendance.freshness.refreshing}
      />
    </div>
  );
}
