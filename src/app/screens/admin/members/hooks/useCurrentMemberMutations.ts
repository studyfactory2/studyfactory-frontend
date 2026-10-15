import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiRequestError } from '../../../../core/api/api-client';
import type { SessionOwnerKey } from '../../../../core/session';
import { memberQueryKeys } from '../../../../features/members/member-query-keys';
import {
  deleteCurrentMember,
  fetchBranchMembers,
  updateCurrentMember,
  type CurrentMemberInput,
  type MemberResponse,
} from '../../../../features/members/members-api';
import { useToast } from '../../../../shared/ui';

export type CurrentMemberEditorMode =
  { kind: 'closed' } | { kind: 'edit'; member: MemberResponse };

const STALE_TARGET_MESSAGE =
  '이 사원의 정보가 다른 곳에서 변경되었거나 목록에서 사라졌어요. 최신 내용을 확인한 뒤 다시 열어 주세요.';
const SELF_SCOPE_MESSAGE =
  '로그인 중인 관리자 본인의 지점과 역할은 이 화면에서 바꿀 수 없어요.';
const ADMIN_ROLE_MESSAGE =
  '기존 관리자의 역할 변경은 관리자 계정 안전장치를 추가한 뒤 제공할게요.';
const BRANCH_TRANSFER_MESSAGE =
  '지점 이동은 입실 기록 보호 기능을 서버에 추가한 뒤 제공할게요.';
const DUPLICATE_NAME_MESSAGE = '이 지점에서 이미 사용 중인 이름이에요.';
const SELF_DELETE_MESSAGE = '로그인 중인 본인 계정은 삭제할 수 없어요.';

type UseCurrentMemberMutationsArgs = {
  branchId: number;
  currentMembers: MemberResponse[] | null;
  memberId: number;
  ownerKey: SessionOwnerKey;
};

function errorMessage(error: unknown) {
  return error instanceof Error && error.message !== ''
    ? error.message
    : '사원 정보를 수정하지 못했습니다.';
}

function hasSameEditableSnapshot(
  candidate: MemberResponse,
  target: MemberResponse,
) {
  return (
    candidate.id === target.id &&
    candidate.branchId === target.branchId &&
    candidate.name === target.name &&
    candidate.role === target.role &&
    candidate.seatNumber === target.seatNumber &&
    candidate.joinDate === target.joinDate &&
    candidate.certificationId === target.certificationId &&
    candidate.preparingCertifications === target.preparingCertifications &&
    candidate.updatedAt === target.updatedAt
  );
}

class CurrentMemberSafetyError extends Error {}

export function useCurrentMemberMutations({
  branchId,
  currentMembers,
  memberId,
  ownerKey,
}: UseCurrentMemberMutationsArgs) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [mode, setMode] = useState<CurrentMemberEditorMode>({
    kind: 'closed',
  });
  const [editorError, setEditorError] = useState<string | null>(null);
  const deletionLocks = useRef(new Set<number>());
  const [deletingIds, setDeletingIds] = useState<ReadonlySet<number>>(
    new Set(),
  );

  const deleteMutation = useMutation({
    mutationFn: (targetMemberId: number) =>
      deleteCurrentMember(targetMemberId, memberId),
    retry: false,
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      input,
      target,
    }: {
      input: CurrentMemberInput;
      target: MemberResponse;
    }) => {
      const latestRoster = await fetchBranchMembers(target.branchId, memberId);
      const latestTarget = latestRoster.find(
        (candidate) => candidate.id === target.id,
      );

      if (
        latestTarget === undefined ||
        !hasSameEditableSnapshot(latestTarget, target)
      ) {
        throw new CurrentMemberSafetyError(STALE_TARGET_MESSAGE);
      }

      const loginIdentityChanged =
        input.branchId !== target.branchId ||
        input.name.trim() !== target.name.trim();

      if (
        loginIdentityChanged &&
        latestRoster.some(
          (candidate) =>
            candidate.id !== target.id &&
            candidate.name.trim() === input.name.trim(),
        )
      ) {
        throw new CurrentMemberSafetyError(DUPLICATE_NAME_MESSAGE);
      }

      return updateCurrentMember(target.id, input, memberId);
    },
  });

  const isCurrentNow = (target: MemberResponse) =>
    currentMembers !== null &&
    currentMembers.some(
      (candidate) =>
        candidate.id === target.id && candidate.branchId === branchId,
    );

  const refreshPrivateWorkspace = () =>
    queryClient.invalidateQueries({
      queryKey: ['private', ownerKey],
    });

  const openEditor = (target: MemberResponse) => {
    if (deletionLocks.current.has(target.id)) {
      return;
    }

    if (!isCurrentNow(target)) {
      toast(STALE_TARGET_MESSAGE, 'error');
      return;
    }

    setEditorError(null);
    setMode({ kind: 'edit', member: target });
  };

  const closeEditor = () => {
    if (updateMutation.isPending) {
      return;
    }

    setEditorError(null);
    setMode({ kind: 'closed' });
  };

  const submitEditor = async (input: CurrentMemberInput) => {
    if (mode.kind !== 'edit' || updateMutation.isPending) {
      return;
    }

    const target = mode.member;
    setEditorError(null);

    if (!isCurrentNow(target)) {
      setEditorError(STALE_TARGET_MESSAGE);
      return;
    }

    if (input.branchId !== target.branchId) {
      setEditorError(BRANCH_TRANSFER_MESSAGE);
      return;
    }

    if (
      target.id === memberId &&
      (input.branchId !== target.branchId || input.role !== target.role)
    ) {
      setEditorError(SELF_SCOPE_MESSAGE);
      return;
    }

    if (target.role === 'ADMIN' && input.role !== 'ADMIN') {
      setEditorError(ADMIN_ROLE_MESSAGE);
      return;
    }

    let updated: MemberResponse;

    try {
      updated = await updateMutation.mutateAsync({
        input,
        target,
      });
    } catch (error) {
      setEditorError(errorMessage(error));

      if (
        error instanceof CurrentMemberSafetyError ||
        (error instanceof ApiRequestError &&
          (error.status === 400 ||
            error.status === 404 ||
            error.status === 409))
      ) {
        void refreshPrivateWorkspace();
      }

      return;
    }

    queryClient.setQueryData<MemberResponse[]>(
      memberQueryKeys.branch(ownerKey, target.branchId),
      (current) =>
        current?.filter((member) => member.id !== target.id) ?? current,
    );
    queryClient.setQueryData<MemberResponse[]>(
      memberQueryKeys.branch(ownerKey, updated.branchId),
      (current) =>
        current === undefined
          ? current
          : [...current.filter((member) => member.id !== updated.id), updated],
    );

    if (target.id === memberId) {
      queryClient.setQueryData(memberQueryKeys.me(ownerKey), updated);
    }

    const identityChanged =
      target.name !== updated.name ||
      target.branchId !== updated.branchId ||
      target.role !== updated.role;

    toast(
      identityChanged
        ? `${updated.name} 님의 정보를 수정했어요. 변경된 계정은 다시 로그인해야 해요.`
        : `${updated.name} 님의 정보를 수정했어요.`,
      'success',
    );
    setMode({ kind: 'closed' });
    await refreshPrivateWorkspace();
  };

  const deleteMember = async (target: MemberResponse) => {
    if (deletionLocks.current.has(target.id)) {
      return;
    }

    if (target.id === memberId) {
      toast(SELF_DELETE_MESSAGE, 'error');
      return;
    }

    if (!isCurrentNow(target)) {
      toast(STALE_TARGET_MESSAGE, 'error');
      return;
    }

    // A ref closes the same-tick double-tap gap before React disables the row.
    deletionLocks.current.add(target.id);
    setDeletingIds(new Set(deletionLocks.current));

    try {
      await deleteMutation.mutateAsync(target.id);
    } catch (error) {
      toast(
        error instanceof ApiRequestError
          ? `${target.name} 님을 삭제하지 못했어요. ${error.message}`
          : `${target.name} 님을 삭제하지 못했어요. 연결 상태를 확인하고 다시 시도해 주세요.`,
        'error',
      );
      deletionLocks.current.delete(target.id);
      setDeletingIds(new Set(deletionLocks.current));
      return;
    }

    try {
      // An older roster response must not reinsert the confirmed-deleted row.
      await queryClient.cancelQueries({
        queryKey: memberQueryKeys.branch(ownerKey, target.branchId),
      });
      queryClient.setQueryData<MemberResponse[]>(
        memberQueryKeys.branch(ownerKey, target.branchId),
        (current) => current?.filter((member) => member.id !== target.id),
      );
      setMode((current) =>
        current.kind === 'edit' && current.member.id === target.id
          ? { kind: 'closed' }
          : current,
      );
      toast(
        `${target.name} 님의 계정과 관련 기록을 영구 삭제했어요.`,
        'success',
      );

      // Attendance, seats, beverages, leaves and order totals share this owner.
      await refreshPrivateWorkspace();
    } finally {
      deletionLocks.current.delete(target.id);
      setDeletingIds(new Set(deletionLocks.current));
    }
  };

  return {
    deletingIds,
    editor: {
      errorMessage: editorError,
      mode,
      onClose: closeEditor,
      onSubmit: (input: CurrentMemberInput) => void submitEditor(input),
      saving: updateMutation.isPending,
    },
    onDelete: (target: MemberResponse) => void deleteMember(target),
    onEdit: openEditor,
  };
}

export type CurrentMemberMutations = ReturnType<
  typeof useCurrentMemberMutations
>;
