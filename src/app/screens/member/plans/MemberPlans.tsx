import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  fetchMonthlyPlanGoal,
  fetchWeeklyPlan,
  saveMonthlyPlanGoal,
  saveWeeklyPlan,
} from '../../../api/member-plans-api';
import { decodeAccessToken } from '../../../auth/jwt';
import { useSession } from '../../../auth/session';
import { useToast } from '../../../components/ui';
import { PlanEditorModal } from './components/PlanEditorModal';
import { PlanGoals } from './components/PlanGoals';
import {
  DraftRouteConflict,
  PlanErrorState,
  PlanHero,
  PlanLoadingState,
  PlanSaveBar,
} from './components/PlanPrimitives';
import { WeeklyPlanner } from './components/WeeklyPlanner';
import {
  DAY_LABELS,
  DAY_LONG_LABELS,
  MEMBER_PLAN_SAVED_EVENT,
  PLAN_ROWS,
  VISIBLE_PERIODS,
} from './plan-constants';
import {
  addDays,
  daysBetween,
  formatFullDate,
  formatMonthLabel,
  formatShortDate,
  formatWeekRange,
  getCurrentRoutePeriodKeys,
  getMonday,
  isSameDate,
  parseDateKey,
  resolveSelectedDay,
  resolveWeekStart,
  startOfDay,
  toDateKey,
  toMonthKey,
} from './plan-date-utils';
import {
  getMemberQueryOwnerKey,
  readStoredMonthlyDraft,
  readStoredWeeklyDraft,
  removeStoredMonthlyDraft,
  removeStoredMonthlyDraftIfRevision,
  removeStoredWeeklyDraft,
  removeStoredWeeklyDraftIfRevision,
  writeStoredMonthlyDraft,
  writeStoredWeeklyDraft,
} from './plan-draft-storage';
import {
  createDraftId,
  createDraftRevision,
  getCellItems,
  hydrateMonthlyDraft,
  hydrateWeeklyDraft,
  toSaveItems,
} from './plan-item-utils';
import type {
  EditablePlanItem,
  EditorCell,
  MemberPlanSavedDetail,
  MonthlySaveVariables,
  WeeklySaveVariables,
} from './plan-types';
import './MemberPlans.css';

export function MemberPlans() {
  const session = useSession();
  const memberId = session.accessToken
    ? decodeAccessToken(session.accessToken).memberId
    : null;
  const queryOwnerKey = getMemberQueryOwnerKey(memberId, session.accessToken);

  return (
    <MemberPlansWorkspace
      key={queryOwnerKey}
      memberId={memberId}
      queryOwnerKey={queryOwnerKey}
    />
  );
}

function MemberPlansWorkspace({
  memberId,
  queryOwnerKey,
}: {
  memberId: number | null;
  queryOwnerKey: string;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [today, setToday] = useState(() => startOfDay(new Date()));
  const weekStart = resolveWeekStart(searchParams.get('week'), today);
  const weekStartKey = toDateKey(weekStart);
  const selectedDayIndex = resolveSelectedDay(
    searchParams.get('day'),
    weekStart,
    today,
  );
  const selectedDate = addDays(weekStart, selectedDayIndex);
  const monthKey = toMonthKey(selectedDate);
  const weekDays = DAY_LABELS.map((label, index) => ({
    date: addDays(weekStart, index),
    label,
  }));

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
  const plannerHeadingRef = useRef<HTMLHeadingElement>(null);
  const focusPlannerWhenReadyRef = useRef(false);
  const previousWeekKeyRef = useRef(weekStartKey);

  const weeklyPlanQuery = useQuery({
    queryFn: () => fetchWeeklyPlan(weekStartKey, memberId),
    queryKey: ['member', queryOwnerKey, 'weekly-plan', weekStartKey],
  });
  const monthlyGoalQuery = useQuery({
    queryFn: () => fetchMonthlyPlanGoal(monthKey, memberId),
    queryKey: ['member', queryOwnerKey, 'monthly-plan-goal', monthKey],
  });

  useEffect(() => {
    const nextMidnight = addDays(today, 1).getTime();
    const timeout = window.setTimeout(
      () => setToday(startOfDay(new Date())),
      Math.max(1_000, nextMidnight - Date.now() + 250),
    );

    return () => window.clearTimeout(timeout);
  }, [today]);

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
    if (weeklyDirty && weeklyDraftKey && memberId !== null) {
      writeStoredWeeklyDraft({
        goal: weeklyGoal,
        items,
        memberId,
        revision: weeklyDraftRevision,
        weekStartKey: weeklyDraftKey,
      });
      return;
    }

    if (memberId !== null) {
      removeStoredWeeklyDraft(memberId);
    }
  }, [
    items,
    memberId,
    weeklyDirty,
    weeklyDraftKey,
    weeklyDraftRevision,
    weeklyGoal,
  ]);

  useEffect(() => {
    if (monthlyDirty && monthlyDraftKey && memberId !== null) {
      writeStoredMonthlyDraft({
        goal: monthlyGoal,
        memberId,
        monthKey: monthlyDraftKey,
        revision: monthlyDraftRevision,
      });
      return;
    }

    if (memberId !== null) {
      removeStoredMonthlyDraft(memberId);
    }
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

  const weeklySaveMutation = useMutation({
    mutationFn: ({ memberId, request }: WeeklySaveVariables) =>
      saveWeeklyPlan(request, memberId),
    onError: (error: Error, variables) => {
      if (variables.ownerKey === queryOwnerKey) {
        toast(error.message || '주간 계획을 저장하지 못했습니다.', 'error');
      }
    },
    onSuccess: (response, variables) => {
      if (
        variables.memberId !== null &&
        response.memberId !== variables.memberId
      ) {
        if (variables.ownerKey === queryOwnerKey) {
          toast('저장된 회원 정보를 확인하지 못했습니다.', 'error');
        }
        return;
      }

      if (response.weekStartDate !== variables.request.weekStartDate) {
        if (variables.ownerKey === queryOwnerKey) {
          toast('저장된 주간 계획의 날짜를 확인하지 못했습니다.', 'error');
        }
        return;
      }

      queryClient.setQueryData(
        ['member', variables.ownerKey, 'weekly-plan', response.weekStartDate],
        response,
      );

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

      if (variables.ownerKey === queryOwnerKey) {
        toast('이번 주 계획을 저장했어요.', 'success');
      }
    },
  });
  const monthlySaveMutation = useMutation({
    mutationFn: ({ memberId, request }: MonthlySaveVariables) =>
      saveMonthlyPlanGoal(request, memberId),
    onError: (error: Error, variables) => {
      if (variables.ownerKey === queryOwnerKey) {
        toast(error.message || '월간 목표를 저장하지 못했습니다.', 'error');
      }
    },
    onSuccess: (response, variables) => {
      if (
        variables.memberId !== null &&
        response.memberId !== variables.memberId
      ) {
        if (variables.ownerKey === queryOwnerKey) {
          toast('저장된 회원 정보를 확인하지 못했습니다.', 'error');
        }
        return;
      }

      if (response.month !== variables.request.month) {
        if (variables.ownerKey === queryOwnerKey) {
          toast('저장된 월간 목표의 날짜를 확인하지 못했습니다.', 'error');
        }
        return;
      }

      queryClient.setQueryData(
        ['member', variables.ownerKey, 'monthly-plan-goal', response.month],
        response,
      );

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

      if (variables.ownerKey === queryOwnerKey) {
        toast(
          `${formatMonthLabel(response.month)} 목표를 저장했어요.`,
          'success',
        );
      }
    },
  });

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
    (item) => item.dayIndex === selectedDayIndex,
  );
  const selectedDayCompleted = selectedDayItems.filter(
    (item) => item.done,
  ).length;
  const weeklyRouteMismatch = Boolean(
    weeklyDirty && weeklyDraftKey && weeklyDraftKey !== weekStartKey,
  );
  const monthlyRouteMismatch = Boolean(
    monthlyDirty && monthlyDraftKey && monthlyDraftKey !== monthKey,
  );
  const currentEditorRow = editorCell
    ? (PLAN_ROWS.find((row) => row.periodIndex === editorCell.periodIndex) ??
      null)
    : null;
  const currentEditorItems = editorCell
    ? getCellItems(items, editorCell.periodIndex, editorCell.dayIndex)
    : [];

  useEffect(() => {
    if (previousWeekKeyRef.current !== weekStartKey) {
      previousWeekKeyRef.current = weekStartKey;
      focusPlannerWhenReadyRef.current = true;
    }
  }, [weekStartKey]);

  useEffect(() => {
    if (
      !focusPlannerWhenReadyRef.current ||
      !weeklyPlanQuery.isSuccess ||
      weeklyRouteMismatch ||
      monthlyRouteMismatch
    ) {
      return;
    }

    focusPlannerWhenReadyRef.current = false;
    const frame = window.requestAnimationFrame(() =>
      plannerHeadingRef.current?.focus(),
    );
    return () => window.cancelAnimationFrame(frame);
  }, [
    monthKey,
    monthlyRouteMismatch,
    weekStartKey,
    weeklyPlanQuery.isSuccess,
    weeklyRouteMismatch,
  ]);

  const setRouteDate = (
    nextWeekStart: Date,
    nextDayIndex: number,
    replace = false,
  ) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('week', toDateKey(nextWeekStart));
    nextParams.set('day', String(nextDayIndex));
    setSearchParams(nextParams, { replace });
  };

  const confirmPeriodDiscard = (nextMonthKey: string) => {
    const discardsWeeklyDraft = weeklyDirty;
    const discardsMonthlyDraft = monthlyDirty && nextMonthKey !== monthKey;

    if (!discardsWeeklyDraft && !discardsMonthlyDraft) {
      return true;
    }

    const draftLabel =
      discardsWeeklyDraft && discardsMonthlyDraft
        ? '주간 계획과 월간 목표'
        : discardsWeeklyDraft
          ? '주간 계획'
          : '월간 목표';

    return window.confirm(
      `저장하지 않은 ${draftLabel}가 있어요. 저장하지 않고 이동할까요?`,
    );
  };

  const confirmMonthlyGoalDiscard = () =>
    !monthlyDirty ||
    window.confirm(
      '저장하지 않은 월간 목표가 있어요. 저장하지 않고 다른 달로 이동할까요?',
    );

  const moveWeek = (amount: number) => {
    if (weeklySaveMutation.isPending || monthlySaveMutation.isPending) {
      return;
    }

    const nextWeekStart = addDays(weekStart, amount * 7);
    const nextMonthKey = toMonthKey(addDays(nextWeekStart, selectedDayIndex));

    if (!confirmPeriodDiscard(nextMonthKey)) {
      return;
    }

    setWeeklyDirty(false);

    if (nextMonthKey !== monthKey) {
      setMonthlyDirty(false);
    }

    setRouteDate(nextWeekStart, selectedDayIndex);
  };

  const moveToToday = () => {
    if (weeklySaveMutation.isPending || monthlySaveMutation.isPending) {
      return;
    }

    const currentToday = startOfDay(new Date());
    const todayWeekStart = getMonday(currentToday);
    const todayMonthKey = toMonthKey(currentToday);

    if (
      toDateKey(todayWeekStart) !== weekStartKey &&
      !confirmPeriodDiscard(todayMonthKey)
    ) {
      return;
    }

    if (
      toDateKey(todayWeekStart) === weekStartKey &&
      todayMonthKey !== monthKey &&
      !confirmMonthlyGoalDiscard()
    ) {
      return;
    }

    if (toDateKey(todayWeekStart) !== weekStartKey) {
      setWeeklyDirty(false);
    }

    if (todayMonthKey !== monthKey) {
      setMonthlyDirty(false);
    }

    setToday(currentToday);
    setRouteDate(todayWeekStart, daysBetween(todayWeekStart, currentToday));
  };

  const selectDay = (dayIndex: number) => {
    if (monthlySaveMutation.isPending) {
      return;
    }

    const nextMonthKey = toMonthKey(addDays(weekStart, dayIndex));

    if (nextMonthKey !== monthKey && !confirmMonthlyGoalDiscard()) {
      return;
    }

    if (nextMonthKey !== monthKey) {
      setMonthlyDirty(false);
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('week', weekStartKey);
    nextParams.set('day', String(dayIndex));
    setSearchParams(nextParams, { replace: true });
  };

  const markWeeklyDraftChanged = () => {
    setWeeklyDraftRevision(createDraftRevision());
    setWeeklyDirty(true);
  };

  const updateWeeklyGoal = (value: string) => {
    setWeeklyGoal(value);
    markWeeklyDraftChanged();
  };

  const updateItem = (
    draftId: string,
    update: Partial<Pick<EditablePlanItem, 'content' | 'done'>>,
  ) => {
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
        weekStartDate: weeklyDraftKey ?? weekStartKey,
      },
    });
  };

  const restoreDraftRoute = () => {
    focusPlannerWhenReadyRef.current = true;
    const targetWeekKey = weeklyRouteMismatch
      ? (weeklyDraftKey ?? weekStartKey)
      : weekStartKey;
    let targetWeekStart = parseDateKey(targetWeekKey) ?? weekStart;
    let targetDayIndex = selectedDayIndex;

    if (monthlyDirty && monthlyDraftKey) {
      const matchingDayIndex = DAY_LABELS.findIndex(
        (_, dayIndex) =>
          toMonthKey(addDays(targetWeekStart, dayIndex)) === monthlyDraftKey,
      );

      if (matchingDayIndex >= 0) {
        targetDayIndex = matchingDayIndex;
      } else {
        const firstDayOfDraftMonth = parseDateKey(`${monthlyDraftKey}-01`);

        if (firstDayOfDraftMonth) {
          targetWeekStart = getMonday(firstDayOfDraftMonth);
          targetDayIndex = daysBetween(targetWeekStart, firstDayOfDraftMonth);
        }
      }
    }

    setRouteDate(targetWeekStart, targetDayIndex, true);
  };

  const discardMismatchedDraft = () => {
    focusPlannerWhenReadyRef.current = true;

    if (weeklyRouteMismatch) {
      setWeeklyDirty(false);
      setEditorCell(null);
    }

    if (monthlyRouteMismatch) {
      setMonthlyDirty(false);
    }
  };

  if (weeklyRouteMismatch || monthlyRouteMismatch) {
    return (
      <DraftRouteConflict
        onDiscard={discardMismatchedDraft}
        onRestore={restoreDraftRoute}
      />
    );
  }

  if (weeklyPlanQuery.isPending) {
    return <PlanLoadingState />;
  }

  if (weeklyPlanQuery.isError) {
    return (
      <PlanErrorState
        message={weeklyPlanQuery.error.message}
        onRetry={() => {
          focusPlannerWhenReadyRef.current = true;
          void weeklyPlanQuery.refetch();
        }}
      />
    );
  }

  return (
    <section className="member-plans">
      <PlanHero monthLabel={formatMonthLabel(monthKey)} />

      <PlanGoals
        completedCount={completedCount}
        monthlyDirty={monthlyDirty}
        monthlyGoal={monthlyGoal}
        monthlyLabel={formatMonthLabel(monthKey)}
        monthlyLoadError={monthlyGoalQuery.isError}
        monthlyLoading={monthlyGoalQuery.isPending}
        monthlySaving={monthlySaveMutation.isPending}
        onMonthlyGoalChange={(value) => {
          setMonthlyGoal(value);
          setMonthlyDraftRevision(createDraftRevision());
          setMonthlyDirty(true);
        }}
        onMonthlyRetry={() => void monthlyGoalQuery.refetch()}
        onMonthlySave={() =>
          monthlySaveMutation.mutate({
            draftRevision: monthlyDraftRevision,
            memberId,
            ownerKey: queryOwnerKey,
            request: {
              goal: monthlyGoal.trim(),
              month: monthlyDraftKey ?? monthKey,
            },
          })
        }
        onWeeklyGoalChange={updateWeeklyGoal}
        progress={progress}
        totalCount={visibleItems.length}
        weekRangeLabel={formatWeekRange(weekStart)}
        weeklyDirty={weeklyDirty}
        weeklyGoal={weeklyGoal}
        weeklySaving={weeklySaveMutation.isPending}
      />

      <WeeklyPlanner
        completedCount={completedCount}
        daySelectionDisabled={monthlySaveMutation.isPending}
        days={weekDays.map((day, dayIndex) => ({
          dayIndex,
          dayOfMonth: day.date.getDate(),
          fullDateLabel: formatFullDate(day.date),
          isToday: isSameDate(day.date, today),
          key: toDateKey(day.date),
          label: day.label,
          longLabel: DAY_LONG_LABELS[dayIndex],
          shortDateLabel: formatShortDate(day.date),
        }))}
        editingDisabled={weeklySaveMutation.isPending}
        headingRef={plannerHeadingRef}
        items={items}
        navigationDisabled={
          weeklySaveMutation.isPending || monthlySaveMutation.isPending
        }
        onMoveToToday={moveToToday}
        onMoveWeek={moveWeek}
        onOpenEditor={setEditorCell}
        onSelectDay={selectDay}
        rows={PLAN_ROWS}
        selectedDateLabel={formatFullDate(selectedDate)}
        selectedDayCompleted={selectedDayCompleted}
        selectedDayIndex={selectedDayIndex}
        selectedDayTotal={selectedDayItems.length}
        totalCount={visibleItems.length}
        weekRangeLabel={formatWeekRange(weekStart)}
      />

      {weeklyDirty && (
        <PlanSaveBar loading={weeklySaveMutation.isPending} onSave={saveWeek} />
      )}

      <PlanEditorModal
        cell={editorCell}
        dateLabel={
          editorCell
            ? formatFullDate(addDays(weekStart, editorCell.dayIndex))
            : ''
        }
        dayLabel={editorCell ? DAY_LONG_LABELS[editorCell.dayIndex] : ''}
        items={currentEditorItems}
        onAdd={(cell) => addItem(cell.periodIndex, cell.dayIndex)}
        onClose={closeEditor}
        onDelete={deleteItem}
        onUpdate={updateItem}
        row={currentEditorRow}
      />
    </section>
  );
}
