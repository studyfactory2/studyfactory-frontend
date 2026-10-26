import { useSyncExternalStore } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiRequestError } from '../../core/api/api-client';
import {
  getCurrentSession,
  getSessionCredentials,
  type SessionOwnerKey,
} from '../../core/session';
import {
  fetchMemberTaskDay,
  memberTaskQueryKeys,
  saveMemberTaskAction,
  type MemberTaskAction,
  type MemberTaskDay,
} from './member-tasks-api';
import {
  canSaveMemberTaskDraftStore,
  getMemberTaskDraftDates,
  getMemberTaskDraftDateSnapshot,
  getMemberTaskDraftStore,
  subscribeMemberTaskDraftDates,
  updateMemberTaskDraftStore,
  type MemberTaskDraft,
} from './member-task-drafts';

export type { MemberTaskAction, MemberTaskDraft };

type Options = { memberId: number; ownerKey: SessionOwnerKey; date: string };

export function useMemberTasks({ memberId, ownerKey, date }: Options) {
  const queryClient = useQueryClient();
  const queryKey = memberTaskQueryKeys.day(ownerKey, date);
  const query = useQuery({
    queryKey,
    queryFn: () => fetchMemberTaskDay(date, memberId, ownerKey),
    retry: false,
  });
  const store = getMemberTaskDraftStore(memberId, date);
  const state = useSyncExternalStore(store.subscribe, () => store.state);
  useSyncExternalStore(
    subscribeMemberTaskDraftDates,
    getMemberTaskDraftDateSnapshot,
  );

  const sameOwner = () => {
    getSessionCredentials();
    const session = getCurrentSession();
    return (
      session.isAuthenticated &&
      session.ownerKey === ownerKey &&
      session.memberId === memberId &&
      session.role === 'MEMBER'
    );
  };
  const editable = () => sameOwner() && !store.state.busy;
  const currentDay = () => queryClient.getQueryData<MemberTaskDay>(queryKey);
  const update = (
    fn: Parameters<typeof updateMemberTaskDraftStore>[1],
    persist = true,
  ) => updateMemberTaskDraftStore(store, fn, persist);
  const putDraft = (draft: MemberTaskDraft) =>
    update((current) => ({
      ...current,
      drafts: { ...current.drafts, [draft.key]: draft },
    }));
  const removeDraft = (key: string, version: string) =>
    update((current) => {
      if (current.drafts[key]?.version !== version) return { ...current };
      const drafts = { ...current.drafts };
      delete drafts[key];
      return { ...current, drafts };
    });
  const putDay = (day: MemberTaskDay) => {
    queryClient.setQueryData<MemberTaskDay>(queryKey, (previous) =>
      previous && previous.revision > day.revision ? previous : day,
    );
    void queryClient.invalidateQueries({
      queryKey: memberTaskQueryKeys.calendar(ownerKey, date.slice(0, 7)),
      exact: true,
    });
  };
  const freshDay = async () => {
    const day = await fetchMemberTaskDay(date, memberId, ownerKey);
    if (sameOwner()) putDay(day);
    return day;
  };

  function startDraft(key: string, action: MemberTaskAction) {
    if (
      !editable() ||
      !key ||
      ['__proto__', 'constructor', 'prototype'].includes(key) ||
      Object.hasOwn(store.state.drafts, key)
    )
      return false;
    const day = currentDay();
    if (!day && action.type !== 'add') return false;
    putDraft({
      key,
      action: { ...action },
      baseRevision: day?.revision ?? null,
      version: crypto.randomUUID(),
      status: 'editing',
    });
    return true;
  }

  function changeDraft(key: string, action: MemberTaskAction) {
    const draft = store.state.drafts[key];
    if (
      !editable() ||
      !draft ||
      draft.status !== 'editing' ||
      (draft.action.type === 'add' && draft.requestLocked) ||
      !sameActionTarget(draft.action, action)
    )
      return false;
    putDraft({
      ...draft,
      action: { ...action },
      version: crypto.randomUUID(),
      message: undefined,
    });
    return true;
  }

  function discardDraft(key: string) {
    const draft = store.state.drafts[key];
    if (!editable() || !draft) return;
    // The UI asks for confirmation, especially for a request whose outcome is unknown.
    removeDraft(key, draft.version);
  }

  function markDraft(
    draft: MemberTaskDraft,
    status: MemberTaskDraft['status'],
    message: string,
  ) {
    const current = store.state.drafts[draft.key];
    if (current?.version === draft.version)
      putDraft({ ...current, status, message });
  }

  async function reconcile(draft: MemberTaskDraft, stillOwner: () => boolean) {
    const day = await freshDay();
    if (!stillOwner()) return;
    if (actionAlreadyApplied(draft.action, day)) {
      removeDraft(draft.key, draft.version);
    } else {
      markDraft(
        draft,
        'conflict',
        '최신 저장 내용을 불러왔습니다. 현재 내용과 초안을 비교한 뒤 다시 저장할지 선택해 주세요.',
      );
    }
  }

  async function reviewDraft(key: string) {
    const draft = store.state.drafts[key];
    if (
      !editable() ||
      !draft ||
      draft.status !== 'conflict' ||
      !canSaveMemberTaskDraftStore(store)
    )
      return;
    const refreshToken = getCurrentSession().refreshToken;
    const stillOwner = () =>
      sameOwner() && getCurrentSession().refreshToken === refreshToken;
    update((current) => ({ ...current, busy: true }), false);
    try {
      const day = await freshDay();
      if (!stillOwner()) return;
      if (actionAlreadyApplied(draft.action, day)) {
        removeDraft(key, draft.version);
        return;
      }
      const action = draft.action;
      if (
        action.type === 'update' &&
        !day.items.some((item) => item.id === action.id)
      ) {
        markDraft(
          draft,
          'conflict',
          '이 항목은 이미 삭제되었습니다. 초안 내용을 복사해 보관하거나 초안을 지워 주세요.',
        );
        return;
      }
      if (store.state.drafts[key]?.version !== draft.version) return;
      putDraft({
        ...draft,
        baseRevision: day.revision,
        version: crypto.randomUUID(),
        status: 'editing',
        message:
          draft.action.type === 'add' && draft.requestLocked
            ? '처음 보낸 내용과 같은 요청으로 다시 저장합니다. 내용을 바꾸려면 이 초안을 정리한 뒤 새로 작성해 주세요.'
            : '최신 내용을 확인했습니다. 초안을 확인하고 저장을 눌러 주세요.',
      });
    } catch (error) {
      if (stillOwner()) markDraft(draft, 'conflict', errorMessage(error));
    } finally {
      update((current) => ({ ...current, busy: false }), false);
    }
  }

  async function submitDraft(key: string) {
    const draft = store.state.drafts[key];
    if (
      !editable() ||
      !draft ||
      draft.status === 'conflict' ||
      !canSaveMemberTaskDraftStore(store)
    )
      return;
    const day = currentDay();
    if (!day) return;
    const action = draft.action;
    if ('content' in action && action.content !== undefined) {
      if (!action.content.trim() || action.content.trim().length > 2000) {
        putDraft({
          ...draft,
          message: '할 일을 1~2,000자 이내로 입력해 주세요.',
        });
        return;
      }
    }
    const refreshToken = getCurrentSession().refreshToken;
    const stillOwner = () =>
      sameOwner() && getCurrentSession().refreshToken === refreshToken;
    // A PATCH/DELETE has no replay token. An uncertain operation is only read
    // and reconciled; never blindly resend it against either revision.
    if (draft.status === 'uncertain' && action.type !== 'add') {
      update((current) => ({ ...current, busy: true }), false);
      try {
        await reconcile(draft, stillOwner);
      } catch (error) {
        if (stillOwner()) markDraft(draft, 'uncertain', errorMessage(error));
      } finally {
        update((current) => ({ ...current, busy: false }), false);
      }
      return;
    }

    const pending: MemberTaskDraft = {
      ...draft,
      baseRevision: draft.baseRevision ?? day.revision,
      status: 'uncertain',
      requestLocked: true,
      message: undefined,
    };
    // The immutable action, original UUID, and revision survive a reload even
    // if the request succeeds but its response never reaches this browser.
    const persisted = update((current) => ({
      ...current,
      busy: true,
      drafts: { ...current.drafts, [key]: pending },
    }));
    try {
      if (!persisted) return;
      await queryClient.cancelQueries({ queryKey, exact: true });
      if (!stillOwner() || !canSaveMemberTaskDraftStore(store)) return;
      const response = await saveMemberTaskAction(
        memberId,
        date,
        pending.baseRevision!,
        action,
        ownerKey,
      );
      if (!stillOwner()) return;
      putDay(response);
      removeDraft(key, draft.version);
      // The write includes the authoritative snapshot; refresh in case another
      // device changed this date immediately afterwards. No optimistic mutation.
      void queryClient.invalidateQueries({ queryKey, exact: true });
    } catch (error) {
      if (!stillOwner()) return;
      const rejected =
        error instanceof ApiRequestError &&
        [400, 401, 403, 404, 409].includes(error.status);
      markDraft(
        pending,
        rejected ? 'conflict' : 'uncertain',
        errorMessage(error),
      );
      try {
        if (action.type === 'add') {
          // Never infer an add by matching text: distinct tasks can have equal text.
          await freshDay();
        } else {
          await reconcile(pending, stillOwner);
        }
      } catch {
        // Keep the exact uncertain request when the follow-up read also fails.
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
    refetch: () => query.refetch(),
    drafts: state.drafts,
    busy: state.busy,
    storageReady: state.storageReady,
    storageWarning: state.storageWarning,
    recoveredDates: getMemberTaskDraftDates(memberId).filter(
      (value) => value !== date,
    ),
    startDraft,
    changeDraft,
    discardDraft,
    submitDraft,
    reviewDraft,
  };
}

function sameActionTarget(left: MemberTaskAction, right: MemberTaskAction) {
  if (left.type === 'add' && right.type === 'add')
    return left.clientRequestId === right.clientRequestId;
  return (
    left.type !== 'add' &&
    right.type !== 'add' &&
    left.type === right.type &&
    left.id === right.id
  );
}

function actionAlreadyApplied(action: MemberTaskAction, day: MemberTaskDay) {
  if (action.type === 'add') return false;
  const item = day.items.find((value) => value.id === action.id);
  if (action.type === 'delete') return !item;
  return (
    !!item &&
    (action.content === undefined || item.content === action.content.trim()) &&
    (action.completed === undefined || item.completed === action.completed)
  );
}

function errorMessage(error: unknown) {
  const message =
    error instanceof Error ? error.message : '저장 결과를 확인할 수 없습니다.';
  return `${message} 초안은 유지됩니다. 최신 저장 내용을 확인해 주세요.`;
}
