import { useSession } from '../../../../core/session';
import { ManagerBeverageWorkspace } from '../../../../features/manager-beverages';
import { EmptyState, ScreenHeader } from '../../../../shared/ui';
import { useAdminBranchScope } from '../../hooks/useAdminBranchScope';
import { AdminOperationsNav } from '../components/AdminOperationsNav';
import '../styles/admin-operations.css';

export function AdminBeveragesScreen() {
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
    <div className="admin-operations">
      <ScreenHeader
        eyebrow="ADMIN · BEVERAGES"
        subtitle={`${selectedBranch.name} · 오늘 만들 음료와 좌석별 서빙 상태를 확인해요.`}
        title="음료 운영"
      />
      <AdminOperationsNav />
      <ManagerBeverageWorkspace
        branchId={selectedBranchId}
        key={`${session.ownerKey}:${selectedBranchId}`}
        memberId={session.memberId}
        ownerKey={session.ownerKey}
      />
    </div>
  );
}
