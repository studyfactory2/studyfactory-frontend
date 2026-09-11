import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSession, type SessionOwnerKey } from '../../../core/session';
import {
  readManagerLeaveRoute,
  removeManagerLeaveSearch,
  type ManagerLeaveRouteContext,
} from '../../../features/manager-leaves';
import { EmptyState, ScreenHeader } from '../../../shared/ui';
import { useAdminBranchScope } from '../hooks/useAdminBranchScope';
import { AdminDoorQrPanel } from './components/AdminDoorQrPanel';
import { AdminLeaveWorkspace } from './components/AdminLeaveWorkspace';
import { AdminOperationsNav } from './components/AdminOperationsNav';
import { AdminStaffSchedulePanel } from './components/AdminStaffSchedulePanel';
import { useAdminDoorQr } from './hooks/useAdminDoorQr';
import { useAdminStaffSchedule } from './hooks/useAdminStaffSchedule';
import './styles/admin-operations.css';
import './styles/admin-staff-schedule.css';
import './styles/admin-staff-schedule-editor.css';

export function AdminOperationsScreen() {
  const { branches, selectedBranch, selectedBranchId, selectBranch } =
    useAdminBranchScope();
  const session = useSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const directLeaveContext = readManagerLeaveRoute(searchParams);
  const requestedBranchId = directLeaveContext?.branchId ?? null;
  const requestedBranchAvailable =
    requestedBranchId !== null &&
    branches.some((branch) => branch.id === requestedBranchId);

  useEffect(() => {
    if (requestedBranchAvailable && requestedBranchId !== selectedBranchId) {
      selectBranch(requestedBranchId);
    }
  }, [
    requestedBranchAvailable,
    requestedBranchId,
    selectBranch,
    selectedBranchId,
  ]);

  if (session.memberId === null || session.ownerKey === null) {
    return (
      <EmptyState
        description="잠시 후에도 이 화면이 보이면 다시 로그인해 주세요."
        title="로그인 정보를 확인하는 중이에요."
      />
    );
  }

  if (
    directLeaveContext !== null &&
    (!requestedBranchAvailable || requestedBranchId === null)
  ) {
    return (
      <EmptyState
        description="현재 계정에서 운영할 수 있는 지점인지 확인해 주세요."
        title="휴무 관리 지점을 찾을 수 없어요."
      />
    );
  }

  if (requestedBranchAvailable && requestedBranchId !== selectedBranchId) {
    return (
      <EmptyState
        description="선택한 사원의 지점으로 이동하고 있어요."
        title="운영 지점을 여는 중이에요."
      />
    );
  }

  return (
    <AdminOperationsContent
      branchId={selectedBranchId}
      branchName={selectedBranch.name}
      directLeaveContext={directLeaveContext}
      key={`${session.ownerKey}:${selectedBranchId}`}
      memberId={session.memberId}
      onExitDirect={() => {
        setSearchParams(removeManagerLeaveSearch(searchParams), {
          replace: true,
        });
      }}
      ownerKey={session.ownerKey}
    />
  );
}

function AdminOperationsContent({
  branchId,
  branchName,
  directLeaveContext,
  memberId,
  onExitDirect,
  ownerKey,
}: {
  branchId: number;
  branchName: string;
  directLeaveContext: ManagerLeaveRouteContext | null;
  memberId: number;
  onExitDirect: () => void;
  ownerKey: SessionOwnerKey;
}) {
  if (directLeaveContext !== null) {
    return (
      <div className="admin-operations">
        <ScreenHeader
          eyebrow="ADMIN · LEAVE DESK"
          subtitle={`${branchName} · 선택한 사원의 날짜별 휴무를 관리해요.`}
          title="사원 휴무 관리"
        />
        <AdminLeaveWorkspace
          branchId={branchId}
          branchName={branchName}
          directContext={directLeaveContext}
          memberId={memberId}
          onExitDirect={onExitDirect}
          ownerKey={ownerKey}
        />
      </div>
    );
  }

  return (
    <AdminOperationsOverview
      branchId={branchId}
      branchName={branchName}
      memberId={memberId}
      ownerKey={ownerKey}
    />
  );
}

function AdminOperationsOverview({
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

      <AdminOperationsNav />

      <AdminDoorQrPanel branchName={branchName} doorQr={doorQr} />
      <AdminStaffSchedulePanel
        branchName={branchName}
        schedule={staffSchedule}
      />
      <AdminLeaveWorkspace
        branchId={branchId}
        branchName={branchName}
        memberId={memberId}
        ownerKey={ownerKey}
      />
    </div>
  );
}
