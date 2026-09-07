import { apiRequest, ApiRequestError } from '../../core/api/api-client';

export type TodoPriority = 'NORMAL' | 'URGENT';

/**
 * MANUAL is a staff member typing one in. The other two are raised by the
 * backend — a new member needing setup, or a suggestion being turned into work
 * — so they arrive mixed into the same list and are worth telling apart.
 */
export type TodoSourceType = 'JOIN_MEMBER' | 'MANUAL' | 'SUGGESTION';

export type TodoReplyResponse = {
  id: number;
  todoItemId: number;
  memberId: number;
  memberName: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type TodoResponse = {
  id: number;
  branchId: number;
  todoDate: string;
  content: string;
  priority: TodoPriority;
  sourceType: TodoSourceType;
  sourceId: number | null;
  targetMemberId: number | null;
  createdByMemberId: number | null;
  createdByMemberName: string | null;
  completed: boolean;
  completedByMemberId: number | null;
  completedAt: string | null;
  replies: TodoReplyResponse[];
  createdAt: string;
  updatedAt: string;
};

/**
 * Todos are the one manager domain the backend scopes correctly: its
 * resolveBranchId calls validateBranchScope, so a branchId outside the caller's
 * own branch is rejected rather than served. The branch is still sent
 * explicitly, both for cache-key clarity and so this call does not depend on a
 * fallback the neighbouring services do not share.
 */
export async function fetchDailyTodos(
  date: string,
  branchId: number,
  expectedMemberId: number,
) {
  const query = new URLSearchParams({ branchId: String(branchId), date });
  const response = await apiRequest<TodoResponse[]>(
    `/api/todos/daily?${query}`,
    { expectedMemberId },
  );

  if (response.some((todo) => todo.branchId !== branchId)) {
    throw new ApiRequestError('다른 지점의 할 일 목록을 받았습니다.', 409);
  }

  return response;
}
