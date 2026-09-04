import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SessionOwnerKey } from '../../../../../core/session';
import { suggestionQueryKeys } from '../../../../../features/suggestions/suggestion-query-keys';
import {
  createMySuggestion,
  fetchMySuggestions,
  type SuggestionCategory,
} from '../../../../../features/suggestions/suggestions-api';
import { useToast } from '../../../../../shared/ui';

const HISTORY_STALE_TIME_MS = 30 * 1_000;

export function useMemberSuggestions(
  memberId: number,
  ownerKey: SessionOwnerKey,
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [category, setCategory] = useState<SuggestionCategory | null>(null);
  const [content, setContent] = useState('');

  const historyQuery = useQuery({
    queryFn: () => fetchMySuggestions(memberId),
    queryKey: suggestionQueryKeys.mine(ownerKey),
    staleTime: HISTORY_STALE_TIME_MS,
  });

  const createMutation = useMutation({
    mutationFn: (input: { category: SuggestionCategory; content: string }) =>
      createMySuggestion(input.category, input.content, memberId),
    onError: (error: Error) => toast(error.message, 'error'),
    onSuccess: async () => {
      setCategory(null);
      setContent('');
      toast('요청을 보냈어요.', 'success');
      await queryClient.invalidateQueries({
        queryKey: suggestionQueryKeys.all(ownerKey),
      });
    },
  });

  const trimmedContent = content.trim();

  return {
    category,
    content,
    history: {
      errorMessage: historyQuery.isError ? historyQuery.error.message : null,
      loading: historyQuery.isPending,
      onRetry: () => void historyQuery.refetch(),
      rows: historyQuery.data ?? [],
    },
    onChangeContent: setContent,
    onSelectCategory: setCategory,
    onSubmit: () => {
      if (category === null || trimmedContent.length === 0) {
        return;
      }

      createMutation.mutate({ category, content: trimmedContent });
    },
    /** The backend trims nothing, so whitespace-only content is stopped here. */
    submittable: category !== null && trimmedContent.length > 0,
    submitting: createMutation.isPending,
  };
}
