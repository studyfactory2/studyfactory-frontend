import { useState } from 'react';
import type { useManagerOperations } from '../hooks/useManagerOperations';
import {
  SUGGESTION_CATEGORY_LABELS,
  formatAttendanceRequestDate,
  formatAttendanceWon,
  getAttendanceTodoMeta,
  getSideDishMenuLabel,
} from '../model/manager-operations';
import {
  ManagerOperationsCockpit,
  type ManagerOperationsSectionData,
  type ManagerOperationsSectionId,
} from './ManagerOperationsCockpit';

export function ManagerOperationsOverview({
  initialSection = null,
  onManageRequests,
  onManageTasks,
  operations,
}: {
  initialSection?: ManagerOperationsSectionId | null;
  onManageRequests?: () => void;
  onManageTasks?: () => void;
  operations: ReturnType<typeof useManagerOperations>;
}) {
  const [activeSection, setActiveSection] =
    useState<ManagerOperationsSectionId | null>(initialSection);

  const todayTasks: ManagerOperationsSectionData = {
    actions: onManageTasks
      ? [
          {
            id: 'manager-operations-manage-tasks',
            label: '전체 관리',
            onClick: onManageTasks,
            tone: 'primary',
          },
        ]
      : undefined,
    count: operations.todos.today.ready
      ? operations.todos.today.active.length
      : null,
    countLabel: '건',
    emptyMessage: '오늘 남은 업무가 없어요.',
    errorMessage: operations.todos.today.errorMessage,
    loading: operations.todos.today.loading,
    previews: operations.todos.today.active.map((todo) => ({
      action: {
        ariaLabel: `${todo.content} 완료`,
        disabled: operations.todos.saving,
        label: '완료',
        loading: operations.todos.completingId === todo.id,
        onClick: () =>
          operations.todos.onToggle(todo, () =>
            focusManagerOperationsTrigger('tasks'),
          ),
        tone: 'positive',
      },
      badge: todo.priority === 'URGENT' ? '긴급' : undefined,
      id: todo.id,
      meta: getAttendanceTodoMeta(todo),
      title: todo.content,
      tone: todo.priority === 'URGENT' ? 'urgent' : 'neutral',
    })),
    summary:
      operations.todos.today.ready &&
      operations.todos.today.active.some((todo) => todo.priority === 'URGENT')
        ? `긴급 ${operations.todos.today.active.filter((todo) => todo.priority === 'URGENT').length}건`
        : operations.todos.today.ready
          ? operations.todos.today.active.length > 0
            ? `남은 업무 ${operations.todos.today.active.length}건`
            : '모두 완료'
          : undefined,
  };

  const memberRequests: ManagerOperationsSectionData = {
    actions: onManageRequests
      ? [
          {
            id: 'manager-operations-manage-member-requests',
            label: '전체 관리',
            onClick: onManageRequests,
            tone: 'primary',
          },
        ]
      : undefined,
    count: operations.suggestions.ready
      ? operations.suggestions.open.length
      : null,
    countLabel: '건',
    emptyMessage: '처리할 회원 요청이 없어요.',
    errorMessage: operations.suggestions.errorMessage,
    loading: operations.suggestions.loading,
    previews: operations.suggestions.open.map((suggestion) => ({
      action: {
        ariaLabel: `${suggestion.memberName ?? '회원'} 요청 처리 완료`,
        label: '처리 완료',
        loading: operations.suggestions.savingIds.has(suggestion.id),
        onClick: () =>
          operations.suggestions.onToggle(suggestion, () =>
            focusManagerOperationsTrigger('member-requests'),
          ),
        tone: 'primary',
      },
      badge: SUGGESTION_CATEGORY_LABELS[suggestion.category],
      description: suggestion.content,
      id: suggestion.id,
      meta: formatAttendanceRequestDate(suggestion.createdAt),
      title: suggestion.memberName ?? `회원 ${suggestion.memberId}`,
      tone: 'special',
    })),
    summary: operations.suggestions.ready
      ? operations.suggestions.open.length > 0
        ? `미처리 ${operations.suggestions.open.length}건`
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
  const memberSideDishOrders: ManagerOperationsSectionData = {
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
          ? `미배정 · ${order.memberName}`
          : `${order.seatNumber}번 · ${order.memberName}`,
      tone: mealLabel === '점심' ? 'positive' : 'special',
    })),
    summary: operations.meals.ready
      ? `점심 ${operations.meals.lunch.memberCount}명 · 저녁 ${operations.meals.dinner.memberCount}명`
      : undefined,
  };

  return (
    <ManagerOperationsCockpit
      activeSection={activeSection}
      memberRequests={memberRequests}
      memberSideDishOrders={memberSideDishOrders}
      onRetry={(section) => {
        if (section === 'tasks') {
          operations.todos.today.onRetry();
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

function focusManagerOperationsTrigger(section: ManagerOperationsSectionId) {
  window.requestAnimationFrame(() => {
    document.getElementById(`manager-operations-trigger-${section}`)?.focus();
  });
}
