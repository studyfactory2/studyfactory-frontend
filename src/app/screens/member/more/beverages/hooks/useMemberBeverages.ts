import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SessionOwnerKey } from '../../../../../core/session';
import { beverageQueryKeys } from '../../../../../features/beverages/beverage-query-keys';
import {
  addMyBeverageItems,
  fetchMyBeveragePreference,
  replaceMyBeverageItems,
  type BeverageItemInput,
} from '../../../../../features/beverages/beverages-api';
import { useToast } from '../../../../../shared/ui';
import type { BeverageEditorTarget } from '../model/beverage.types';

const PREFERENCE_STALE_TIME_MS = 30 * 1_000;

function toInput(name: string, note: string): BeverageItemInput {
  const trimmedNote = note.trim();

  return {
    name: name.trim(),
    note: trimmedNote.length > 0 ? trimmedNote : null,
  };
}

export function useMemberBeverages(
  memberId: number,
  ownerKey: SessionOwnerKey,
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editorTarget, setEditorTarget] = useState<BeverageEditorTarget | null>(
    null,
  );

  const preferenceQuery = useQuery({
    queryFn: () => fetchMyBeveragePreference(memberId),
    queryKey: beverageQueryKeys.me(ownerKey),
    staleTime: PREFERENCE_STALE_TIME_MS,
  });

  const items = preferenceQuery.data?.items ?? [];

  /** Every write refreshes the home card too, which reads the same root. */
  const afterWrite = async (message: string) => {
    setEditorTarget(null);
    toast(message, 'success');
    await queryClient.invalidateQueries({
      queryKey: beverageQueryKeys.all(ownerKey),
    });
  };

  const addMutation = useMutation({
    mutationFn: (input: BeverageItemInput) =>
      addMyBeverageItems([input], memberId),
    onError: (error: Error) => toast(error.message, 'error'),
    onSuccess: () => afterWrite('음료를 추가했어요.'),
  });

  const replaceMutation = useMutation({
    mutationFn: ({ next }: { message: string; next: BeverageItemInput[] }) =>
      replaceMyBeverageItems(next, memberId),
    onError: (error: Error) => toast(error.message, 'error'),
    onSuccess: (_data, variables) => afterWrite(variables.message),
  });

  const currentInputs = (): BeverageItemInput[] =>
    items.map((item) => ({ name: item.name, note: item.note }));

  return {
    editorTarget,
    items,
    onCloseEditor: () => setEditorTarget(null),
    onDelete: (index: number) => {
      const next = currentInputs().filter(
        (_item, itemIndex) => itemIndex !== index,
      );

      replaceMutation.mutate({ message: '음료를 삭제했어요.', next });
    },
    onOpenAdd: () => setEditorTarget({ kind: 'add' }),
    onOpenEdit: (index: number) => {
      const item = items[index];

      if (item === undefined) {
        return;
      }

      setEditorTarget({
        index,
        kind: 'edit',
        name: item.name,
        note: item.note ?? '',
      });
    },
    onSubmit: (name: string, note: string) => {
      if (editorTarget === null || name.trim().length === 0) {
        return;
      }

      if (editorTarget.kind === 'add') {
        addMutation.mutate(toInput(name, note));
        return;
      }

      const next = currentInputs();
      next[editorTarget.index] = toInput(name, note);
      replaceMutation.mutate({ message: '음료를 수정했어요.', next });
    },
    preference: {
      errorMessage: preferenceQuery.isError
        ? preferenceQuery.error.message
        : null,
      loading: preferenceQuery.isPending,
      onRetry: () => void preferenceQuery.refetch(),
    },
    saving: addMutation.isPending || replaceMutation.isPending,
  };
}
