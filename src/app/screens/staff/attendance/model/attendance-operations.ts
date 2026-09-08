import type { DailySideDishResponse } from '../../../../features/side-dishes/side-dishes-api';
import type { SuggestionResponse } from '../../../../features/suggestions/suggestions-api';
import type { TodoResponse } from '../../../../features/todos/todos-api';
import { formatShortDate } from '../../../../shared/lib/seoul-date';

const priceFormatter = new Intl.NumberFormat('ko-KR');

export const ATTENDANCE_SUGGESTION_LABELS: Record<
  SuggestionResponse['category'],
  string
> = {
  COUNSELING: '상담',
  GENERAL: '일반',
  STUDY: '학습',
  SUPPLIES: '비품',
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

/** Oldest first: the request waiting longest should never be buried. */
export function buildAttendanceSuggestionRows(
  rows: readonly SuggestionResponse[],
) {
  return rows
    .filter((suggestion) => !suggestion.isResolved)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
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
  const [menuName] = order.items.split(':');
  const trimmed = (menuName ?? '').trim();

  return trimmed.length > 0 ? trimmed : order.items.trim();
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
    : '스텝 직접 등록';
}

export function formatAttendanceRequestDate(localDateTime: string) {
  const dateKey = localDateTime.split('T')[0];

  return /^\d{4}-\d{2}-\d{2}$/.test(dateKey ?? '')
    ? formatShortDate(dateKey)
    : localDateTime;
}

export function formatAttendanceWon(price: number) {
  return `${priceFormatter.format(price)}원`;
}
