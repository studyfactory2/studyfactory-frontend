import type {
  SuggestionCategory,
  SuggestionResponse,
} from '../../../../features/suggestions/suggestions-api';
import type { TodoResponse } from '../../../../features/todos/todos-api';
import { formatShortDate } from '../../../../shared/lib/seoul-date';

export const TODO_SOURCE_LABELS: Record<TodoResponse['sourceType'], string> = {
  JOIN_MEMBER: '신규 회원',
  MANUAL: '직접 등록',
  SUGGESTION: '회원 요청',
};

export const SUGGESTION_CATEGORY_LABELS: Record<SuggestionCategory, string> = {
  COUNSELING: '상담',
  GENERAL: '일반',
  STUDY: '학습',
  SUPPLIES: '비품',
};

export function orderTodos(rows: readonly TodoResponse[]) {
  return [...rows].sort((left, right) => {
    if (left.completed !== right.completed) {
      return left.completed ? 1 : -1;
    }

    if (left.priority !== right.priority) {
      return left.priority === 'URGENT' ? -1 : 1;
    }

    return left.createdAt.localeCompare(right.createdAt);
  });
}

export function orderSuggestions(rows: readonly SuggestionResponse[]) {
  return [...rows].sort((left, right) => {
    if (left.isResolved !== right.isResolved) {
      return left.isResolved ? 1 : -1;
    }

    return right.createdAt.localeCompare(left.createdAt);
  });
}

/**
 * Spring currently returns an offset-free LocalDateTime whose actual timezone
 * differs between production and local development. Show the calendar date
 * exactly as received instead of inventing an offset and shifting the day.
 */
export function formatServerLocalDate(localDateTime: string) {
  const dateKey = localDateTime.split('T')[0];

  return /^\d{4}-\d{2}-\d{2}$/.test(dateKey ?? '')
    ? formatShortDate(dateKey)
    : localDateTime;
}

export function getTodoMeta(todo: TodoResponse) {
  if (todo.sourceType === 'JOIN_MEMBER') {
    return '가입 정보에서 자동 생성';
  }

  if (todo.sourceType === 'SUGGESTION') {
    return '회원 요청에서 등록';
  }

  return todo.createdByMemberName
    ? `${todo.createdByMemberName} 등록`
    : '스텝 직접 등록';
}
