import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiRequestError } from '../../../../core/api/api-client';
import type { SessionOwnerKey } from '../../../../core/session';
import { beverageQueryKeys } from '../../../../features/beverages/beverage-query-keys';
import { certificationQueryKeys } from '../../../../features/certifications/certification-query-keys';
import { memberQueryKeys } from '../../../../features/members/member-query-keys';
import {
  createPendingMember,
  deletePendingMember,
  updatePendingMember,
  type PreRegistrationInput,
  type PreRegistrationResponse,
} from '../../../../features/members/members-api';
import { roomQueryKeys } from '../../../../features/rooms/room-query-keys';
import { useToast } from '../../../../shared/ui';

export type PreRegistrationEditorMode =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; registration: PreRegistrationResponse };

const STALE_TARGET_MESSAGE =
  '이 사전등록 정보가 변경되었거나 더 이상 등록 대기 목록에 없어요. 목록에서 다시 열어 확인해 주세요.';

type UseAdminMemberMutationsArgs = {
  branchId: number;
  memberId: number;
  ownerKey: SessionOwnerKey;
  /** The selected branch's validated pending list, straight from its query. */
  registrations: PreRegistrationResponse[] | null;
};

function errorMessage(error: unknown) {
  return error instanceof Error && error.message !== ''
    ? error.message
    : '요청을 처리하지 못했습니다.';
}

/**
 * The three writes this screen makes, and the editor and delete-dialog state
 * around them. Every write goes to the branch the operator selected, never
 * to the account's own branch, and a target is accepted only while the
 * selected branch's pending list still returns it — a row that
 * signed up or was deleted elsewhere is refused before the request is sent.
 */
export function useAdminMemberMutations({
  branchId,
  memberId,
  ownerKey,
  registrations,
}: UseAdminMemberMutationsArgs) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [mode, setMode] = useState<PreRegistrationEditorMode>({
    kind: 'closed',
  });
  const [editorError, setEditorError] = useState<string | null>(null);
  const [deletionTarget, setDeletionTarget] =
    useState<PreRegistrationResponse | null>(null);
  const [deletionError, setDeletionError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (input: PreRegistrationInput) =>
      createPendingMember(branchId, input, memberId),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: PreRegistrationInput }) =>
      updatePendingMember(id, branchId, input, memberId),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deletePendingMember(id, memberId),
  });

  const saving = createMutation.isPending || updateMutation.isPending;

  const isEditableNow = (registration: PreRegistrationResponse) =>
    registrations !== null &&
    registrations.some(
      (candidate) =>
        candidate.id === registration.id &&
        candidate.branchId === branchId &&
        candidate.role === registration.role &&
        candidate.updatedAt === registration.updatedAt,
    );

  /*
   * Only the selected owner + branch is refreshed. `invalidateQueries`
   * resolves even when a refetch fails — the list then shows its own error
   * with a retry — so a refresh problem can never read as a failed write.
   */
  const refreshAfterWrite = async (certificationsToo: boolean) => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: memberQueryKeys.branch(ownerKey, branchId),
      }),
      queryClient.invalidateQueries({
        queryKey: memberQueryKeys.pending(ownerKey, branchId),
      }),
      queryClient.invalidateQueries({
        queryKey: roomQueryKeys.layouts(ownerKey, branchId),
      }),
      queryClient.invalidateQueries({
        queryKey: beverageQueryKeys.members(ownerKey, branchId),
      }),
      ...(certificationsToo
        ? [
            queryClient.invalidateQueries({
              queryKey: certificationQueryKeys.all(),
            }),
          ]
        : []),
    ]);
  };

  /* A seat conflict means the roster moved under the draft: refresh what the seat list is built from. */
  const refreshSeatSources = () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: memberQueryKeys.branch(ownerKey, branchId),
      }),
      queryClient.invalidateQueries({
        queryKey: memberQueryKeys.pending(ownerKey, branchId),
      }),
      queryClient.invalidateQueries({
        queryKey: roomQueryKeys.layouts(ownerKey, branchId),
      }),
    ]);

  const openCreate = () => {
    setEditorError(null);
    setMode({ kind: 'create' });
  };

  const openEdit = (registration: PreRegistrationResponse) => {
    if (!isEditableNow(registration)) {
      toast(STALE_TARGET_MESSAGE, 'error');
      return;
    }

    setEditorError(null);
    setMode({ kind: 'edit', registration });
  };

  const closeEditor = () => {
    if (saving) {
      return;
    }

    setEditorError(null);
    setMode({ kind: 'closed' });
  };

  const submitEditor = async (input: PreRegistrationInput) => {
    if (mode.kind === 'closed' || saving) {
      return;
    }

    setEditorError(null);

    try {
      if (mode.kind === 'create') {
        const created = await createMutation.mutateAsync(input);

        toast(`${created.name} 님을 사전등록했어요.`, 'success');
      } else {
        if (!isEditableNow(mode.registration)) {
          setEditorError(STALE_TARGET_MESSAGE);
          return;
        }

        const updated = await updateMutation.mutateAsync({
          id: mode.registration.id,
          input,
        });

        toast(`${updated.name} 님의 사전등록을 수정했어요.`, 'success');
      }
    } catch (error) {
      /* The draft stays open with its values; the message explains. */
      setEditorError(errorMessage(error));

      if (error instanceof ApiRequestError && error.status === 409) {
        void refreshSeatSources();
      }

      return;
    }

    setMode({ kind: 'closed' });
    await refreshAfterWrite(true);
  };

  const openDeletion = (registration: PreRegistrationResponse) => {
    if (!isEditableNow(registration)) {
      toast(STALE_TARGET_MESSAGE, 'error');
      return;
    }

    setDeletionError(null);
    setDeletionTarget(registration);
  };

  const closeDeletion = () => {
    if (deleteMutation.isPending) {
      return;
    }

    setDeletionError(null);
    setDeletionTarget(null);
  };

  const confirmDeletion = async () => {
    if (deletionTarget === null || deleteMutation.isPending) {
      return;
    }

    setDeletionError(null);

    if (!isEditableNow(deletionTarget)) {
      setDeletionError(STALE_TARGET_MESSAGE);
      return;
    }

    try {
      await deleteMutation.mutateAsync(deletionTarget.id);
    } catch (error) {
      setDeletionError(errorMessage(error));
      return;
    }

    toast(`${deletionTarget.name} 님의 사전등록을 삭제했어요.`, 'success');
    setDeletionTarget(null);
    await refreshAfterWrite(false);
  };

  return {
    deletion: {
      errorMessage: deletionError,
      onClose: closeDeletion,
      onConfirm: () => void confirmDeletion(),
      pending: deleteMutation.isPending,
      registration: deletionTarget,
    },
    editor: {
      errorMessage: editorError,
      mode,
      onClose: closeEditor,
      onSubmit: (input: PreRegistrationInput) => void submitEditor(input),
      saving,
    },
    onCreate: openCreate,
    onDelete: openDeletion,
    onEdit: openEdit,
  };
}

export type AdminMemberMutations = ReturnType<typeof useAdminMemberMutations>;
