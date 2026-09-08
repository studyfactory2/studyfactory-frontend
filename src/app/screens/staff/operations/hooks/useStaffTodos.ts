import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SessionOwnerKey } from '../../../../core/session';
import { todoQueryKeys } from '../../../../features/todos/todo-query-keys';
import {
  addTodoReply,
  createTodo,
  deleteTodo,
  fetchDailyTodos,
  updateTodoCompletion,
  updateTodoContent,
  type TodoPriority,
  type TodoResponse,
} from '../../../../features/todos/todos-api';
import { useSeoulToday } from '../../../../shared/hooks/useSeoulToday';
import { addDays } from '../../../../shared/lib/seoul-date';
import { useToast } from '../../../../shared/ui';
import { orderTodos } from '../model/staff-operations';

const TODOS_STALE_TIME_MS = 30 * 1_000;

type TodoTarget = Pick<TodoResponse, 'id' | 'todoDate'>;

export function useStaffTodos({
  branchId,
  memberId,
  ownerKey,
}: {
  branchId: number;
  memberId: number;
  ownerKey: SessionOwnerKey;
}) {
  const today = useSeoulToday();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedDateKey, setSelectedDateKey] = useState(today.dateKey);
  const [draft, setDraft] = useState('');
  const [priority, setPriority] = useState<TodoPriority>('NORMAL');

  const queryKey = todoQueryKeys.daily(ownerKey, branchId, selectedDateKey);
  const todoQuery = useQuery({
    queryFn: () => fetchDailyTodos(selectedDateKey, branchId, memberId),
    queryKey,
    refetchOnWindowFocus: true,
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
    onSettled: async () => invalidateTodos(),
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
    onSettled: async () => invalidateTodos(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ content, id, todoDate }: TodoTarget & { content: string }) =>
      updateTodoContent(id, content, branchId, todoDate, memberId),
    onError: (error: Error) => toast(error.message, 'error'),
    onSuccess: (updated) => {
      replaceCachedTodo(updated);
      toast('할 일을 수정했어요.', 'success');
    },
    onSettled: async () => invalidateTodos(),
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
    onSettled: async () => invalidateTodos(),
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
    onSettled: async () => invalidateTodos(),
  });

  const rows = useMemo(
    () => orderTodos(todoQuery.data ?? []),
    [todoQuery.data],
  );
  const active = rows.filter((todo) => !todo.completed);
  const completed = rows.filter((todo) => todo.completed);
  const trimmedDraft = draft.trim();
  const saving =
    completionMutation.isPending ||
    createMutation.isPending ||
    deleteMutation.isPending ||
    replyMutation.isPending ||
    updateMutation.isPending;

  return {
    active,
    completed,
    composer: {
      canSubmit: trimmedDraft.length > 0,
      draft,
      onChange: setDraft,
      onSubmit: () => {
        if (trimmedDraft.length === 0) {
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
      saving: createMutation.isPending,
    },
    date: {
      isToday: selectedDateKey === today.dateKey,
      onGoToday: () => setSelectedDateKey(today.dateKey),
      onShift: (days: number) =>
        setSelectedDateKey((current) => addDays(current, days)),
      selectedDateKey,
    },
    errorMessage: todoQuery.isError ? todoQuery.error.message : null,
    loading: todoQuery.isPending,
    onAddReply: (todo: TodoResponse, content: string, onSuccess?: () => void) =>
      replyMutation.mutate(
        {
          id: todo.id,
          replyContent: content.trim(),
          todoDate: todo.todoDate,
        },
        { onSuccess },
      ),
    onDelete: (todo: TodoResponse, onSuccess?: () => void) =>
      deleteMutation.mutate(
        { id: todo.id, todoDate: todo.todoDate },
        { onSuccess },
      ),
    onRetry: () => void todoQuery.refetch(),
    onToggle: (todo: TodoResponse) =>
      completionMutation.mutate({
        completed: !todo.completed,
        id: todo.id,
        todoDate: todo.todoDate,
      }),
    onUpdate: (todo: TodoResponse, content: string, onSuccess?: () => void) =>
      updateMutation.mutate(
        {
          content: content.trim(),
          id: todo.id,
          todoDate: todo.todoDate,
        },
        { onSuccess },
      ),
    ready: todoQuery.data !== undefined,
    refreshing: todoQuery.isFetching && todoQuery.data !== undefined,
    saving,
  };
}
