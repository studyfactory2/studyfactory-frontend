import {
  MONTHLY_DRAFT_STORAGE_KEY,
  WEEKLY_DRAFT_STORAGE_KEY,
} from './plan.constants';
import { isCanonicalMondayKey, isMonthKey } from './plan.dates';
import type {
  EditablePlanItem,
  StoredMonthlyDraft,
  StoredWeeklyDraft,
} from './plan.types';

export function readStoredWeeklyDraft(
  memberId: number | null,
): StoredWeeklyDraft | null {
  if (typeof window === 'undefined' || memberId === null) {
    return null;
  }

  try {
    const rawDraft = window.sessionStorage.getItem(
      getDraftStorageKey(WEEKLY_DRAFT_STORAGE_KEY, memberId),
    );

    if (!rawDraft) {
      return null;
    }

    const draft: unknown = JSON.parse(rawDraft);

    if (
      !isRecord(draft) ||
      typeof draft.goal !== 'string' ||
      draft.memberId !== memberId ||
      typeof draft.revision !== 'string' ||
      !draft.revision ||
      typeof draft.weekStartKey !== 'string' ||
      !isCanonicalMondayKey(draft.weekStartKey) ||
      !Array.isArray(draft.items) ||
      !draft.items.every(isEditablePlanItem)
    ) {
      removeStoredWeeklyDraft(memberId);
      return null;
    }

    return {
      goal: draft.goal,
      items: draft.items,
      memberId,
      revision: draft.revision,
      weekStartKey: draft.weekStartKey,
    };
  } catch {
    removeStoredWeeklyDraft(memberId);
    return null;
  }
}

export function readStoredMonthlyDraft(
  memberId: number | null,
): StoredMonthlyDraft | null {
  if (typeof window === 'undefined' || memberId === null) {
    return null;
  }

  try {
    const rawDraft = window.sessionStorage.getItem(
      getDraftStorageKey(MONTHLY_DRAFT_STORAGE_KEY, memberId),
    );

    if (!rawDraft) {
      return null;
    }

    const draft: unknown = JSON.parse(rawDraft);

    if (
      !isRecord(draft) ||
      typeof draft.goal !== 'string' ||
      draft.memberId !== memberId ||
      typeof draft.monthKey !== 'string' ||
      !isMonthKey(draft.monthKey) ||
      typeof draft.revision !== 'string' ||
      !draft.revision
    ) {
      removeStoredMonthlyDraft(memberId);
      return null;
    }

    return {
      goal: draft.goal,
      memberId,
      monthKey: draft.monthKey,
      revision: draft.revision,
    };
  } catch {
    removeStoredMonthlyDraft(memberId);
    return null;
  }
}

export function writeStoredWeeklyDraft(draft: StoredWeeklyDraft) {
  try {
    window.sessionStorage.setItem(
      getDraftStorageKey(WEEKLY_DRAFT_STORAGE_KEY, draft.memberId),
      JSON.stringify(draft),
    );
  } catch {
    // Draft recovery is best-effort; the editable in-memory state remains valid.
  }
}

export function writeStoredMonthlyDraft(draft: StoredMonthlyDraft) {
  try {
    window.sessionStorage.setItem(
      getDraftStorageKey(MONTHLY_DRAFT_STORAGE_KEY, draft.memberId),
      JSON.stringify(draft),
    );
  } catch {
    // Draft recovery is best-effort; the editable in-memory state remains valid.
  }
}

export function removeStoredWeeklyDraft(memberId: number) {
  try {
    window.sessionStorage.removeItem(
      getDraftStorageKey(WEEKLY_DRAFT_STORAGE_KEY, memberId),
    );
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
}

export function removeStoredMonthlyDraft(memberId: number) {
  try {
    window.sessionStorage.removeItem(
      getDraftStorageKey(MONTHLY_DRAFT_STORAGE_KEY, memberId),
    );
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
}

export function removeStoredWeeklyDraftIfRevision(
  memberId: number | null,
  weekStartKey: string,
  revision: string,
) {
  const storedDraft = readStoredWeeklyDraft(memberId);

  if (
    memberId !== null &&
    storedDraft?.weekStartKey === weekStartKey &&
    storedDraft.revision === revision
  ) {
    removeStoredWeeklyDraft(memberId);
  }
}

export function removeStoredMonthlyDraftIfRevision(
  memberId: number | null,
  monthKey: string,
  revision: string,
) {
  const storedDraft = readStoredMonthlyDraft(memberId);

  if (
    memberId !== null &&
    storedDraft?.monthKey === monthKey &&
    storedDraft.revision === revision
  ) {
    removeStoredMonthlyDraft(memberId);
  }
}

export function getDraftStorageKey(baseKey: string, memberId: number) {
  return `${baseKey}.${memberId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isEditablePlanItem(value: unknown): value is EditablePlanItem {
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
