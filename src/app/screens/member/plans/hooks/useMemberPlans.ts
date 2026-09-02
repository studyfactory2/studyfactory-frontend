import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import {
  getCurrentSession,
  type SessionOwnerKey,
} from '../../../../core/session';
import { memberPlanQueryKeys } from '../../../../features/plans/plan-query-keys';
import {
  fetchMonthlyPlanGoal,
  fetchWeeklyPlan,
  saveMonthlyPlanGoal,
  saveWeeklyPlan,
  type MonthlyPlanGoalResponse,
  type WeeklyPlanItemRequest,
  type WeeklyPlanItemResponse,
  type WeeklyPlanResponse,
} from '../../../../features/plans/plans-api';
import { useToast } from '../../../../shared/ui';
import {
  DAY_LABELS,
  DAY_LONG_LABELS,
  MEMBER_PLAN_SAVED_EVENT,
  PLAN_ROWS,
  VISIBLE_PERIODS,
} from '../model/plan.constants';
import {
  addDays,
  formatFullDate,
  formatMonthLabel,
  formatShortDate,
  formatWeekRange,
  getCurrentRoutePeriodKeys,
  isSameDate,
  toDateKey,
} from '../model/plan.dates';
import {
  readStoredMonthlyDraft,
  readStoredWeeklyDraft,
  removeStoredMonthlyDraft,
  removeStoredMonthlyDraftIfRevision,
  removeStoredWeeklyDraft,
  removeStoredWeeklyDraftIfRevision,
  writeStoredMonthlyDraft,
  writeStoredWeeklyDraft,
} from '../model/plan.storage';
import type {
  EditablePlanItem,
  EditorCell,
  MemberPlanSavedDetail,
  MonthlySaveVariables,
  PlanItemUpdate,
  WeeklySaveVariables,
} from '../model/plan.types';
import { usePlanNavigation } from './usePlanNavigation';

export function useMemberPlans(
  memberId: number,
  queryOwnerKey: SessionOwnerKey,
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [recoveredWeeklyDraft] = useState(() =>
    readStoredWeeklyDraft(memberId),
  );
  const [recoveredMonthlyDraft] = useState(() =>
    readStoredMonthlyDraft(memberId),
  );
  const [weeklyGoal, setWeeklyGoal] = useState(
    recoveredWeeklyDraft?.goal ?? '',
  );
  const [items, setItems] = useState<EditablePlanItem[]>(
    recoveredWeeklyDraft?.items ?? [],
  );
  const [weeklyDirty, setWeeklyDirty] = useState(recoveredWeeklyDraft !== null);
  const [monthlyGoal, setMonthlyGoal] = useState(
    recoveredMonthlyDraft?.goal ?? '',
  );
  const [monthlyDirty, setMonthlyDirty] = useState(
    recoveredMonthlyDraft !== null,
  );
  const [editorCell, setEditorCell] = useState<EditorCell>(null);
  const [weeklyDraftKey, setWeeklyDraftKey] = useState<string | null>(
    recoveredWeeklyDraft?.weekStartKey ?? null,
  );
  const [weeklyDraftRevision, setWeeklyDraftRevision] = useState(
    () => recoveredWeeklyDraft?.revision ?? createDraftRevision(),
  );
  const [monthlyDraftKey, setMonthlyDraftKey] = useState<string | null>(
    recoveredMonthlyDraft?.monthKey ?? null,
  );
  const [monthlyDraftRevision, setMonthlyDraftRevision] = useState(
    () => recoveredMonthlyDraft?.revision ?? createDraftRevision(),
  );

  const weeklySaveMutation = useMutation({
    mutationFn: ({ memberId: requestMemberId, request }: WeeklySaveVariables) =>
      saveWeeklyPlan(request, requestMemberId),
    onError: (error: Error, variables) => {
      if (isCurrentOwner(variables.ownerKey)) {
        toast(error.message || '주간 계획을 저장하지 못했습니다.', 'error');
      }
    },
    onSuccess: (response, variables) => {
      if (response.memberId !== variables.memberId) {
        if (isCurrentOwner(variables.ownerKey)) {
          toast('저장된 회원 정보를 확인하지 못했습니다.', 'error');
        }
        return;
      }

      if (response.weekStartDate !== variables.request.weekStartDate) {
        if (isCurrentOwner(variables.ownerKey)) {
          toast('저장된 주간 계획의 날짜를 확인하지 못했습니다.', 'error');
        }
        return;
      }

      if (isCurrentOwner(variables.ownerKey)) {
        queryClient.setQueryData(
          memberPlanQueryKeys.week(variables.ownerKey, response.weekStartDate),
          response,
        );
      }

      removeStoredWeeklyDraftIfRevision(
        variables.memberId,
        response.weekStartDate,
        variables.draftRevision,
      );
      window.dispatchEvent(
        new CustomEvent<MemberPlanSavedDetail>(MEMBER_PLAN_SAVED_EVENT, {
          detail: {
            draftRevision: variables.draftRevision,
            kind: 'weekly',
            ownerKey: variables.ownerKey,
            response,
          },
        }),
      );

      if (isCurrentOwner(variables.ownerKey)) {
        toast('이번 주 계획을 저장했어요.', 'success');
      }
    },
  });
  const monthlySaveMutation = useMutation({
    mutationFn: ({
      memberId: requestMemberId,
      request,
    }: MonthlySaveVariables) => saveMonthlyPlanGoal(request, requestMemberId),
    onError: (error: Error, variables) => {
      if (isCurrentOwner(variables.ownerKey)) {
        toast(error.message || '월간 목표를 저장하지 못했습니다.', 'error');
      }
    },
    onSuccess: (response, variables) => {
      if (response.memberId !== variables.memberId) {
        if (isCurrentOwner(variables.ownerKey)) {
          toast('저장된 회원 정보를 확인하지 못했습니다.', 'error');
        }
        return;
      }

      if (response.month !== variables.request.month) {
        if (isCurrentOwner(variables.ownerKey)) {
          toast('저장된 월간 목표의 날짜를 확인하지 못했습니다.', 'error');
        }
        return;
      }

      if (isCurrentOwner(variables.ownerKey)) {
        queryClient.setQueryData(
          memberPlanQueryKeys.month(variables.ownerKey, response.month),
          response,
        );
      }

      removeStoredMonthlyDraftIfRevision(
        variables.memberId,
        response.month,
        variables.draftRevision,
      );
      window.dispatchEvent(
        new CustomEvent<MemberPlanSavedDetail>(MEMBER_PLAN_SAVED_EVENT, {
          detail: {
            draftRevision: variables.draftRevision,
            kind: 'monthly',
            ownerKey: variables.ownerKey,
            response,
          },
        }),
      );

      if (isCurrentOwner(variables.ownerKey)) {
        toast(
          `${formatMonthLabel(response.month)} 목표를 저장했어요.`,
          'success',
        );
      }
    },
  });

  const navigation = usePlanNavigation({
    monthlyDirty,
    monthlyDraftKey,
    monthlySaving: monthlySaveMutation.isPending,
    onDiscardMonthlyDraft: () => setMonthlyDirty(false),
    onDiscardMismatchedWeeklyDraft: () => {
      setWeeklyDirty(false);
      setEditorCell(null);
    },
    onDiscardWeeklyDraft: () => setWeeklyDirty(false),
    weeklyDirty,
    weeklyDraftKey,
    weeklySaving: weeklySaveMutation.isPending,
  });

  const weeklyPlanQuery = useQuery({
    queryFn: () => fetchWeeklyPlan(navigation.weekStartKey, memberId),
    queryKey: memberPlanQueryKeys.week(queryOwnerKey, navigation.weekStartKey),
  });
  const monthlyGoalQuery = useQuery({
    queryFn: () => fetchMonthlyPlanGoal(navigation.monthKey, memberId),
    queryKey: memberPlanQueryKeys.month(queryOwnerKey, navigation.monthKey),
  });
  const focusPlannerHeading = navigation.focusPlannerHeading;
  const hasRequestedPlannerFocus = navigation.hasRequestedPlannerFocus;

  useEffect(() => {
    if (!weeklyPlanQuery.data || weeklyDirty) {
      return;
    }

    hydrateWeeklyDraft(
      weeklyPlanQuery.data,
      setWeeklyGoal,
      setItems,
      setWeeklyDraftKey,
      setWeeklyDraftRevision,
    );
    // The query response deliberately becomes the baseline for this editable draft.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWeeklyDirty(false);
    setEditorCell(null);
  }, [weeklyDirty, weeklyPlanQuery.data]);

  useEffect(() => {
    if (!monthlyGoalQuery.data || monthlyDirty) {
      return;
    }

    hydrateMonthlyDraft(
      monthlyGoalQuery.data,
      setMonthlyGoal,
      setMonthlyDraftKey,
      setMonthlyDraftRevision,
    );
    // The query response deliberately becomes the baseline for this editable draft.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMonthlyDirty(false);
  }, [monthlyDirty, monthlyGoalQuery.data]);

  useEffect(() => {
    if (weeklyDirty && weeklyDraftKey) {
      writeStoredWeeklyDraft({
        goal: weeklyGoal,
        items,
        memberId,
        revision: weeklyDraftRevision,
        weekStartKey: weeklyDraftKey,
      });
      return;
    }

    removeStoredWeeklyDraft(memberId);
  }, [
    items,
    memberId,
    weeklyDirty,
    weeklyDraftKey,
    weeklyDraftRevision,
    weeklyGoal,
  ]);

  useEffect(() => {
    if (monthlyDirty && monthlyDraftKey) {
      writeStoredMonthlyDraft({
        goal: monthlyGoal,
        memberId,
        monthKey: monthlyDraftKey,
        revision: monthlyDraftRevision,
      });
      return;
    }

    removeStoredMonthlyDraft(memberId);
  }, [
    memberId,
    monthlyDirty,
    monthlyDraftKey,
    monthlyDraftRevision,
    monthlyGoal,
  ]);

  useEffect(() => {
    const reconcileSavedPlan = (event: Event) => {
      const detail = (event as CustomEvent<MemberPlanSavedDetail>).detail;

      if (!detail || detail.ownerKey !== queryOwnerKey) {
        return;
      }

      if (
        detail.kind === 'weekly' &&
        weeklyDirty &&
        detail.draftRevision === weeklyDraftRevision &&
        detail.response.weekStartDate === weeklyDraftKey
      ) {
        if (
          detail.response.weekStartDate ===
          getCurrentRoutePeriodKeys().weekStartKey
        ) {
          hydrateWeeklyDraft(
            detail.response,
            setWeeklyGoal,
            setItems,
            setWeeklyDraftKey,
            setWeeklyDraftRevision,
          );
        }
        setWeeklyDirty(false);
        setEditorCell(null);
        return;
      }

      if (
        detail.kind === 'monthly' &&
        monthlyDirty &&
        detail.draftRevision === monthlyDraftRevision &&
        detail.response.month === monthlyDraftKey
      ) {
        if (detail.response.month === getCurrentRoutePeriodKeys().monthKey) {
          hydrateMonthlyDraft(
            detail.response,
            setMonthlyGoal,
            setMonthlyDraftKey,
            setMonthlyDraftRevision,
          );
        }
        setMonthlyDirty(false);
      }
    };

    window.addEventListener(MEMBER_PLAN_SAVED_EVENT, reconcileSavedPlan);
    return () =>
      window.removeEventListener(MEMBER_PLAN_SAVED_EVENT, reconcileSavedPlan);
  }, [
    monthlyDirty,
    monthlyDraftKey,
    monthlyDraftRevision,
    queryOwnerKey,
    weeklyDirty,
    weeklyDraftKey,
    weeklyDraftRevision,
  ]);

  useEffect(() => {
    if (!weeklyDirty && !monthlyDirty) {
      return;
    }

    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', warnBeforeLeaving);
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving);
  }, [monthlyDirty, weeklyDirty]);

  useEffect(() => {
    if (!weeklyDirty && !monthlyDirty) {
      return;
    }

    const warnBeforeInternalNavigation = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        !(event.target instanceof Element)
      ) {
        return;
      }

      const link = event.target.closest<HTMLAnchorElement>('a[href]');
      const logoutButton = event.target.closest<HTMLButtonElement>(
        'button[aria-label="로그아웃"]',
      );

      if (!link && !logoutButton) {
        return;
      }

      if (link) {
        if (link.target === '_blank' || link.hasAttribute('download')) {
          return;
        }

        const destination = new URL(link.href, window.location.href);
        const current = new URL(window.location.href);

        if (
          destination.origin !== current.origin ||
          (destination.pathname === current.pathname &&
            destination.search === current.search)
        ) {
          return;
        }
      }

      if (
        !window.confirm(
          '저장하지 않은 변경사항이 있어요. 저장하지 않고 이동할까요?',
        )
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };

    document.addEventListener('click', warnBeforeInternalNavigation, true);
    return () =>
      document.removeEventListener('click', warnBeforeInternalNavigation, true);
  }, [monthlyDirty, weeklyDirty]);

  useEffect(() => {
    if (
      !hasRequestedPlannerFocus() ||
      !weeklyPlanQuery.isSuccess ||
      navigation.weeklyRouteMismatch ||
      navigation.monthlyRouteMismatch
    ) {
      return;
    }

    const frame = window.requestAnimationFrame(focusPlannerHeading);
    return () => window.cancelAnimationFrame(frame);
  }, [
    focusPlannerHeading,
    hasRequestedPlannerFocus,
    navigation.monthKey,
    navigation.monthlyRouteMismatch,
    navigation.plannerHeadingRef,
    navigation.weekStartKey,
    navigation.weeklyRouteMismatch,
    weeklyPlanQuery.isSuccess,
  ]);

  const visibleItems = useMemo(
    () =>
      items.filter(
        (item) =>
          item.dayIndex >= 0 &&
          item.dayIndex <= 6 &&
          VISIBLE_PERIODS.has(item.periodIndex) &&
          item.content.trim(),
      ),
    [items],
  );
  const completedCount = visibleItems.filter((item) => item.done).length;
  const progress = visibleItems.length
    ? Math.round((completedCount / visibleItems.length) * 100)
    : 0;
  const selectedDayItems = visibleItems.filter(
    (item) => item.dayIndex === navigation.selectedDayIndex,
  );
  const selectedDayCompleted = selectedDayItems.filter(
    (item) => item.done,
  ).length;
  const currentEditorRow = editorCell
    ? (PLAN_ROWS.find((row) => row.periodIndex === editorCell.periodIndex) ??
      null)
    : null;
  const currentEditorItems = editorCell
    ? getCellItems(items, editorCell.periodIndex, editorCell.dayIndex)
    : [];

  const markWeeklyDraftChanged = () => {
    setWeeklyDraftRevision(createDraftRevision());
    setWeeklyDirty(true);
  };

  const updateWeeklyGoal = (value: string) => {
    setWeeklyGoal(value);
    markWeeklyDraftChanged();
  };

  const updateItem = (draftId: string, update: PlanItemUpdate) => {
    setItems((current) =>
      current.map((item) =>
        item.draftId === draftId ? { ...item, ...update } : item,
      ),
    );
    markWeeklyDraftChanged();
  };

  const addItem = (periodIndex: number, dayIndex: number) => {
    setItems((current) => [
      ...current,
      {
        content: '',
        dayIndex,
        done: false,
        draftId: createDraftId(),
        id: null,
        periodIndex,
        sortOrder: getCellItems(current, periodIndex, dayIndex).length,
      },
    ]);
    markWeeklyDraftChanged();
  };

  const deleteItem = (draftId: string) => {
    setItems((current) => current.filter((item) => item.draftId !== draftId));
    markWeeklyDraftChanged();
  };

  const closeEditor = () => {
    setItems((current) =>
      current.filter((item) => item.id !== null || item.content.trim()),
    );
    setEditorCell(null);
  };

  const saveWeek = () => {
    weeklySaveMutation.mutate({
      draftRevision: weeklyDraftRevision,
      memberId,
      ownerKey: queryOwnerKey,
      request: {
        goal: weeklyGoal.trim(),
        items: toSaveItems(items),
        weekStartDate: weeklyDraftKey ?? navigation.weekStartKey,
      },
    });
  };

  const monthlyLabel = formatMonthLabel(navigation.monthKey);

  return {
    conflict: navigation.weeklyRouteMismatch || navigation.monthlyRouteMismatch,
    conflictProps: {
      onDiscard: navigation.discardMismatchedDraft,
      onRestore: navigation.restoreDraftRoute,
    },
    editorProps: {
      cell: editorCell,
      dateLabel: editorCell
        ? formatFullDate(addDays(navigation.weekStart, editorCell.dayIndex))
        : '',
      dayLabel: editorCell ? DAY_LONG_LABELS[editorCell.dayIndex] : '',
      items: currentEditorItems,
      onAdd: (cell: Exclude<EditorCell, null>) =>
        addItem(cell.periodIndex, cell.dayIndex),
      onClose: closeEditor,
      onDelete: deleteItem,
      onUpdate: updateItem,
      row: currentEditorRow,
    },
    errorMessage: weeklyPlanQuery.isError
      ? weeklyPlanQuery.error.message
      : null,
    loading: weeklyPlanQuery.isPending,
    onRetry: () => {
      navigation.requestPlannerFocus();
      void weeklyPlanQuery.refetch();
    },
    overviewProps: {
      completedCount,
      monthlyDirty,
      monthlyGoal,
      monthlyLabel,
      monthlyLoadError: monthlyGoalQuery.isError,
      monthlyLoading: monthlyGoalQuery.isPending,
      monthlySaving: monthlySaveMutation.isPending,
      onMonthlyGoalChange: (value: string) => {
        setMonthlyGoal(value);
        setMonthlyDraftRevision(createDraftRevision());
        setMonthlyDirty(true);
      },
      onMonthlyRetry: () => void monthlyGoalQuery.refetch(),
      onMonthlySave: () =>
        monthlySaveMutation.mutate({
          draftRevision: monthlyDraftRevision,
          memberId,
          ownerKey: queryOwnerKey,
          request: {
            goal: monthlyGoal.trim(),
            month: monthlyDraftKey ?? navigation.monthKey,
          },
        }),
      onWeeklyGoalChange: updateWeeklyGoal,
      progress,
      totalCount: visibleItems.length,
      weekRangeLabel: formatWeekRange(navigation.weekStart),
      weeklyDirty,
      weeklyGoal,
      weeklySaving: weeklySaveMutation.isPending,
    },
    plannerProps: {
      completedCount,
      daySelectionDisabled: monthlySaveMutation.isPending,
      days: DAY_LABELS.map((label, dayIndex) => {
        const date = addDays(navigation.weekStart, dayIndex);
        return {
          dayIndex,
          dayOfMonth: date.getDate(),
          fullDateLabel: formatFullDate(date),
          isToday: isSameDate(date, navigation.today),
          key: toDateKey(date),
          label,
          longLabel: DAY_LONG_LABELS[dayIndex],
          shortDateLabel: formatShortDate(date),
        };
      }),
      editingDisabled: weeklySaveMutation.isPending,
      getItemsForCell: (periodIndex: number, dayIndex: number) =>
        getCellItems(items, periodIndex, dayIndex),
      headingRef: navigation.plannerHeadingRef,
      navigationDisabled:
        weeklySaveMutation.isPending || monthlySaveMutation.isPending,
      onMoveToToday: navigation.moveToToday,
      onMoveWeek: navigation.moveWeek,
      onOpenEditor: setEditorCell,
      onSelectDay: navigation.selectDay,
      rows: PLAN_ROWS,
      selectedDateLabel: formatFullDate(navigation.selectedDate),
      selectedDayCompleted,
      selectedDayIndex: navigation.selectedDayIndex,
      selectedDayTotal: selectedDayItems.length,
      totalCount: visibleItems.length,
      weekRangeLabel: formatWeekRange(navigation.weekStart),
    },
    saveBarProps: {
      loading: weeklySaveMutation.isPending,
      onSave: saveWeek,
    },
    showSaveBar: weeklyDirty,
  };
}

let draftSequence = 0;

function hydrateWeeklyDraft(
  response: WeeklyPlanResponse,
  setGoal: (goal: string) => void,
  setItems: (items: EditablePlanItem[]) => void,
  setDraftKey: (key: string) => void,
  setDraftRevision: (revision: string) => void,
) {
  setGoal(response.goal ?? '');
  setItems(response.items.map(toEditableItem));
  setDraftKey(response.weekStartDate);
  setDraftRevision(createDraftRevision());
}

function hydrateMonthlyDraft(
  response: MonthlyPlanGoalResponse,
  setGoal: (goal: string) => void,
  setDraftKey: (key: string) => void,
  setDraftRevision: (revision: string) => void,
) {
  setGoal(response.goal ?? '');
  setDraftKey(response.month);
  setDraftRevision(createDraftRevision());
}

function toEditableItem(item: WeeklyPlanItemResponse): EditablePlanItem {
  return {
    ...item,
    draftId: `server-${item.id}`,
  };
}

function toSaveItems(items: EditablePlanItem[]): WeeklyPlanItemRequest[] {
  const nextSortOrder = new Map<string, number>();

  return items
    .filter((item) => item.content.trim())
    .map((item) => {
      const key = `${item.periodIndex}-${item.dayIndex}`;
      const sortOrder = nextSortOrder.get(key) ?? 0;
      nextSortOrder.set(key, sortOrder + 1);

      return {
        content: item.content.trim(),
        dayIndex: item.dayIndex,
        done: item.done,
        periodIndex: item.periodIndex,
        sortOrder,
      };
    });
}

function getCellItems(
  items: EditablePlanItem[],
  periodIndex: number,
  dayIndex: number,
) {
  return items
    .filter(
      (item) => item.periodIndex === periodIndex && item.dayIndex === dayIndex,
    )
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

function createDraftId() {
  draftSequence += 1;
  return `draft-${Date.now()}-${draftSequence}`;
}

function createDraftRevision() {
  draftSequence += 1;
  return `revision-${Date.now()}-${draftSequence}`;
}

function isCurrentOwner(ownerKey: SessionOwnerKey) {
  return getCurrentSession().ownerKey === ownerKey;
}
