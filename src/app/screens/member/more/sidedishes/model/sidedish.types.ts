import type { MealType } from '../../../../../features/side-dishes/side-dishes-api';

export type MealOption = {
  /** Seconds past Seoul midnight after which today's order is refused. */
  deadlineSeconds: number;
  deadlineLabel: string;
  label: string;
  value: MealType;
};

/** Mirrors SideDishService#validateLunchDeadline / validateDinnerDeadline. */
export const MEAL_OPTIONS: readonly MealOption[] = [
  {
    deadlineLabel: '10:45',
    deadlineSeconds: 10 * 3_600 + 45 * 60,
    label: '점심',
    value: 'LUNCH',
  },
  {
    deadlineLabel: '16:30',
    deadlineSeconds: 16 * 3_600 + 30 * 60,
    label: '저녁',
    value: 'DINNER',
  },
];

export type MealStatus = 'closed' | 'open' | 'past';

/**
 * The cutoff only applies to today: the backend leaves future dates open and
 * refuses past ones outright. Cancelling is held to the same rule even though
 * the backend does not check it, so a member cannot drop a meal the kitchen
 * has already started.
 */
export function getMealStatus({
  dateKey,
  meal,
  secondsOfDay,
  todayKey,
}: {
  dateKey: string;
  meal: MealOption;
  secondsOfDay: number;
  todayKey: string;
}): MealStatus {
  if (dateKey < todayKey) {
    return 'past';
  }

  if (dateKey > todayKey) {
    return 'open';
  }

  return secondsOfDay > meal.deadlineSeconds ? 'closed' : 'open';
}

export const SIDE_DISH_MENU_MAX_LENGTH = 60;
export const SIDE_DISH_MAX_PRICE = 100_000;
