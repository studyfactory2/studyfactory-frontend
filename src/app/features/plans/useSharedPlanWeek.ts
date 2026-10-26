import { useEffect, useSyncExternalStore } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiRequestError } from '../../core/api/api-client';
import { getCurrentSession, type SessionOwnerKey } from '../../core/session';
import { MEMBER_PLAN_SAVED_EVENT } from '../../screens/member/plans/model/plan.constants';
import {
  allSharedPlanItems,
  fetchManagedSharedPlanWeek,
  fetchSharedPlanWeek,
  saveSharedPlanAction,
  sharedPlanQueryKeys,
  type SharedPlanAction,
  type SharedPlanWeek,
} from './shared-plans-api';
import {
  getSharedDraftStore,
  updateSharedDraftStore,
  type SharedPlanDraft,
} from './shared-plan-drafts';
export type { SharedPlanAction, SharedPlanDraft };

type Options = {
  memberId: number;
  ownerKey: SessionOwnerKey;
  weekStartDate: string;
  readOnly?: boolean;
  targetBranchId?: number;
  operatorMemberId?: number;
};
export function useSharedPlanWeek({
  memberId,
  ownerKey,
  weekStartDate,
  readOnly = false,
  targetBranchId,
  operatorMemberId,
}: Options) {
  const queryClient = useQueryClient();
  const queryKey = readOnly
    ? sharedPlanQueryKeys.managedWeek(
        ownerKey,
        targetBranchId ?? -1,
        memberId,
        weekStartDate,
      )
    : sharedPlanQueryKeys.week(ownerKey, weekStartDate);
  const query = useQuery({
    queryKey,
    queryFn: () =>
      readOnly
        ? fetchManagedSharedPlanWeek(
            memberId,
            targetBranchId!,
            weekStartDate,
            operatorMemberId!,
          )
        : fetchSharedPlanWeek(weekStartDate, memberId),
    enabled:
      !readOnly ||
      (targetBranchId !== undefined && operatorMemberId !== undefined),
    retry: false,
  });
  // Managers never read a member's local drafts, even on a shared browser.
  const store = getSharedDraftStore(
    readOnly ? -1 : memberId,
    readOnly ? 'read-only' : weekStartDate,
  );
  const state = useSyncExternalStore(
    (listener) => {
      store.listeners.add(listener);
      return () => {
        store.listeners.delete(listener);
      };
    },
    () => store.state,
  );
  const update = (
    fn: Parameters<typeof updateSharedDraftStore>[3],
    persist = true,
  ) => updateSharedDraftStore(store, memberId, weekStartDate, fn, persist);
  const sameOwner = () =>
    getCurrentSession().ownerKey === ownerKey &&
    getCurrentSession().memberId === memberId;
  const editable = () => !readOnly && sameOwner() && !store.state.busy;
  const currentWeek = () => queryClient.getQueryData<SharedPlanWeek>(queryKey);
  const putDraft = (draft: SharedPlanDraft) =>
    update((current) => ({
      ...current,
      drafts: { ...current.drafts, [draft.key]: draft },
    }));
  const removeDraft = (key: string, version?: string) =>
    update((current) => {
      if (version && current.drafts[key]?.version !== version)
        return { ...current };
      const drafts = { ...current.drafts };
      delete drafts[key];
      return { ...current, drafts };
    });

  useEffect(() => {
    if (readOnly || !state.storageWarning || !Object.keys(state.drafts).length)
      return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [readOnly, state.storageWarning, state.drafts]);

  function startDraft(key: string, action: SharedPlanAction) {
    const week = currentWeek();
    if (!editable() || !week || store.state.drafts[key]) return;
    putDraft({
      key,
      action,
      baseRevision: week.revision,
      version: crypto.randomUUID(),
      status: 'editing',
    });
  }
  function changeDraft(key: string, action: SharedPlanAction) {
    const draft = store.state.drafts[key];
    if (!editable() || !draft || draft.status !== 'editing') return;
    putDraft({
      ...draft,
      action,
      version: crypto.randomUUID(),
      message: undefined,
    });
  }
  function discardDraft(key: string) {
    if (editable()) removeDraft(key);
  }
  function reviewDraft(key: string) {
    const draft = store.state.drafts[key];
    const week = currentWeek();
    if (!editable() || !draft || !week || query.isFetching) return;
    // An ambiguous create must replay its original UUID and payload, not become a new add.
    if (
      draft.status === 'uncertain' &&
      (draft.action.type === 'add' || draft.action.type === 'break')
    )
      return;
    putDraft({
      ...draft,
      baseRevision: week.revision,
      status: 'editing',
      version: crypto.randomUUID(),
      message: undefined,
    });
  }
  async function submitDraft(key: string) {
    const draft = store.state.drafts[key];
    if (!editable() || !draft || draft.status === 'conflict') return;
    const action = draft.action;
    if (
      'content' in action &&
      action.content !== undefined &&
      !action.content.trim()
    ) {
      putDraft({ ...draft, message: '할 일을 입력해 주세요.' });
      return;
    }
    // Persist the exact request BEFORE sending. A refresh/retry cannot create a duplicate.
    update((current) => ({
      ...current,
      busy: true,
      drafts: {
        ...current.drafts,
        [key]: { ...draft, status: 'uncertain', message: undefined },
      },
    }));
    try {
      await queryClient.cancelQueries({ queryKey, exact: true });
      if (!sameOwner()) return;
      const response = await saveSharedPlanAction(
        memberId,
        weekStartDate,
        draft.baseRevision,
        action,
      );
      if (!sameOwner()) return;
      queryClient.setQueryData<SharedPlanWeek>(queryKey, (previous) =>
        previous && previous.revision > response.revision ? previous : response,
      );
      removeDraft(key, draft.version);
      window.dispatchEvent(new CustomEvent(MEMBER_PLAN_SAVED_EVENT));
    } catch (error) {
      if (!sameOwner()) return;
      const knownRejection =
        error instanceof ApiRequestError &&
        [400, 403, 404, 409].includes(error.status);
      const message =
        error instanceof Error
          ? error.message
          : '저장 결과를 확인할 수 없습니다.';
      const latestDraft = store.state.drafts[key];
      if (latestDraft?.version === draft.version)
        putDraft({
          ...latestDraft,
          status: knownRejection ? 'conflict' : 'uncertain',
          message: `${message} 입력 내용은 유지됩니다. 최신 저장 내용을 확인해 주세요.`,
        });
      // A PATCH/DELETE response may have been lost. Reconcile without resending or rebasing.
      const latest = await query.refetch();
      if (!sameOwner() || !latest.data || latest.isError) return;
      if (
        action.type !== 'add' &&
        action.type !== 'break' &&
        actionAlreadyApplied(action, latest.data)
      ) {
        removeDraft(key, draft.version);
      }
    } finally {
      update((current) => ({ ...current, busy: false }), false);
    }
  }
  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: () => {
      void query.refetch();
    },
    drafts: readOnly ? {} : state.drafts,
    busy: state.busy,
    storageWarning: readOnly ? null : state.storageWarning,
    startDraft,
    changeDraft,
    discardDraft,
    submitDraft,
    reviewDraft,
  };
}

function actionAlreadyApplied(action: SharedPlanAction, week: SharedPlanWeek) {
  if (action.type === 'goal') return week.goal === action.goal.trim();
  if (action.type === 'add' || action.type === 'break') return false;
  const item = allSharedPlanItems(week).find(
    (item) => item.source === action.source && item.id === action.id,
  );
  if (action.type === 'delete') return !item;
  return (
    !!item &&
    (action.content === undefined || item.content === action.content.trim()) &&
    (action.done === undefined || item.done === action.done)
  );
}
