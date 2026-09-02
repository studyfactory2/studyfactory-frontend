import type { EditablePlanItem, PlanRow } from './plan.types';

/**
 * Presentational status for one period cell.
 * Derived only from data the planner already holds — no clock, no new API.
 */
export type PlanPeriodStatus =
  'break' | 'done' | 'empty' | 'planned' | 'progress';

export type PlanPeriodStatusView = {
  label: string;
  status: PlanPeriodStatus;
  tone: 'neutral' | 'positive' | 'special';
};

export function getPlanPeriodStatus(
  row: PlanRow,
  items: readonly EditablePlanItem[],
): PlanPeriodStatus {
  if (row.isBreak) {
    return 'break';
  }

  const populated = items.filter((item) => item.content.trim());

  if (populated.length === 0) {
    return 'empty';
  }

  const doneCount = populated.filter((item) => item.done).length;

  if (doneCount === populated.length) {
    return 'done';
  }

  return doneCount > 0 ? 'progress' : 'planned';
}

export function getPlanPeriodStatusView(
  row: PlanRow,
  items: readonly EditablePlanItem[],
): PlanPeriodStatusView {
  const status = getPlanPeriodStatus(row, items);

  if (status === 'break') {
    return { label: '휴식', status, tone: 'neutral' };
  }

  if (status === 'done') {
    return { label: '완료', status, tone: 'positive' };
  }

  if (status === 'progress') {
    return { label: '진행 중', status, tone: 'special' };
  }

  if (status === 'planned') {
    return { label: '예정', status, tone: 'neutral' };
  }

  return { label: '비어 있음', status, tone: 'neutral' };
}
