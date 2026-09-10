import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiRequestError } from '../../../../core/api/api-client';
import type { SessionOwnerKey } from '../../../../core/session';
import { memberQueryKeys } from '../../../../features/members/member-query-keys';
import {
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

  return {
    editor: {
      errorMessage: editorError,
      mode,
      onClose: closeEditor,
      onSubmit: (input: CurrentMemberInput) => void submitEditor(input),
      saving: updateMutation.isPending,
    },
    onEdit: openEditor,
  };
}

export type CurrentMemberMutations = ReturnType<
  typeof useCurrentMemberMutations
>;
