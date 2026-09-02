import type { WeeklyPlanItemResponse } from '../../../../features/plans/plans-api';
import type { PlanRow } from '../../plans/model/plan.types';

export type TodayPeriodPlan = {
  items: WeeklyPlanItemResponse[];
  row: PlanRow;
};
