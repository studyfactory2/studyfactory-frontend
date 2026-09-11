import { useSession, type SessionOwnerKey } from '../../../core/session';
import { EmptyState, ScreenHeader } from '../../../shared/ui';
import { useAdminBranchScope } from '../hooks/useAdminBranchScope';
import { AdminDailyLeaveOverview } from './components/AdminDailyLeaveOverview';
import { AdminDoorQrPanel } from './components/AdminDoorQrPanel';
import { AdminStaffSchedulePanel } from './components/AdminStaffSchedulePanel';
import { useAdminDailyLeaves } from './hooks/useAdminDailyLeaves';
import { useAdminDoorQr } from './hooks/useAdminDoorQr';
import { useAdminStaffSchedule } from './hooks/useAdminStaffSchedule';
import './styles/admin-operations.css';
import './styles/admin-staff-schedule.css';
import './styles/admin-staff-schedule-editor.css';

export function AdminOperationsScreen() {
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
    <AdminOperationsContent
      branchId={selectedBranchId}
      branchName={selectedBranch.name}
      key={`${session.ownerKey}:${selectedBranchId}`}
      memberId={session.memberId}
      ownerKey={session.ownerKey}
    />
  );
}

function AdminOperationsContent({
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
  const doorQr = useAdminDoorQr({ branchId, memberId, ownerKey });
  const leaves = useAdminDailyLeaves({ branchId, memberId, ownerKey });
  const staffSchedule = useAdminStaffSchedule({
    branchId,
    memberId,
    ownerKey,
  });

  return (
    <div className="admin-operations">
      <ScreenHeader
        eyebrow="ADMIN · OPERATIONS"
        subtitle={`${branchName} · 출입 QR, 근무표와 날짜별 휴무 현황을 관리해요.`}
        title="운영 관리"
      />

      <AdminDoorQrPanel branchName={branchName} doorQr={doorQr} />
      <AdminStaffSchedulePanel
        branchName={branchName}
        schedule={staffSchedule}
      />
      <AdminDailyLeaveOverview branchName={branchName} leaves={leaves} />
    </div>
  );
}
