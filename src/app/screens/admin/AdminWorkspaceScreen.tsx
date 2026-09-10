import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import { useSession } from '../../core/session';
import { fetchBranches } from '../../features/branches/branches-api';
import { branchQueryKeys } from '../../features/branches/branch-query-keys';
import { AppShell } from '../../shared/layout/AppShell/AppShell';
import { SectionBadge, SectionError, SectionLoading } from '../../shared/ui';
import { adminNavigation } from './admin-navigation';
import { AdminBranchSelector } from './components/AdminBranchSelector';
import type { AdminBranchScope } from './hooks/useAdminBranchScope';
import './styles/admin-workspace.css';

export function AdminWorkspaceScreen() {
  const session = useSession();

  return (
    <AdminWorkspace
      authenticatedBranchId={session.branchId}
      key={session.ownerKey ?? 'anonymous'}
    />
  );
}

function AdminWorkspace({
  authenticatedBranchId,
}: {
  authenticatedBranchId: number | null;
}) {
  const branchesQuery = useQuery({
    queryFn: fetchBranches,
    queryKey: branchQueryKeys.all(),
    staleTime: 5 * 60 * 1000,
  });
  const branches = useMemo(
    () => branchesQuery.data ?? [],
    [branchesQuery.data],
  );
  const [selectedBranchId, setSelectedBranchId] = useState(
    authenticatedBranchId,
  );

  const selectedBranch =
    branches.find((branch) => branch.id === selectedBranchId) ?? null;

  const selectBranch = useCallback(
    (branchId: number) => {
      if (branches.some((branch) => branch.id === branchId)) {
        setSelectedBranchId(branchId);
      }
    },
    [branches],
  );

  const scope = useMemo<AdminBranchScope | null>(
    () =>
      selectedBranch === null
        ? null
        : {
            branches,
            selectBranch,
            selectedBranch,
            selectedBranchId: selectedBranch.id,
          },
    [branches, selectBranch, selectedBranch],
  );

  const errorMessage = branchesQuery.isError
    ? branchesQuery.error.message
    : null;
  const retryBranches = () => void branchesQuery.refetch();
  /*
   * The top bar names the operating branch, never the account's branch: while
   * nothing is resolved it says so, rather than letting the shell fall back to
   * the authenticated branch and look as if that branch were selected.
   */
  const topbarBranchName =
    selectedBranch?.name ??
    (branchesQuery.isPending ? '운영 지점 확인 중' : '운영 지점 미선택');

  return (
    <AppShell
      displayBranchName={topbarBranchName}
      headerTools={
        <AdminBranchSelector
          announceError={scope !== null}
          branches={branches}
          errorMessage={errorMessage}
          loading={branchesQuery.isPending}
          onRetry={retryBranches}
          onSelect={selectBranch}
          selectedBranchId={selectedBranch?.id ?? null}
        />
      }
      navigation={adminNavigation}
      workspaceLabel="지점 관리자"
    >
      {scope !== null ? (
        /* Keyed so a branch switch remounts the screen with none of A's state. */
        <Outlet context={scope} key={scope.selectedBranchId} />
      ) : (
        <AdminBranchScopeState
          authenticatedBranchId={authenticatedBranchId}
          branchCount={branches.length}
          errorMessage={errorMessage}
          loading={branchesQuery.isPending}
          onRetry={retryBranches}
        />
      )}
    </AppShell>
  );
}

function AdminBranchScopeState({
  authenticatedBranchId,
  branchCount,
  errorMessage,
  loading,
  onRetry,
}: {
  authenticatedBranchId: number | null;
  branchCount: number;
  errorMessage: string | null;
  loading: boolean;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <section className="admin-scope-state">
        <SectionLoading label="지점 목록을 불러오는 중" />
      </section>
    );
  }

  if (errorMessage !== null) {
    return (
      <section className="admin-scope-state">
        <SectionError message={errorMessage} onRetry={onRetry} />
      </section>
    );
  }

  const description =
    branchCount === 0
      ? '등록된 지점이 없어 운영 화면을 열 수 없어요.'
      : authenticatedBranchId === null
        ? '계정에 연결된 지점이 없어요. 위의 운영 지점에서 지점을 직접 고르면 그 지점으로 계속할 수 있어요.'
        : '계정에 연결된 지점이 지점 목록에 없어요. 위의 운영 지점에서 지점을 직접 고르면 그 지점으로 계속할 수 있어요.';

  return (
    <section className="admin-scope-state" role="status">
      <span aria-hidden="true" className="admin-scope-state__icon">
        <Building2 size={22} />
      </span>
      <div>
        <SectionBadge>운영 지점 필요</SectionBadge>
        <h2>운영할 지점이 정해지지 않았어요.</h2>
        <p>{description}</p>
      </div>
    </section>
  );
}
