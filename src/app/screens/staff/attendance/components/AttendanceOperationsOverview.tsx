import { useState } from 'react';
import type { useAttendanceOperations } from '../hooks/useAttendanceOperations';
import {
  ATTENDANCE_SUGGESTION_LABELS,
  formatAttendanceRequestDate,
  formatAttendanceWon,
  getAttendanceTodoMeta,
  getSideDishMenuLabel,
} from '../model/attendance-operations';
import {
  AttendanceOperationsCockpit,
  type AttendanceCockpitSectionData,
  type AttendanceCockpitSectionId,
} from './AttendanceOperationsCockpit';

export function AttendanceOperationsOverview({
  initialSection = null,
  operations,
}: {
  initialSection?: AttendanceCockpitSectionId | null;
  operations: ReturnType<typeof useAttendanceOperations>;
}) {
  const [activeSection, setActiveSection] =
    useState<AttendanceCockpitSectionId | null>(initialSection);

  const todayTasks: AttendanceCockpitSectionData = {
    count: operations.todos.ready ? operations.todos.rows.length : null,
    countLabel: '건',
    emptyMessage: '오늘 남은 업무가 없어요.',
    errorMessage: operations.todos.errorMessage,
    loading: operations.todos.loading,
    previews: operations.todos.rows.map((todo) => ({
      action: {
        ariaLabel: `${todo.content} 완료`,
        label: '완료',
        loading: operations.todos.pendingIds.has(todo.id),
        onClick: () =>
          operations.todos.onComplete(todo, () => focusCockpitTrigger('tasks')),
        tone: 'positive',
      },
      badge: todo.priority === 'URGENT' ? '긴급' : undefined,
      id: todo.id,
      meta: getAttendanceTodoMeta(todo),
      title: todo.content,
      tone: todo.priority === 'URGENT' ? 'urgent' : 'neutral',
    })),
    summary:
      operations.todos.ready && operations.todos.urgentCount > 0
        ? `긴급 ${operations.todos.urgentCount}건`
        : operations.todos.ready
          ? operations.todos.rows.length > 0
            ? `남은 업무 ${operations.todos.rows.length}건`
            : '모두 완료'
          : undefined,
  };

  const memberRequests: AttendanceCockpitSectionData = {
    count: operations.suggestions.ready
      ? operations.suggestions.rows.length
      : null,
    countLabel: '건',
    emptyMessage: '처리할 회원 요청이 없어요.',
    errorMessage: operations.suggestions.errorMessage,
    loading: operations.suggestions.loading,
    previews: operations.suggestions.rows.map((suggestion) => ({
      action: {
        ariaLabel: `${suggestion.memberName ?? '회원'} 요청 처리 완료`,
        label: '처리 완료',
        loading: operations.suggestions.pendingIds.has(suggestion.id),
        onClick: () =>
          operations.suggestions.onResolve(suggestion, () =>
            focusCockpitTrigger('member-requests'),
          ),
        tone: 'primary',
      },
      badge: ATTENDANCE_SUGGESTION_LABELS[suggestion.category],
      description: suggestion.content,
      id: suggestion.id,
      meta: formatAttendanceRequestDate(suggestion.createdAt),
      title: suggestion.memberName ?? `회원 ${suggestion.memberId}`,
      tone: 'special',
    })),
    summary: operations.suggestions.ready
      ? operations.suggestions.rows.length > 0
        ? `미처리 ${operations.suggestions.rows.length}건`
        : '미처리 없음'
      : undefined,
  };

  const mealOrders = [
    ...operations.meals.lunch.orders.map((order) => ({
      mealLabel: '점심',
      order,
    })),
    ...operations.meals.dinner.orders.map((order) => ({
      mealLabel: '저녁',
      order,
    })),
  ];
  const memberSideDishOrders: AttendanceCockpitSectionData = {
    count: operations.meals.ready ? mealOrders.length : null,
    countLabel: '건',
    emptyMessage: '오늘 접수된 회원 반찬 신청이 없어요.',
    errorMessage: operations.meals.errorMessage,
    loading: operations.meals.loading,
    previews: mealOrders.map(({ mealLabel, order }) => ({
      badge: mealLabel,
      description: getSideDishMenuLabel(order),
      id: `${mealLabel}-${order.id}`,
      meta: formatAttendanceWon(order.totalPrice),
      title:
        order.seatNumber === null
          ? order.memberName
          : `${order.seatNumber}번 · ${order.memberName}`,
      tone: mealLabel === '점심' ? 'positive' : 'special',
    })),
    summary: operations.meals.ready
      ? `점심 ${operations.meals.lunch.memberCount}명 · 저녁 ${operations.meals.dinner.memberCount}명`
      : undefined,
  };

  return (
    <AttendanceOperationsCockpit
      activeSection={activeSection}
      memberRequests={memberRequests}
      memberSideDishOrders={memberSideDishOrders}
      onRetry={(section) => {
        if (section === 'tasks') {
          operations.todos.onRetry();
        } else if (section === 'member-requests') {
          operations.suggestions.onRetry();
        } else {
          operations.meals.onRetry();
        }
      }}
      onSectionChange={setActiveSection}
      todayTasks={todayTasks}
    />
  );
}

function focusCockpitTrigger(section: AttendanceCockpitSectionId) {
  window.requestAnimationFrame(() => {
    document.getElementById(`attendance-cockpit-trigger-${section}`)?.focus();
  });
}
