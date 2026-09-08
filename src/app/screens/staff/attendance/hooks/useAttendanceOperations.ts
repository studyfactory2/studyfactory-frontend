import { useCallback, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SessionOwnerKey } from '../../../../core/session';
import { sideDishQueryKeys } from '../../../../features/side-dishes/side-dish-query-keys';
import { fetchDailySideDishes } from '../../../../features/side-dishes/side-dishes-api';
import { suggestionQueryKeys } from '../../../../features/suggestions/suggestion-query-keys';
import {
  fetchBranchSuggestions,
  toggleSuggestionResolution,
  type SuggestionResponse,
} from '../../../../features/suggestions/suggestions-api';
import { todoQueryKeys } from '../../../../features/todos/todo-query-keys';
import {
  fetchDailyTodos,
  updateTodoCompletion,
  type TodoResponse,
} from '../../../../features/todos/todos-api';
import { useToast } from '../../../../shared/ui';
import {
  buildAttendanceMealGroup,
  buildAttendanceSuggestionRows,
  buildAttendanceTodoRows,
} from '../model/attendance-operations';

const OPERATIONS_REFETCH_MS = 30 * 1_000;
const OPERATIONS_STALE_TIME_MS = 15 * 1_000;

type UseAttendanceOperationsArgs = {
  branchId: number;
  dateKey: string;
  memberId: number;
  ownerKey: SessionOwnerKey;
};

function usePendingIds() {
  const idsRef = useRef(new Set<number>());
  const [ids, setIds] = useState<ReadonlySet<number>>(() => new Set());

  const add = useCallback((id: number) => {
    idsRef.current.add(id);
    setIds(new Set(idsRef.current));
  }, []);

  const remove = useCallback((id: number) => {
    idsRef.current.delete(id);
    setIds(new Set(idsRef.current));
  }, []);

  const has = useCallback((id: number) => idsRef.current.has(id), []);

  return { add, has, ids, remove };
}

export function useAttendanceOperations({
  branchId,
  dateKey,
  memberId,
  ownerKey,
}: UseAttendanceOperationsArgs) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const pendingTodoIds = usePendingIds();
  const pendingSuggestionIds = usePendingIds();

  const todoQuery = useQuery({
    // This GET lazily materializes JOIN_MEMBER todos, so keep it to focus and
    // manual refresh instead of writing every 30 seconds from an idle screen.
    queryFn: () => fetchDailyTodos(dateKey, branchId, memberId),
    queryKey: todoQueryKeys.daily(ownerKey, branchId, dateKey),
    refetchOnWindowFocus: 'always',
    staleTime: OPERATIONS_STALE_TIME_MS,
  });
  const suggestionQuery = useQuery({
    queryFn: () => fetchBranchSuggestions(memberId),
    queryKey: suggestionQueryKeys.branch(ownerKey),
    refetchInterval: OPERATIONS_REFETCH_MS,
    refetchOnWindowFocus: 'always',
    staleTime: OPERATIONS_STALE_TIME_MS,
  });
  const sideDishQuery = useQuery({
    queryFn: () => fetchDailySideDishes(dateKey, branchId, memberId),
    queryKey: sideDishQueryKeys.daily(ownerKey, branchId, dateKey),
    refetchInterval: OPERATIONS_REFETCH_MS,
    refetchOnWindowFocus: 'always',
    staleTime: OPERATIONS_STALE_TIME_MS,
  });

  const todoMutation = useMutation({
    mutationFn: (todo: TodoResponse) =>
      updateTodoCompletion(
        todo.id,
        !todo.completed,
        branchId,
        todo.todoDate,
        memberId,
      ),
    onError: (error: Error) => toast(error.message, 'error'),
    onSuccess: (updated) => {
      queryClient.setQueryData<TodoResponse[]>(
        todoQueryKeys.daily(ownerKey, branchId, updated.todoDate),
        (current) =>
          current?.map((todo) => (todo.id === updated.id ? updated : todo)) ?? [
            updated,
          ],
      );
      toast('할 일을 완료했어요.', 'success');
    },
    onSettled: async (_updated, _error, todo) => {
      try {
        await queryClient.invalidateQueries({
          queryKey: todoQueryKeys.all(ownerKey),
        });
      } finally {
        pendingTodoIds.remove(todo.id);
      }
    },
  });

  const suggestionMutation = useMutation({
    mutationFn: (suggestion: SuggestionResponse) =>
      toggleSuggestionResolution(suggestion.id, branchId, memberId),
    onError: (error: Error) => toast(error.message, 'error'),
    onSuccess: (updated) => {
      queryClient.setQueryData<SuggestionResponse[]>(
        suggestionQueryKeys.branch(ownerKey),
        (current) =>
          current?.map((suggestion) =>
            suggestion.id === updated.id ? updated : suggestion,
          ) ?? [updated],
      );
      toast('회원 요청을 처리했어요.', 'success');
    },
    onSettled: async (_updated, _error, suggestion) => {
      try {
        await queryClient.invalidateQueries({
          queryKey: suggestionQueryKeys.all(ownerKey),
        });
      } finally {
        pendingSuggestionIds.remove(suggestion.id);
      }
    },
  });

  const todoRows = useMemo(
    () => buildAttendanceTodoRows(todoQuery.data ?? []),
    [todoQuery.data],
  );
  const suggestionRows = useMemo(
    () => buildAttendanceSuggestionRows(suggestionQuery.data ?? []),
    [suggestionQuery.data],
  );
  const lunch = useMemo(
    () => buildAttendanceMealGroup(sideDishQuery.data ?? [], 'LUNCH'),
    [sideDishQuery.data],
  );
  const dinner = useMemo(
    () => buildAttendanceMealGroup(sideDishQuery.data ?? [], 'DINNER'),
    [sideDishQuery.data],
  );

  const refresh = useCallback(() => {
    void todoQuery.refetch();
    void suggestionQuery.refetch();
    void sideDishQuery.refetch();
  }, [sideDishQuery, suggestionQuery, todoQuery]);

  return {
    meals: {
      dinner,
      errorMessage: sideDishQuery.isError ? sideDishQuery.error.message : null,
      loading: sideDishQuery.isPending,
      lunch,
      onRetry: () => void sideDishQuery.refetch(),
      ready: sideDishQuery.data !== undefined,
    },
    onRefresh: refresh,
    suggestions: {
      errorMessage: suggestionQuery.isError
        ? suggestionQuery.error.message
        : null,
      loading: suggestionQuery.isPending,
      onRetry: () => void suggestionQuery.refetch(),
      onResolve: (suggestion: SuggestionResponse, onSuccess?: () => void) => {
        if (pendingSuggestionIds.has(suggestion.id)) {
          return;
        }

        pendingSuggestionIds.add(suggestion.id);
        suggestionMutation.mutate(suggestion, { onSuccess });
      },
      pendingIds: pendingSuggestionIds.ids,
      ready: suggestionQuery.data !== undefined,
      rows: suggestionRows,
    },
    todos: {
      errorMessage: todoQuery.isError ? todoQuery.error.message : null,
      loading: todoQuery.isPending,
      onComplete: (todo: TodoResponse, onSuccess?: () => void) => {
        if (pendingTodoIds.has(todo.id)) {
          return;
        }

        pendingTodoIds.add(todo.id);
        todoMutation.mutate(todo, { onSuccess });
      },
      onRetry: () => void todoQuery.refetch(),
      pendingIds: pendingTodoIds.ids,
      ready: todoQuery.data !== undefined,
      rows: todoRows,
      urgentCount: todoRows.filter((todo) => todo.priority === 'URGENT').length,
    },
  };
}
