import { useSession, type SessionOwnerKey } from '../../../core/session';
import type { BranchResponse } from '../../../features/branches/branches-api';
import { EmptyState, ScreenHeader } from '../../../shared/ui';
import { useAdminBranchScope } from '../hooks/useAdminBranchScope';
import { AdminMembersToolbar } from './components/AdminMembersToolbar';
import { CurrentMemberEditorModal } from './components/CurrentMemberEditorModal';
import { CurrentMemberList } from './components/CurrentMemberList';
import { PreRegistrationDeleteDialog } from './components/PreRegistrationDeleteDialog';
import { PreRegistrationEditorModal } from './components/PreRegistrationEditorModal';
import { PendingRegistrationList } from './components/PendingRegistrationList';
import { useAdminMemberMutations } from './hooks/useAdminMemberMutations';
import { useAdminMembers } from './hooks/useAdminMembers';
import { useCurrentMemberMutations } from './hooks/useCurrentMemberMutations';
import './styles/admin-members.css';

export function AdminMembersScreen() {
  const { branches, selectedBranch, selectedBranchId } = useAdminBranchScope();
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
    <AdminMembersContent
      branchId={selectedBranchId}
      branchName={selectedBranch.name}
      branches={branches}
      key={session.ownerKey}
      memberId={session.memberId}
      ownerKey={session.ownerKey}
    />
  );
}

function AdminMembersContent({
  branchId,
  branchName,
  branches,
  memberId,
  ownerKey,
}: {
  branchId: number;
  branchName: string;
  branches: BranchResponse[];
  memberId: number;
  ownerKey: SessionOwnerKey;
}) {
  const members = useAdminMembers({ branchId, memberId, ownerKey });
  const mutations = useAdminMemberMutations({
    branchId,
    memberId,
    ownerKey,
    registrations: members.registrations,
  });
  const currentMutations = useCurrentMemberMutations({
    branchId,
    currentMembers: members.currentMembers,
    memberId,
    ownerKey,
  });
  const active = members.view === 'current' ? members.current : members.pending;
  /* Zero results are explained by the list itself, with the same clear button. */
  const resultCount =
    members.filterActive && active.rows !== null && active.rows.length > 0
      ? active.rows.length
      : null;

  return (
    <div className="admin-members">
      <ScreenHeader
        eyebrow="ADMIN · MEMBERS"
        subtitle={`${branchName} · 현재 사원과 등록 대기를 확인해요.`}
        title="사원 관리"
      />

      <AdminMembersToolbar
        counts={members.counts}
        filter={members.filter}
        onCreate={mutations.onCreate}
        onQueryChange={members.onQueryChange}
        onRefresh={members.onRefresh}
        onRoleChange={members.onRoleChange}
        onViewChange={members.onViewChange}
        refreshing={members.refreshing}
        view={members.view}
      />

      {members.certifications.errorMessage !== null && (
        <p className="admin-members__notice" role="status">
          자격증 이름을 불러오지 못해 번호로 보여요.
          <button onClick={members.certifications.onRetry} type="button">
            다시 시도
          </button>
        </p>
      )}

      {resultCount !== null && (
        <p className="admin-members__result" role="status">
          조건에 맞는 {resultCount}명
          <button onClick={members.onClearFilter} type="button">
            조건 지우기
          </button>
        </p>
      )}

      <section
        aria-label={members.view === 'current' ? '현재 사원' : '등록 대기'}
        className="admin-members__list"
      >
        {members.view === 'current' ? (
          <CurrentMemberList
            certificationLookup={members.certifications.lookup}
            errorMessage={members.current.errorMessage}
            filterActive={members.filterActive}
            loading={members.current.loading}
            onClearFilter={members.onClearFilter}
            onEdit={currentMutations.onEdit}
            onRetry={members.current.onRetry}
            rows={members.current.rows}
            total={members.current.total}
          />
        ) : (
          <PendingRegistrationList
            certificationLookup={members.certifications.lookup}
            errorMessage={members.pending.errorMessage}
            filterActive={members.filterActive}
            loading={members.pending.loading}
            onClearFilter={members.onClearFilter}
            onDelete={mutations.onDelete}
            onEdit={mutations.onEdit}
            onRetry={members.pending.onRetry}
            rows={members.pending.rows}
            total={members.pending.total}
          />
        )}
      </section>

      <CurrentMemberEditorModal
        branches={branches}
        certifications={members.certifications}
        errorMessage={currentMutations.editor.errorMessage}
        memberId={memberId}
        mode={currentMutations.editor.mode}
        onClose={currentMutations.editor.onClose}
        onSubmit={currentMutations.editor.onSubmit}
        ownerKey={ownerKey}
        saving={currentMutations.editor.saving}
      />

      <PreRegistrationEditorModal
        branchId={branchId}
        branchName={branchName}
        certifications={members.certifications}
        errorMessage={mutations.editor.errorMessage}
        memberId={memberId}
        mode={mutations.editor.mode}
        onClose={mutations.editor.onClose}
        onSubmit={mutations.editor.onSubmit}
        ownerKey={ownerKey}
        saving={mutations.editor.saving}
      />

      <PreRegistrationDeleteDialog
        errorMessage={mutations.deletion.errorMessage}
        onClose={mutations.deletion.onClose}
        onConfirm={mutations.deletion.onConfirm}
        pending={mutations.deletion.pending}
        registration={mutations.deletion.registration}
      />
    </div>
  );
}
