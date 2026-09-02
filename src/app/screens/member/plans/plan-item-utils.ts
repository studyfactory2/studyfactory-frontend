import type {
  MonthlyPlanGoalResponse,
  WeeklyPlanItemRequest,
  WeeklyPlanItemResponse,
  WeeklyPlanResponse,
} from '../../../features/plans/plans-api';
import type { EditablePlanItem } from './plan-types';

let draftSequence = 0;

export function hydrateWeeklyDraft(
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

export function hydrateMonthlyDraft(
  response: MonthlyPlanGoalResponse,
  setGoal: (goal: string) => void,
  setDraftKey: (key: string) => void,
  setDraftRevision: (revision: string) => void,
) {
  setGoal(response.goal ?? '');
  setDraftKey(response.month);
  setDraftRevision(createDraftRevision());
}

export function toEditableItem(item: WeeklyPlanItemResponse): EditablePlanItem {
  return {
    ...item,
    draftId: `server-${item.id}`,
  };
}

export function toSaveItems(
  items: EditablePlanItem[],
): WeeklyPlanItemRequest[] {
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

export function getCellItems(
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

export function createDraftId() {
  draftSequence += 1;
  return `draft-${Date.now()}-${draftSequence}`;
}

export function createDraftRevision() {
  draftSequence += 1;
  return `revision-${Date.now()}-${draftSequence}`;
}

export function isEditablePlanItem(value: unknown): value is EditablePlanItem {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.draftId === 'string' &&
    (value.id === null ||
      (typeof value.id === 'number' && Number.isInteger(value.id))) &&
    typeof value.periodIndex === 'number' &&
    Number.isInteger(value.periodIndex) &&
    typeof value.dayIndex === 'number' &&
    Number.isInteger(value.dayIndex) &&
    typeof value.content === 'string' &&
    typeof value.done === 'boolean' &&
    typeof value.sortOrder === 'number' &&
    Number.isInteger(value.sortOrder)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
