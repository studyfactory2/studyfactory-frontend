import { useSession } from '../../../core/session';
import { EmptyState } from '../../../shared/ui';
import { StaffLeavePanel } from '../../staff/operations/components/StaffLeavePanel';
import { StaffSideDishPanel } from '../../staff/operations/components/StaffSideDishPanel';
import '../../staff/operations/styles/staff-operations.css';

type AdminOwnRequestsScreenProps = {
  view: 'leave' | 'meals';
};

/** Personal requests use the signed-in account, never the operating branch. */
export function AdminOwnRequestsScreen({ view }: AdminOwnRequestsScreenProps) {
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
    <div className="staff-operations" key={session.ownerKey}>
      <div className="staff-operations__request-heading">
        <div>
          <p role="note">내 계정의 소속 지점 기준으로 신청해요.</p>
        </div>
      </div>
      {view === 'leave' ? (
        <StaffLeavePanel
          memberId={session.memberId}
          ownerKey={session.ownerKey}
        />
      ) : (
        <StaffSideDishPanel
          memberId={session.memberId}
          ownerKey={session.ownerKey}
        />
      )}
    </div>
  );
}
