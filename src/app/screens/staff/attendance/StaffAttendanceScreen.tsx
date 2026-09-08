import { useSession } from '../../../core/session';
import type { SessionOwnerKey } from '../../../core/session';
import { EmptyState } from '../../../shared/ui';
import { AttendanceBoard } from './components/AttendanceBoard';
import { AttendanceSummary } from './components/AttendanceSummary';
import { LivePresencePanel } from './components/LivePresencePanel';
import { useStaffAttendance } from './hooks/useStaffAttendance';
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
  const attendance = useStaffAttendance({ branchId, memberId, ownerKey });

  return (
    <div className="staff-attendance">
      <AttendanceSummary
        dateKey={attendance.today.dateKey}
        onRefresh={attendance.freshness.onRefresh}
        periodLabel={attendance.period.label}
        refreshing={attendance.freshness.refreshing}
        summary={attendance.summary}
      />

      <div className="staff-attendance__body">
        <AttendanceBoard
          activeSlot={attendance.period.activeSlot}
          errorMessage={attendance.board.errorMessage}
          loading={attendance.board.loading}
          members={attendance.board.members}
          onRetry={attendance.board.onRetry}
          operationalSlot={attendance.period.operationalSlot}
          ready={attendance.board.ready}
        />
        <LivePresencePanel
          asOfLabel={attendance.live.asOfLabel}
          errorMessage={attendance.live.errorMessage}
          loading={attendance.live.loading}
          onRetry={attendance.live.onRetry}
          ready={attendance.live.ready}
          sessions={attendance.live.sessions}
        />
      </div>
    </div>
  );
}
