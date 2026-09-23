import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiRequestError } from '../../../../core/api/api-client';
import type { SessionOwnerKey } from '../../../../core/session';
import { beverageQueryKeys } from '../../../../features/beverages/beverage-query-keys';
import { certificationQueryKeys } from '../../../../features/certifications/certification-query-keys';
import { memberQueryKeys } from '../../../../features/members/member-query-keys';
import {
  createPendingMember,
  deletePendingMember,
  reissueRegistrationCode,
  updatePendingMember,
  type PreRegistrationInput,
  type PreRegistrationResponse,
} from '../../../../features/members/members-api';
import { roomQueryKeys } from '../../../../features/rooms/room-query-keys';
import { useToast } from '../../../../shared/ui';
import type { RegistrationCodeDialogState } from '../model/registration-code';

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
 * The containing screen is keyed by owner and branch. Code-bearing responses
 * stay only in this mounted screen, never in React Query's mutation cache.
 */
export function useAdminMemberMutations({
  branchId,
  memberId,
  ownerKey,
  registrations,
}: UseAdminMemberMutationsArgs) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const mounted = useRef(false);
  const savingInFlight = useRef(false);
  const codeInFlight = useRef(false);
  const [mode, setMode] = useState<PreRegistrationEditorMode>({
    kind: 'closed',
  });
  const [editorError, setEditorError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletionTarget, setDeletionTarget] =
    useState<PreRegistrationResponse | null>(null);
  const [deletionError, setDeletionError] = useState<string | null>(null);
  const [codeDialog, setCodeDialog] = useState<RegistrationCodeDialogState>({
    kind: 'closed',
  });
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codePending, setCodePending] = useState(false);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deletePendingMember(id, memberId),
  });

  const isEditableNow = (registration: PreRegistrationResponse) =>
    registrations !== null &&
    registrations.some(
      (candidate) =>
        candidate.id === registration.id &&
        candidate.branchId === branchId &&
        candidate.role === registration.role &&
        candidate.updatedAt === registration.updatedAt,
    );

  /* A refresh failure is shown by the list, not mistaken for a failed write. */
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
    if (savingInFlight.current) {
      return;
    }

    setEditorError(null);
    setMode({ kind: 'closed' });
  };

  const submitEditor = async (input: PreRegistrationInput) => {
    if (mode.kind === 'closed' || savingInFlight.current) {
      return;
    }

    setEditorError(null);

    if (mode.kind === 'edit' && !isEditableNow(mode.registration)) {
      setEditorError(STALE_TARGET_MESSAGE);
      return;
    }

    savingInFlight.current = true;
    setSaving(true);

    try {
      const registration =
        mode.kind === 'create'
          ? await createPendingMember(branchId, input, memberId)
          : await updatePendingMember(
              mode.registration.id,
              branchId,
              input,
              memberId,
            );

      if (mounted.current) {
        setMode({ kind: 'closed' });

        if (registration.role === 'STAFF' || registration.role === 'ADMIN') {
          setCodeError(null);
          setCodeDialog({
            kind: 'issued',
            name: registration.name,
            role: registration.role,
            code: registration.registrationCode,
            expiresAt: registration.registrationCodeExpiresAt,
          });
        } else {
          toast(
            mode.kind === 'create'
              ? `${registration.name} 님을 사전등록했어요.`
              : `${registration.name} 님의 사전등록을 수정했어요.`,
            'success',
          );
        }
      }

      await refreshAfterWrite(true);
    } catch (error) {
      if (mounted.current) {
        setEditorError(errorMessage(error));
      }

      if (error instanceof ApiRequestError && error.status === 409) {
        void refreshSeatSources();
      }
    } finally {
      savingInFlight.current = false;

      if (mounted.current) {
        setSaving(false);
      }
    }
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
      if (mounted.current) {
        setDeletionError(errorMessage(error));
      }

      return;
    }

    if (mounted.current) {
      toast(`${deletionTarget.name} 님의 사전등록을 삭제했어요.`, 'success');
      setDeletionTarget(null);
    }

    await refreshAfterWrite(false);
  };

  const openCodeReissue = (registration: PreRegistrationResponse) => {
    if (registration.role === 'MEMBER' || !isEditableNow(registration)) {
      toast(STALE_TARGET_MESSAGE, 'error');
      return;
    }

    setCodeError(null);
    setCodeDialog({ kind: 'confirm', registration });
  };

  const closeCodeDialog = () => {
    if (codeInFlight.current) {
      return;
    }

    setCodeError(null);
    setCodeDialog({ kind: 'closed' });
  };

  const confirmCodeReissue = async () => {
    if (codeDialog.kind !== 'confirm' || codeInFlight.current) {
      return;
    }

    const { registration } = codeDialog;
    setCodeError(null);

    if (registration.role === 'MEMBER' || !isEditableNow(registration)) {
      setCodeError(STALE_TARGET_MESSAGE);
      return;
    }

    codeInFlight.current = true;
    setCodePending(true);

    try {
      const issued = await reissueRegistrationCode(registration.id, memberId);

      if (mounted.current) {
        setCodeDialog({
          kind: 'issued',
          name: registration.name,
          role: registration.role,
          code: issued.registrationCode,
          expiresAt: issued.registrationCodeExpiresAt,
        });
      }

      await refreshAfterWrite(false);
    } catch (error) {
      if (mounted.current) {
        setCodeError(errorMessage(error));
      }
    } finally {
      codeInFlight.current = false;

      if (mounted.current) {
        setCodePending(false);
      }
    }
  };

  return {
    registrationCode: {
      state: codeDialog,
      errorMessage: codeError,
      onClose: closeCodeDialog,
      onConfirm: () => void confirmCodeReissue(),
      pending: codePending,
    },
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
    onReissueCode: openCodeReissue,
    onDelete: openDeletion,
    onEdit: openEdit,
  };
}

export type AdminMemberMutations = ReturnType<typeof useAdminMemberMutations>;
