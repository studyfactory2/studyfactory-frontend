import { useSession } from '../../../core/session';
import { ManagerBeverageWorkspace } from '../../../features/manager-beverages';
import { EmptyState } from '../../../shared/ui';

/** Staff adapter; the operational workspace itself is shared with Admin. */
export function StaffBeveragesScreen() {
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
    <ManagerBeverageWorkspace
      branchId={session.branchId}
      key={`${session.ownerKey}:${session.branchId}`}
      memberId={session.memberId}
      ownerKey={session.ownerKey}
    />
  );
}
