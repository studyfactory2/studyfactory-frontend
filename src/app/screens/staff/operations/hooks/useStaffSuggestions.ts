import { useCallback, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SessionOwnerKey } from '../../../../core/session';
import { suggestionQueryKeys } from '../../../../features/suggestions/suggestion-query-keys';
import {
  fetchBranchSuggestions,
  toggleSuggestionResolution,
  type SuggestionResponse,
} from '../../../../features/suggestions/suggestions-api';
import { useToast } from '../../../../shared/ui';
import { orderSuggestions } from '../model/staff-operations';

const SUGGESTIONS_STALE_TIME_MS = 30 * 1_000;

export function useStaffSuggestions({
  branchId,
  memberId,
  ownerKey,
}: {
  branchId: number;
  memberId: number;
  ownerKey: SessionOwnerKey;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const pendingIdsRef = useRef(new Set<number>());
  const successCallbacksRef = useRef(new Map<number, () => void>());
  const [pendingIds, setPendingIds] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  const suggestionQuery = useQuery({
    queryFn: () => fetchBranchSuggestions(branchId, memberId),
    queryKey: suggestionQueryKeys.branch(ownerKey, branchId),
    refetchInterval: 30 * 1_000,
    refetchOnWindowFocus: true,
    staleTime: SUGGESTIONS_STALE_TIME_MS,
  });

  const markPending = useCallback((suggestionId: number) => {
    pendingIdsRef.current.add(suggestionId);
    setPendingIds(new Set(pendingIdsRef.current));
  }, []);

  const clearPending = useCallback((suggestionId: number) => {
    pendingIdsRef.current.delete(suggestionId);
    setPendingIds(new Set(pendingIdsRef.current));
  }, []);

  const toggleMutation = useMutation({
    mutationFn: (suggestion: SuggestionResponse) =>
      toggleSuggestionResolution(suggestion.id, branchId, memberId),
    onError: (error: Error, suggestion) => {
      successCallbacksRef.current.delete(suggestion.id);
      toast(error.message, 'error');
    },
    onSuccess: (updated, suggestion) => {
      queryClient.setQueryData<SuggestionResponse[]>(
        suggestionQueryKeys.branch(ownerKey, branchId),
        (current) =>
          current?.map((suggestion) =>
            suggestion.id === updated.id ? updated : suggestion,
          ) ?? [updated],
      );
      toast(
        updated.isResolved
          ? '회원 요청을 처리했어요.'
          : '회원 요청을 다시 열었어요.',
        'success',
      );

      const onSuccess = successCallbacksRef.current.get(suggestion.id);

      successCallbacksRef.current.delete(suggestion.id);
      onSuccess?.();
    },
    onSettled: async (_updated, _error, suggestion) => {
      try {
        await queryClient.invalidateQueries({
          queryKey: suggestionQueryKeys.all(ownerKey),
        });
      } finally {
        successCallbacksRef.current.delete(suggestion.id);
        clearPending(suggestion.id);
      }
    },
  });

  const rows = useMemo(
    () => orderSuggestions(suggestionQuery.data ?? []),
    [suggestionQuery.data],
  );

  return {
    errorMessage: suggestionQuery.isError
      ? suggestionQuery.error.message
      : null,
    loading: suggestionQuery.isPending,
    onRetry: () => void suggestionQuery.refetch(),
    onToggle: (suggestion: SuggestionResponse, onSuccess?: () => void) => {
      if (pendingIdsRef.current.has(suggestion.id)) {
        return;
      }

      if (onSuccess) {
        successCallbacksRef.current.set(suggestion.id, onSuccess);
      } else {
        successCallbacksRef.current.delete(suggestion.id);
      }

      markPending(suggestion.id);
      toggleMutation.mutate(suggestion);
    },
    open: rows.filter((suggestion) => !suggestion.isResolved),
    ready: suggestionQuery.data !== undefined,
    refreshing:
      suggestionQuery.isFetching && suggestionQuery.data !== undefined,
    resolved: rows.filter((suggestion) => suggestion.isResolved),
    savingIds: pendingIds,
  };
}
