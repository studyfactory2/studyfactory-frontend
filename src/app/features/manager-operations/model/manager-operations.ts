import type { DailySideDishResponse } from '../../side-dishes/side-dishes-api';
import type {
  SuggestionCategory,
  SuggestionResponse,
} from '../../suggestions/suggestions-api';
import type { TodoResponse } from '../../todos/todos-api';
import { formatShortDate } from '../../../shared/lib/seoul-date';

const priceFormatter = new Intl.NumberFormat('ko-KR');

export const SUGGESTION_CATEGORY_LABELS: Record<SuggestionCategory, string> = {
  COUNSELING: '상담',
  GENERAL: '일반',
  STUDY: '학습',
  SUPPLIES: '비품',
};

export const TODO_SOURCE_LABELS: Record<TodoResponse['sourceType'], string> = {
  JOIN_MEMBER: '신규 회원',
  MANUAL: '직접 등록',
  SUGGESTION: '회원 요청',
};

export type AttendanceMealGroup = {
  memberCount: number;
  orders: DailySideDishResponse[];
};

export function buildAttendanceTodoRows(rows: readonly TodoResponse[]) {
  return rows
    .filter((todo) => !todo.completed)
    .sort((left, right) => {
      if (left.priority !== right.priority) {
        return left.priority === 'URGENT' ? -1 : 1;
      }

      return left.createdAt.localeCompare(right.createdAt);
    });
}

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

/** Oldest first: the request waiting longest should never be buried. */
export function buildAttendanceSuggestionRows(
  rows: readonly SuggestionResponse[],
) {
  return rows
    .filter((suggestion) => !suggestion.isResolved)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export function orderSuggestions(rows: readonly SuggestionResponse[]) {
  return [...rows].sort((left, right) => {
    if (left.isResolved !== right.isResolved) {
      return left.isResolved ? 1 : -1;
    }

    return left.isResolved
      ? right.createdAt.localeCompare(left.createdAt)
      : left.createdAt.localeCompare(right.createdAt);
  });
}

export function buildAttendanceMealGroup(
  rows: readonly DailySideDishResponse[],
  mealType: DailySideDishResponse['mealType'],
): AttendanceMealGroup {
  const orders = rows
    .filter((order) => order.mealType === mealType)
    .sort(
      (left, right) =>
        (left.seatNumber ?? Number.MAX_SAFE_INTEGER) -
          (right.seatNumber ?? Number.MAX_SAFE_INTEGER) ||
        left.memberName.localeCompare(right.memberName, 'ko'),
    );

  return {
    memberCount: new Set(orders.map((order) => order.memberId)).size,
    orders,
  };
}

export function getSideDishMenuLabel(order: DailySideDishResponse) {
  const menuNames = order.items
    .split(/[\n,]+/)
    .map((item) => (item.split(':')[0] ?? '').trim())
    .filter((item) => item.length > 0);

  if (menuNames.length === 0) {
    return order.items.trim();
  }

  return menuNames.length === 1
    ? menuNames[0]
    : `${menuNames[0]} 외 ${menuNames.length - 1}개`;
}

export function getAttendanceTodoMeta(todo: TodoResponse) {
  if (todo.sourceType === 'JOIN_MEMBER') {
    return '가입 정보에서 자동 생성';
  }

  if (todo.sourceType === 'SUGGESTION') {
    return '회원 요청에서 등록';
  }

  return todo.createdByMemberName
    ? `${todo.createdByMemberName} 등록`
    : '운영자 직접 등록';
}

export const getTodoMeta = getAttendanceTodoMeta;

export function formatAttendanceRequestDate(localDateTime: string) {
  const dateKey = localDateTime.split('T')[0];

  return /^\d{4}-\d{2}-\d{2}$/.test(dateKey ?? '')
    ? formatShortDate(dateKey)
    : localDateTime;
}

/** Preserve the server's calendar day; its LocalDateTime has no offset. */
export const formatServerLocalDate = formatAttendanceRequestDate;

export function formatAttendanceWon(price: number) {
  return `${priceFormatter.format(price)}원`;
}
