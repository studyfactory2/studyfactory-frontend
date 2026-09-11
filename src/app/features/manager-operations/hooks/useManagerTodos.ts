import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SessionOwnerKey } from '../../../core/session';
import { todoQueryKeys } from '../../todos/todo-query-keys';
import {
  addTodoReply,
  createTodo,
  deleteTodo,
  fetchDailyTodos,
  updateTodoCompletion,
  updateTodoContent,
  type TodoPriority,
  type TodoResponse,
} from '../../todos/todos-api';
import { useSeoulToday } from '../../../shared/hooks/useSeoulToday';
import { addDays } from '../../../shared/lib/seoul-date';
import { useToast } from '../../../shared/ui';
import { orderTodos } from '../model/manager-operations';

const TODOS_STALE_TIME_MS = 30 * 1_000;

type TodoTarget = Pick<TodoResponse, 'id' | 'todoDate'>;

export function useManagerTodos({
  branchId,
  initialDateKey,
  memberId,
  ownerKey,
}: {
  branchId: number;
  initialDateKey?: string;
  memberId: number;
  ownerKey: SessionOwnerKey;
}) {
  const today = useSeoulToday();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const firstDateKey = initialDateKey ?? today.dateKey;
  const [selectedDateKey, setSelectedDateKey] = useState(firstDateKey);
  const followsTodayRef = useRef(firstDateKey === today.dateKey);
  const writePendingRef = useRef(false);
  const [writePending, setWritePending] = useState(false);
  const [completingId, setCompletingId] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [priority, setPriority] = useState<TodoPriority>('NORMAL');

  useEffect(() => {
    if (followsTodayRef.current) {
      setSelectedDateKey(today.dateKey);
    }
  }, [today.dateKey]);

  const queryKey = todoQueryKeys.daily(ownerKey, branchId, selectedDateKey);
  const todoQuery = useQuery({
    queryFn: () => fetchDailyTodos(selectedDateKey, branchId, memberId),
    queryKey,
    refetchOnWindowFocus: 'always',
    staleTime: TODOS_STALE_TIME_MS,
  });
  const browsingToday = selectedDateKey === today.dateKey;
  const todayTodoQuery = useQuery({
    enabled: !browsingToday,
    queryFn: () => fetchDailyTodos(today.dateKey, branchId, memberId),
    queryKey: todoQueryKeys.daily(ownerKey, branchId, today.dateKey),
    refetchOnWindowFocus: 'always',
    staleTime: TODOS_STALE_TIME_MS,
  });

  const replaceCachedTodo = useCallback(
    (updated: TodoResponse) => {
      queryClient.setQueryData<TodoResponse[]>(
        todoQueryKeys.daily(ownerKey, branchId, updated.todoDate),
        (current) =>
          current?.map((todo) => (todo.id === updated.id ? updated : todo)) ?? [
            updated,
          ],
      );
    },
    [branchId, ownerKey, queryClient],
  );

  const invalidateTodos = useCallback(
    () =>
      queryClient.invalidateQueries({
        queryKey: todoQueryKeys.all(ownerKey),
      }),
    [ownerKey, queryClient],
  );

  const beginWrite = useCallback((todoId: number | null = null) => {
    if (writePendingRef.current) {
      return false;
    }

    writePendingRef.current = true;
    setCompletingId(todoId);
    setWritePending(true);
    return true;
  }, []);

  const finishWrite = useCallback(() => {
    writePendingRef.current = false;
    setCompletingId(null);
    setWritePending(false);
  }, []);

  const settleTodos = useCallback(async () => {
    try {
      await invalidateTodos();
    } finally {
      finishWrite();
    }
  }, [finishWrite, invalidateTodos]);

  const createMutation = useMutation({
    mutationFn: ({
      content,
      todoDate,
      todoPriority,
    }: {
      content: string;
      todoDate: string;
      todoPriority: TodoPriority;
    }) =>
      createTodo(
        { branchId, content, priority: todoPriority, todoDate },
        memberId,
      ),
    onError: (error: Error) => toast(error.message, 'error'),
    onSuccess: (created) => {
      queryClient.setQueryData<TodoResponse[]>(
        todoQueryKeys.daily(ownerKey, branchId, created.todoDate),
        (current) => [...(current ?? []), created],
      );
      setDraft('');
      setPriority('NORMAL');
      toast('할 일을 추가했어요.', 'success');
    },
    onSettled: settleTodos,
  });

  const completionMutation = useMutation({
    mutationFn: ({
      completed,
      id,
      todoDate,
    }: TodoTarget & { completed: boolean }) =>
      updateTodoCompletion(id, completed, branchId, todoDate, memberId),
    onError: (error: Error) => toast(error.message, 'error'),
    onSuccess: (updated) => {
      replaceCachedTodo(updated);
      toast(
        updated.completed ? '할 일을 완료했어요.' : '할 일을 다시 열었어요.',
        'success',
      );
    },
    onSettled: settleTodos,
  });

  const updateMutation = useMutation({
    mutationFn: ({ content, id, todoDate }: TodoTarget & { content: string }) =>
      updateTodoContent(id, content, branchId, todoDate, memberId),
    onError: (error: Error) => toast(error.message, 'error'),
    onSuccess: (updated) => {
      replaceCachedTodo(updated);
      toast('할 일을 수정했어요.', 'success');
    },
    onSettled: settleTodos,
  });

  const replyMutation = useMutation({
    mutationFn: ({
      id,
      replyContent,
      todoDate,
    }: TodoTarget & { replyContent: string }) =>
      addTodoReply(id, replyContent, branchId, todoDate, memberId),
    onError: (error: Error) => toast(error.message, 'error'),
    onSuccess: (updated) => {
      replaceCachedTodo(updated);
      toast('답글을 남겼어요.', 'success');
    },
    onSettled: settleTodos,
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id }: TodoTarget) => deleteTodo(id, memberId),
    onError: (error: Error) => toast(error.message, 'error'),
    onSuccess: (_response, deleted) => {
      queryClient.setQueryData<TodoResponse[]>(
        todoQueryKeys.daily(ownerKey, branchId, deleted.todoDate),
        (current) => current?.filter((todo) => todo.id !== deleted.id) ?? [],
      );
      toast('할 일을 삭제했어요.', 'success');
    },
    onSettled: settleTodos,
  });

  const rows = useMemo(
    () => orderTodos(todoQuery.data ?? []),
    [todoQuery.data],
  );
  const todayRows = useMemo(
    () => (browsingToday ? rows : orderTodos(todayTodoQuery.data ?? [])),
    [browsingToday, rows, todayTodoQuery.data],
  );
  const active = rows.filter((todo) => !todo.completed);
  const completed = rows.filter((todo) => todo.completed);
  const trimmedDraft = draft.trim();
  return {
    active,
    completingId,
    completed,
    composer: {
      canSubmit: trimmedDraft.length > 0 && !writePending,
      draft,
      onChange: setDraft,
      onSubmit: () => {
        if (trimmedDraft.length === 0 || !beginWrite()) {
          return;
        }

        createMutation.mutate({
          content: trimmedDraft,
          todoDate: selectedDateKey,
          todoPriority: priority,
        });
      },
      onToggleUrgent: () =>
        setPriority((current) => (current === 'URGENT' ? 'NORMAL' : 'URGENT')),
      priority,
      saving: writePending && createMutation.isPending,
    },
    date: {
      isToday: selectedDateKey === today.dateKey,
      onGoToday: () => {
        if (writePendingRef.current) {
          return;
        }

        followsTodayRef.current = true;
        setSelectedDateKey(today.dateKey);
      },
      onShift: (days: number) => {
        if (writePendingRef.current) {
          return;
        }

        setSelectedDateKey((current) => {
          const next = addDays(current, days);

          followsTodayRef.current = next === today.dateKey;
          return next;
        });
      },
      selectedDateKey,
    },
    errorMessage: todoQuery.isError ? todoQuery.error.message : null,
    loading: todoQuery.isPending,
    onAddReply: (
      todo: TodoResponse,
      content: string,
      onSuccess?: () => void,
    ) => {
      if (!beginWrite()) {
        return;
      }

      replyMutation.mutate(
        {
          id: todo.id,
          replyContent: content.trim(),
          todoDate: todo.todoDate,
        },
        { onSuccess },
      );
    },
    onDelete: (todo: TodoResponse, onSuccess?: () => void) => {
      if (!beginWrite()) {
        return;
      }

      deleteMutation.mutate(
        { id: todo.id, todoDate: todo.todoDate },
        { onSuccess },
      );
    },
    onRetry: () => void todoQuery.refetch(),
    onToggle: (todo: TodoResponse, onSuccess?: () => void) => {
      if (!beginWrite(todo.id)) {
        return;
      }

      completionMutation.mutate(
        {
          completed: !todo.completed,
          id: todo.id,
          todoDate: todo.todoDate,
        },
        { onSuccess },
      );
    },
    onUpdate: (todo: TodoResponse, content: string, onSuccess?: () => void) => {
      if (!beginWrite()) {
        return;
      }

      updateMutation.mutate(
        {
          content: content.trim(),
          id: todo.id,
          todoDate: todo.todoDate,
        },
        { onSuccess },
      );
    },
    ready: todoQuery.data !== undefined,
    refreshing: todoQuery.isFetching && todoQuery.data !== undefined,
    saving: writePending,
    today: {
      active: todayRows.filter((todo) => !todo.completed),
      errorMessage: browsingToday
        ? todoQuery.isError
          ? todoQuery.error.message
          : null
        : todayTodoQuery.isError
          ? todayTodoQuery.error.message
          : null,
      loading: browsingToday ? todoQuery.isPending : todayTodoQuery.isPending,
      onRetry: () => {
        if (browsingToday) {
          void todoQuery.refetch();
        } else {
          void todayTodoQuery.refetch();
        }
      },
      ready: browsingToday
        ? todoQuery.data !== undefined
        : todayTodoQuery.data !== undefined,
    },
  };
}
