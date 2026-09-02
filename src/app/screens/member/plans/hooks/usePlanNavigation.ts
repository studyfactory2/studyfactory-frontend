import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DAY_LABELS } from '../model/plan.constants';
import {
  addDays,
  daysBetween,
  getMonday,
  parseDateKey,
  resolveSelectedDay,
  resolveWeekStart,
  startOfDay,
  toDateKey,
  toMonthKey,
} from '../model/plan.dates';

type UsePlanNavigationOptions = {
  monthlyDirty: boolean;
  monthlyDraftKey: string | null;
  monthlySaving: boolean;
  onDiscardMonthlyDraft: () => void;
  onDiscardMismatchedWeeklyDraft: () => void;
  onDiscardWeeklyDraft: () => void;
  weeklyDirty: boolean;
  weeklyDraftKey: string | null;
  weeklySaving: boolean;
};

export function usePlanNavigation({
  monthlyDirty,
  monthlyDraftKey,
  monthlySaving,
  onDiscardMonthlyDraft,
  onDiscardMismatchedWeeklyDraft,
  onDiscardWeeklyDraft,
  weeklyDirty,
  weeklyDraftKey,
  weeklySaving,
}: UsePlanNavigationOptions) {
  const [searchParams, setSearchParams] = useSearchParams();
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
  const plannerHeadingRef = useRef<HTMLHeadingElement>(null);
  const focusPlannerWhenReadyRef = useRef(false);
  const previousWeekKeyRef = useRef(weekStartKey);
  const requestPlannerFocus = useCallback(() => {
    focusPlannerWhenReadyRef.current = true;
  }, []);
  const hasRequestedPlannerFocus = useCallback(
    () => focusPlannerWhenReadyRef.current,
    [],
  );
  const focusPlannerHeading = useCallback(() => {
    focusPlannerWhenReadyRef.current = false;
    plannerHeadingRef.current?.focus();
  }, []);
  const weeklyRouteMismatch = Boolean(
    weeklyDirty && weeklyDraftKey && weeklyDraftKey !== weekStartKey,
  );
  const monthlyRouteMismatch = Boolean(
    monthlyDirty && monthlyDraftKey && monthlyDraftKey !== monthKey,
  );

  useEffect(() => {
    const nextMidnight = addDays(today, 1).getTime();
    const timeout = window.setTimeout(
      () => setToday(startOfDay(new Date())),
      Math.max(1_000, nextMidnight - Date.now() + 250),
    );

    return () => window.clearTimeout(timeout);
  }, [today]);

  useEffect(() => {
    if (previousWeekKeyRef.current !== weekStartKey) {
      previousWeekKeyRef.current = weekStartKey;
      requestPlannerFocus();
    }
  }, [requestPlannerFocus, weekStartKey]);

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

  const moveWeek = (amount: -1 | 1) => {
    if (weeklySaving || monthlySaving) {
      return;
    }

    const nextWeekStart = addDays(weekStart, amount * 7);
    const nextMonthKey = toMonthKey(addDays(nextWeekStart, selectedDayIndex));

    if (!confirmPeriodDiscard(nextMonthKey)) {
      return;
    }

    onDiscardWeeklyDraft();

    if (nextMonthKey !== monthKey) {
      onDiscardMonthlyDraft();
    }

    setRouteDate(nextWeekStart, selectedDayIndex);
  };

  const moveToToday = () => {
    if (weeklySaving || monthlySaving) {
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
      onDiscardWeeklyDraft();
    }

    if (todayMonthKey !== monthKey) {
      onDiscardMonthlyDraft();
    }

    setToday(currentToday);
    setRouteDate(todayWeekStart, daysBetween(todayWeekStart, currentToday));
  };

  const selectDay = (dayIndex: number) => {
    if (monthlySaving) {
      return;
    }

    const nextMonthKey = toMonthKey(addDays(weekStart, dayIndex));

    if (nextMonthKey !== monthKey && !confirmMonthlyGoalDiscard()) {
      return;
    }

    if (nextMonthKey !== monthKey) {
      onDiscardMonthlyDraft();
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('week', weekStartKey);
    nextParams.set('day', String(dayIndex));
    setSearchParams(nextParams, { replace: true });
  };

  const restoreDraftRoute = () => {
    requestPlannerFocus();
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
    requestPlannerFocus();

    if (weeklyRouteMismatch) {
      onDiscardMismatchedWeeklyDraft();
    }

    if (monthlyRouteMismatch) {
      onDiscardMonthlyDraft();
    }
  };

  return {
    discardMismatchedDraft,
    focusPlannerHeading,
    hasRequestedPlannerFocus,
    monthKey,
    monthlyRouteMismatch,
    moveToToday,
    moveWeek,
    plannerHeadingRef,
    requestPlannerFocus,
    restoreDraftRoute,
    selectDay,
    selectedDate,
    selectedDayIndex,
    today,
    weekStart,
    weekStartKey,
    weeklyRouteMismatch,
  };
}
