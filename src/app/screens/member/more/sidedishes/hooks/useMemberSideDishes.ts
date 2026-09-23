import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiRequestError } from '../../../../../core/api/api-client';
import type { SessionOwnerKey } from '../../../../../core/session';
import { sideDishQueryKeys } from '../../../../../features/side-dishes/side-dish-query-keys';
import {
  createMySideDish,
  deleteMySideDish,
  fetchMySideDishOrderDates,
  fetchMySideDishes,
  type MealType,
  type SideDishResponse,
} from '../../../../../features/side-dishes/side-dishes-api';
import { useSeoulClock } from '../../../../../shared/hooks/useSeoulClock';
import {
  addDays,
  getMonthEndKey,
  getMonthStartKey,
  getSeoulSecondsOfDay,
  getSeoulToday,
} from '../../../../../shared/lib/seoul-date';
import { useToast } from '../../../../../shared/ui';
import { MEAL_OPTIONS, getMealStatus } from '../model/sidedish.types';
import {
  getSideDishOrderTotal,
  serializeSideDishItems,
  validateSideDishItems,
  type SideDishOrderItem,
} from '../model/sidedish-order';

const ORDERS_STALE_TIME_MS = 30 * 1_000;
type OrderContext = { mealDate: string; mealType: MealType };
type CreateOrder = OrderContext & { menuName: string; price: number };

function isOrderingOpen(context: OrderContext, now = new Date()) {
  const meal = MEAL_OPTIONS.find((option) => option.value === context.mealType);
  return (
    meal !== undefined &&
    getMealStatus({
      dateKey: context.mealDate,
      meal,
      secondsOfDay: getSeoulSecondsOfDay(now),
      todayKey: getSeoulToday(now).dateKey,
    }) === 'open'
  );
}

export function useMemberSideDishes(
  memberId: number,
  ownerKey: SessionOwnerKey,
) {
  const clock = useSeoulClock();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedDateKey, setSelectedDateKey] = useState(clock.dateKey);
  const followsTodayRef = useRef(true);
  const mountedRef = useRef(false);
  const writeInFlightRef = useRef(false);
  const [composition, setComposition] = useState<OrderContext | null>(null);
  const [cancellationTarget, setCancellationTarget] =
    useState<SideDishResponse | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [submissionUncertain, setSubmissionUncertain] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  useEffect(() => {
    if (followsTodayRef.current) setSelectedDateKey(clock.dateKey);
  }, [clock.dateKey]);

  const [year, month] = selectedDateKey.split('-').map(Number);
  const monthStart = getMonthStartKey(year, month);
  const monthEnd = getMonthEndKey(year, month);
  const ordersQuery = useQuery({
    queryFn: () => fetchMySideDishes(selectedDateKey, memberId),
    queryKey: sideDishQueryKeys.mine(ownerKey, selectedDateKey),
    staleTime: ORDERS_STALE_TIME_MS,
    refetchOnWindowFocus: 'always',
  });
  const orderDatesQuery = useQuery({
    queryFn: () => fetchMySideDishOrderDates(monthStart, monthEnd, memberId),
    queryKey: sideDishQueryKeys.orderDates(ownerKey, monthStart, monthEnd),
    staleTime: ORDERS_STALE_TIME_MS,
  });
  const orderedDates = useMemo(
    () => new Set(orderDatesQuery.data ?? []),
    [orderDatesQuery.data],
  );
  const refreshOrders = () =>
    queryClient.invalidateQueries({
      queryKey: sideDishQueryKeys.all(ownerKey),
    });

  const createMutation = useMutation({
    /* Capture the reviewed date/meal/basket in variables, never from a later selection. */
    mutationFn: (input: CreateOrder) => createMySideDish(input, memberId),
    retry: false,
    onSuccess: () => {
      if (mountedRef.current) {
        setComposition(null);
        toast('반찬을 신청했어요.', 'success');
      }
    },
    onError: (error: Error) => {
      if (!mountedRef.current) return;
      const uncertain =
        !(error instanceof ApiRequestError) || error.status >= 500;
      setSubmissionUncertain(uncertain);
      setCreateError(
        uncertain
          ? '신청 결과를 확인하지 못했어요. 창을 닫고 신청 내역을 먼저 확인해 주세요. 같은 주문이 없을 때만 다시 신청해 주세요.'
          : error.message,
      );
    },
    onSettled: async () => {
      try {
        await refreshOrders();
      } finally {
        writeInFlightRef.current = false;
      }
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteMySideDish(id, memberId),
    retry: false,
    onSuccess: () => {
      if (mountedRef.current) {
        setCancellationTarget(null);
        toast(
          '반찬 신청을 취소했어요. 환불은 운영자에게 확인해 주세요.',
          'success',
        );
      }
    },
    onError: (error: Error) => {
      if (mountedRef.current) setDeleteError(error.message);
    },
    onSettled: async () => {
      try {
        await refreshOrders();
      } finally {
        writeInFlightRef.current = false;
      }
    },
  });
  const saving = createMutation.isPending || deleteMutation.isPending;
  const latestCancellationTarget =
    cancellationTarget === null
      ? undefined
      : ordersQuery.data?.find(
          (order) =>
            order.id === cancellationTarget.id &&
            order.memberId === memberId &&
            order.mealDate === cancellationTarget.mealDate &&
            order.mealType === cancellationTarget.mealType &&
            order.items === cancellationTarget.items &&
            order.totalPrice === cancellationTarget.totalPrice,
        );
  const cancellationOpen =
    latestCancellationTarget !== undefined &&
    !ordersQuery.isError &&
    isOrderingOpen(latestCancellationTarget);

  const selectDate = (dateKey: string) => {
    if (writeInFlightRef.current) return;
    setComposition(null);
    setCancellationTarget(null);
    followsTodayRef.current = dateKey === clock.dateKey;
    setSelectedDateKey(dateKey);
  };

  return {
    composingMeal: composition?.mealType ?? null,
    composingDate: composition?.mealDate ?? null,
    orderingOpen: composition !== null && isOrderingOpen(composition),
    createError,
    submissionUncertain,
    cancellation: {
      order: cancellationTarget,
      cancellationOpen,
      errorMessage: deleteError,
      onClose: () => {
        if (!writeInFlightRef.current) setCancellationTarget(null);
      },
      onConfirm: () => {
        if (writeInFlightRef.current || cancellationTarget === null) return;
        if (!cancellationOpen || !isOrderingOpen(cancellationTarget)) {
          setDeleteError(
            '신청 내역이나 마감시간이 변경되었어요. 창을 닫고 내역을 다시 확인해 주세요.',
          );
          return;
        }
        writeInFlightRef.current = true;
        setDeleteError(null);
        deleteMutation.mutate(cancellationTarget.id);
      },
    },
    isToday: selectedDateKey === clock.dateKey,
    meals: MEAL_OPTIONS.map((meal) => ({
      meal,
      orders: (ordersQuery.data ?? []).filter(
        (order) => order.mealType === meal.value,
      ),
      status: getMealStatus({
        dateKey: selectedDateKey,
        meal,
        secondsOfDay: clock.secondsOfDay,
        todayKey: clock.dateKey,
      }),
    })),
    onCloseComposer: () => {
      if (!writeInFlightRef.current) setComposition(null);
    },
    onDelete: (id: number) => {
      if (writeInFlightRef.current || ordersQuery.isError) return;
      const order = ordersQuery.data?.find(
        (item) =>
          item.id === id &&
          item.memberId === memberId &&
          item.mealDate === selectedDateKey,
      );
      if (!order || !isOrderingOpen(order)) {
        toast('신청 내역과 마감시간을 다시 확인해 주세요.', 'error');
        return;
      }
      setComposition(null);
      setDeleteError(null);
      setCancellationTarget(order);
    },
    onGoToday: () => selectDate(clock.dateKey),
    onOpenComposer: (mealType: MealType) => {
      if (writeInFlightRef.current) return;
      const context = { mealDate: selectedDateKey, mealType };
      if (!isOrderingOpen(context)) {
        toast('선택한 날짜의 반찬 신청 시간이 마감되었어요.', 'error');
        return;
      }
      setCancellationTarget(null);
      setCreateError(null);
      setSubmissionUncertain(false);
      setComposition(context);
    },
    onSelectDate: selectDate,
    onShiftDate: (days: number) => selectDate(addDays(selectedDateKey, days)),
    onSubmit: (items: SideDishOrderItem[], transferDeclared: boolean) => {
      if (
        writeInFlightRef.current ||
        submissionUncertain ||
        composition === null
      )
        return;
      if (!isOrderingOpen(composition)) {
        setCreateError('선택한 날짜의 반찬 신청 시간이 마감되었어요.');
        return;
      }
      const validationError = validateSideDishItems(items);
      if (validationError !== null || !transferDeclared) {
        setCreateError(validationError ?? '송금완료를 확인해 주세요.');
        return;
      }
      writeInFlightRef.current = true;
      setCreateError(null);
      createMutation.mutate({
        ...composition,
        menuName: serializeSideDishItems(items),
        price: getSideDishOrderTotal(items),
      });
    },
    orderDates: {
      errorMessage: orderDatesQuery.isError
        ? orderDatesQuery.error.message
        : null,
      loading: orderDatesQuery.isPending,
      onRetry: () => void orderDatesQuery.refetch(),
      ready: orderDatesQuery.data !== undefined,
      values: orderedDates,
    },
    orders: {
      errorMessage: ordersQuery.isError ? ordersQuery.error.message : null,
      loading: ordersQuery.isPending,
      onRetry: () => void ordersQuery.refetch(),
    },
    saving,
    selectedDateKey,
    todayKey: clock.dateKey,
  };
}
