import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SessionOwnerKey } from '../../../../../core/session';
import { sideDishQueryKeys } from '../../../../../features/side-dishes/side-dish-query-keys';
import {
  createMySideDish,
  deleteMySideDish,
  fetchMySideDishOrderDates,
  fetchMySideDishes,
  type MealType,
} from '../../../../../features/side-dishes/side-dishes-api';
import { useSeoulClock } from '../../../../../shared/hooks/useSeoulClock';
import {
  addDays,
  getMonthEndKey,
  getMonthStartKey,
} from '../../../../../shared/lib/seoul-date';
import { useToast } from '../../../../../shared/ui';
import { MEAL_OPTIONS, getMealStatus } from '../model/sidedish.types';

const ORDERS_STALE_TIME_MS = 30 * 1_000;

export function useMemberSideDishes(
  memberId: number,
  ownerKey: SessionOwnerKey,
) {
  const clock = useSeoulClock();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedDateKey, setSelectedDateKey] = useState(clock.dateKey);
  const [composingMeal, setComposingMeal] = useState<MealType | null>(null);

  const [year, month] = selectedDateKey.split('-').map(Number);
  const monthStart = getMonthStartKey(year, month);
  const monthEnd = getMonthEndKey(year, month);

  const ordersQuery = useQuery({
    queryFn: () => fetchMySideDishes(selectedDateKey, memberId),
    queryKey: sideDishQueryKeys.mine(ownerKey, selectedDateKey),
    staleTime: ORDERS_STALE_TIME_MS,
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

  const afterWrite = async (message: string) => {
    setComposingMeal(null);
    toast(message, 'success');
    await queryClient.invalidateQueries({
      queryKey: sideDishQueryKeys.all(ownerKey),
    });
  };

  const createMutation = useMutation({
    mutationFn: (input: {
      mealType: MealType;
      menuName: string;
      price: number;
    }) => createMySideDish({ ...input, mealDate: selectedDateKey }, memberId),
    onError: (error: Error) => toast(error.message, 'error'),
    onSuccess: () => afterWrite('반찬을 신청했어요.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (sideDishId: number) => deleteMySideDish(sideDishId, memberId),
    onError: (error: Error) => toast(error.message, 'error'),
    onSuccess: () => afterWrite('반찬 신청을 취소했어요.'),
  });

  const meals = MEAL_OPTIONS.map((meal) => ({
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
  }));

  return {
    composingMeal,
    isToday: selectedDateKey === clock.dateKey,
    meals,
    onCloseComposer: () => setComposingMeal(null),
    onDelete: (sideDishId: number) => deleteMutation.mutate(sideDishId),
    onGoToday: () => setSelectedDateKey(clock.dateKey),
    onOpenComposer: setComposingMeal,
    onSelectDate: setSelectedDateKey,
    onShiftDate: (days: number) =>
      setSelectedDateKey((current) => addDays(current, days)),
    onSubmit: (menuName: string, price: number) => {
      if (
        composingMeal === null ||
        menuName.trim().length === 0 ||
        price <= 0
      ) {
        return;
      }

      createMutation.mutate({
        mealType: composingMeal,
        menuName: menuName.trim(),
        price,
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
    saving: createMutation.isPending || deleteMutation.isPending,
    selectedDateKey,
    todayKey: clock.dateKey,
  };
}
