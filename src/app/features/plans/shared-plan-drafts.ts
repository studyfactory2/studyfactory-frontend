import type { SharedPlanAction } from './shared-plans-api';

export type SharedPlanDraft = {
  key: string;
  action: SharedPlanAction;
  baseRevision: number;
  version: string;
  status: 'editing' | 'uncertain' | 'conflict';
  message?: string;
};
type DraftState = {
  drafts: Record<string, SharedPlanDraft>;
  busy: boolean;
  storageWarning: string | null;
};
type DraftStore = {
  state: DraftState;
  listeners: Set<() => void>;
  raw: string | null;
  blocked: boolean;
  storageKey: string;
};
const stores = new Map<string, DraftStore>();
const STORAGE_PREFIX = 'studyfactory.member-plan.shared-drafts.v1';
const storageMessage =
  '입력 내용은 이 화면에 유지됩니다. 브라우저 저장에 실패했거나 다른 탭의 초안이 변경되었습니다. 새로고침·종료 전에 내용을 복사해 주세요.';

function validAction(value: unknown): value is SharedPlanAction {
  if (!value || typeof value !== 'object') return false;
  const action = value as Record<string, unknown>;
  if (action.type === 'goal') return typeof action.goal === 'string';
  if (action.type === 'update' || action.type === 'delete') {
    return (
      (action.source === 'LEGACY' || action.source === 'GROUP') &&
      Number.isSafeInteger(action.id) &&
      Number(action.id) > 0 &&
      (action.type === 'delete' ||
        ((typeof action.content === 'string' ||
          typeof action.done === 'boolean') &&
          (action.content === undefined ||
            typeof action.content === 'string') &&
          (action.done === undefined || typeof action.done === 'boolean')))
    );
  }
  return (
    (action.type === 'add' || action.type === 'break') &&
    Number.isInteger(action.dayIndex) &&
    Number(action.dayIndex) >= 0 &&
    Number(action.dayIndex) <= 6 &&
    typeof action.content === 'string' &&
    typeof action.clientRequestId === 'string' &&
    /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(
      action.clientRequestId,
    ) &&
    (action.type === 'add'
      ? ['PERIODS_1_2', 'PERIODS_3_5', 'PERIODS_6_7'].includes(
          String(action.group),
        )
      : action.periodIndex === 100 || action.periodIndex === 101)
  );
}

export function getSharedDraftStore(memberId: number, week: string) {
  const storageKey = `${STORAGE_PREFIX}.${memberId}.${week}`;
  const existing = stores.get(storageKey);
  if (existing) return existing;
  const store: DraftStore = {
    state: { drafts: {}, busy: false, storageWarning: null },
    listeners: new Set(),
    raw: null,
    blocked: false,
    storageKey,
  };
  try {
    store.raw = localStorage.getItem(storageKey);
    if (store.raw !== null) {
      const envelope = JSON.parse(store.raw);
      if (
        envelope?.schema !== 1 ||
        envelope.memberId !== memberId ||
        envelope.week !== week ||
        !envelope.drafts ||
        typeof envelope.drafts !== 'object' ||
        Array.isArray(envelope.drafts)
      )
        throw new Error();
      for (const [key, value] of Object.entries(envelope.drafts)) {
        const draft = value as SharedPlanDraft;
        if (
          !draft ||
          draft.key !== key ||
          !validAction(draft.action) ||
          !Number.isSafeInteger(draft.baseRevision) ||
          draft.baseRevision < 0 ||
          typeof draft.version !== 'string' ||
          !['editing', 'uncertain', 'conflict'].includes(draft.status)
        )
          throw new Error();
      }
      store.state.drafts = envelope.drafts;
    }
  } catch {
    // Unknown/unsupported drafts remain untouched; never erase them during hydration.
    store.blocked = true;
    store.state.storageWarning = storageMessage;
  }
  stores.set(storageKey, store);
  return store;
}

export function updateSharedDraftStore(
  store: DraftStore,
  memberId: number,
  week: string,
  update: (state: DraftState) => DraftState,
  persist = true,
) {
  const state = update(store.state);
  if (persist) {
    try {
      // Compare before writing so a second tab's draft is not silently overwritten.
      if (store.blocked || localStorage.getItem(store.storageKey) !== store.raw)
        throw new Error();
      const raw = JSON.stringify({
        schema: 1,
        memberId,
        week,
        drafts: state.drafts,
      });
      localStorage.setItem(store.storageKey, raw);
      store.raw = raw;
      state.storageWarning = null;
    } catch {
      store.blocked = true;
      state.storageWarning = storageMessage;
    }
  }
  store.state = state;
  store.listeners.forEach((listener) => listener());
}
