import { useSession, type SessionOwnerKey } from '../../../core/session';
import { EmptyState, ScreenHeader } from '../../../shared/ui';
import { useAdminBranchScope } from '../hooks/useAdminBranchScope';
import { AdminDailyLeaveOverview } from './components/AdminDailyLeaveOverview';
import { useAdminDailyLeaves } from './hooks/useAdminDailyLeaves';
import './styles/admin-operations.css';

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
  const leaves = useAdminDailyLeaves({ branchId, memberId, ownerKey });

  return (
    <div className="admin-operations">
      <ScreenHeader
        eyebrow="ADMIN · OPERATIONS"
        subtitle={`${branchName} · 날짜별 휴무 신청과 지점 등록 현황을 확인해요.`}
        title="운영 관리"
      />

      <AdminDailyLeaveOverview branchName={branchName} leaves={leaves} />
    </div>
  );
}
