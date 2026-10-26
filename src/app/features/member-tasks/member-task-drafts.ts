import type { MemberTaskAction } from './member-tasks-api';

export type MemberTaskDraft = {
  key: string;
  action: MemberTaskAction;
  // A quick note may be written before its first successful server read.
  baseRevision: number | null;
  version: string;
  status: 'editing' | 'uncertain' | 'conflict';
  requestLocked?: boolean;
  message?: string;
};

type DraftState = {
  drafts: Record<string, MemberTaskDraft>;
  busy: boolean;
  storageReady: boolean;
  storageWarning: string | null;
};

type DraftStore = {
  memberId: number;
  date: string;
  storageKey: string;
  state: DraftState;
  raw: string | null;
  blocked: boolean;
  memoryDirty: boolean;
  acquiring: boolean;
  lease: boolean;
  release?: () => void;
  listeners: Set<() => void>;
  subscribe: (listener: () => void) => () => void;
};

const STORAGE_PREFIX = 'studyfactory.member-task.drafts.v1';
const stores = new Map<string, DraftStore>();
const dateListeners = new Set<() => void>();
let dateSnapshot = 0;
let browserListenersAdded = false;
const storageMessage =
  '브라우저에 초안을 안전하게 저장할 수 없어 전송을 중단했습니다. 이 화면의 내용을 복사한 뒤 다시 열어 주세요.';
const otherTabMessage =
  '다른 탭에서 이 날짜를 편집 중이거나 초안이 변경되었습니다. 덮어쓰지 않도록 저장을 중단했습니다. 입력 내용을 복사하고 다른 탭을 닫은 뒤 다시 열어 주세요.';
const pendingMessage = '초안을 안전하게 보관할 준비를 하고 있습니다.';
const uuidPattern =
  /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function validAction(value: unknown): value is MemberTaskAction {
  if (!record(value)) return false;
  if (value.type === 'add') {
    return (
      Object.keys(value).every((key) =>
        ['type', 'content', 'clientRequestId'].includes(key),
      ) &&
      typeof value.content === 'string' &&
      typeof value.clientRequestId === 'string' &&
      uuidPattern.test(value.clientRequestId)
    );
  }
  if (!Number.isSafeInteger(value.id) || Number(value.id) <= 0) return false;
  if (value.type === 'delete')
    return Object.keys(value).every((key) => ['type', 'id'].includes(key));
  return (
    value.type === 'update' &&
    Object.keys(value).every((key) =>
      ['type', 'id', 'content', 'completed'].includes(key),
    ) &&
    (typeof value.content === 'string' ||
      typeof value.completed === 'boolean') &&
    (value.content === undefined || typeof value.content === 'string') &&
    (value.completed === undefined || typeof value.completed === 'boolean')
  );
}

function decodeDrafts(raw: string | null, memberId: number, date: string) {
  if (raw === null) return {} as Record<string, MemberTaskDraft>;
  const envelope: unknown = JSON.parse(raw);
  if (
    !record(envelope) ||
    Object.keys(envelope).some(
      (key) => !['schema', 'memberId', 'date', 'drafts'].includes(key),
    ) ||
    envelope.schema !== 1 ||
    envelope.memberId !== memberId ||
    envelope.date !== date ||
    !record(envelope.drafts)
  )
    throw new Error('Unsupported task drafts');
  for (const [key, value] of Object.entries(envelope.drafts)) {
    if (
      !record(value) ||
      Object.keys(value).some(
        (field) =>
          ![
            'key',
            'action',
            'baseRevision',
            'version',
            'status',
            'requestLocked',
            'message',
          ].includes(field),
      ) ||
      !validDraftKey(key) ||
      value.key !== key ||
      !validAction(value.action) ||
      (value.baseRevision !== null &&
        (!Number.isSafeInteger(value.baseRevision) ||
          Number(value.baseRevision) < 0)) ||
      typeof value.version !== 'string' ||
      !uuidPattern.test(value.version) ||
      !['editing', 'uncertain', 'conflict'].includes(String(value.status)) ||
      (value.requestLocked !== undefined &&
        typeof value.requestLocked !== 'boolean') ||
      (value.message !== undefined && typeof value.message !== 'string') ||
      (value.baseRevision === null &&
        (value.action.type !== 'add' ||
          value.status !== 'editing' ||
          value.requestLocked)) ||
      (value.status === 'uncertain' && !value.requestLocked)
    )
      throw new Error('Unsupported task draft');
  }
  return envelope.drafts as Record<string, MemberTaskDraft>;
}

function validDraftKey(key: string) {
  return !!key && !['__proto__', 'constructor', 'prototype'].includes(key);
}

function notify(store: DraftStore) {
  store.listeners.forEach((listener) => listener());
  dateSnapshot += 1;
  dateListeners.forEach((listener) => listener());
}

function block(store: DraftStore, message = storageMessage) {
  store.blocked = true;
  // Once the durable snapshot is no longer trusted, retained text may exist
  // only in this document (for example after another tab clears localStorage).
  if (Object.keys(store.state.drafts).length) store.memoryDirty = true;
  store.state = {
    ...store.state,
    storageReady: false,
    storageWarning: message,
  };
  notify(store);
}

function releaseUnusedLease(store: DraftStore) {
  queueMicrotask(() => {
    if (!store.listeners.size && !store.state.busy) store.release?.();
  });
}

function acquireLease(store: DraftStore) {
  if (store.acquiring || store.lease || store.blocked) return;
  store.acquiring = true;
  if (!navigator.locks) {
    block(store);
    store.acquiring = false;
    return;
  }
  // A check-then-set localStorage write alone is NOT atomic across tabs. Hold
  // a browser-managed lease for the editor lifetime, including in-flight saves.
  void navigator.locks
    .request(store.storageKey, { ifAvailable: true }, async (lock) => {
      if (!lock) {
        block(store, otherTabMessage);
        return;
      }
      store.lease = true;
      try {
        const currentRaw = localStorage.getItem(store.storageKey);
        if (store.memoryDirty && currentRaw !== store.raw) {
          block(store, otherTabMessage);
          return;
        }
        if (!store.memoryDirty) {
          store.state = {
            ...store.state,
            drafts: decodeDrafts(currentRaw, store.memberId, store.date),
          };
          store.raw = currentRaw;
        }
        store.state = {
          ...store.state,
          storageReady: true,
          storageWarning: null,
        };
        if (store.memoryDirty) {
          if (!persist(store, store.state)) {
            notify(store);
            return;
          }
        }
        notify(store);
        await new Promise<void>((resolve) => {
          store.release = resolve;
          releaseUnusedLease(store);
        });
      } catch {
        // Incompatible envelopes are never replaced, including when empty.
        block(store);
      } finally {
        store.lease = false;
        store.release = undefined;
        store.state = { ...store.state, storageReady: false };
      }
    })
    .catch(() => block(store))
    .finally(() => {
      store.acquiring = false;
      if (store.listeners.size && !store.blocked) acquireLease(store);
    });
}

function setupBrowserListeners() {
  if (browserListenersAdded) return;
  browserListenersAdded = true;
  window.addEventListener('storage', (event) => {
    for (const store of stores.values()) {
      if (
        (event.key === null || event.key === store.storageKey) &&
        (store.lease || store.memoryDirty) &&
        event.newValue !== store.raw
      )
        block(store, otherTabMessage);
    }
    if (event.key === null || event.key.startsWith(`${STORAGE_PREFIX}.`)) {
      dateSnapshot += 1;
      dateListeners.forEach((listener) => listener());
    }
  });
  // A draft from a previous date can still be memory-only after navigation.
  // Keep this guard global, not tied only to the currently visible date.
  window.addEventListener('beforeunload', (event) => {
    if (
      [...stores.values()].some(
        (store) => store.memoryDirty && Object.keys(store.state.drafts).length,
      )
    ) {
      event.preventDefault();
      event.returnValue = '';
    }
  });
}

export function getMemberTaskDraftStore(memberId: number, date: string) {
  const storageKey = `${STORAGE_PREFIX}.${memberId}.${date}`;
  const existing = stores.get(storageKey);
  if (existing) return existing;
  const store: DraftStore = {
    memberId,
    date,
    storageKey,
    state: {
      drafts: {},
      busy: false,
      storageReady: false,
      storageWarning: pendingMessage,
    },
    raw: null,
    blocked: false,
    memoryDirty: false,
    acquiring: false,
    lease: false,
    listeners: new Set(),
    subscribe: (listener) => {
      store.listeners.add(listener);
      acquireLease(store);
      return () => {
        store.listeners.delete(listener);
        releaseUnusedLease(store);
      };
    },
  };
  try {
    store.raw = localStorage.getItem(storageKey);
    store.state.drafts = decodeDrafts(store.raw, memberId, date);
  } catch {
    store.blocked = true;
    store.state.storageWarning = storageMessage;
  }
  stores.set(storageKey, store);
  setupBrowserListeners();
  return store;
}

function persist(store: DraftStore, state: DraftState) {
  try {
    if (store.blocked) throw new Error('Blocked draft storage');
    if (!store.lease) {
      store.memoryDirty = true;
      state.storageReady = false;
      state.storageWarning = pendingMessage;
      return false;
    }
    if (localStorage.getItem(store.storageKey) !== store.raw) {
      state.storageWarning = otherTabMessage;
      throw new Error('Changed draft storage');
    }
    const raw = JSON.stringify({
      schema: 1,
      memberId: store.memberId,
      date: store.date,
      drafts: state.drafts,
    });
    localStorage.setItem(store.storageKey, raw);
    if (localStorage.getItem(store.storageKey) !== raw)
      throw new Error('Draft storage verification failed');
    store.raw = raw;
    store.memoryDirty = false;
    state.storageReady = true;
    state.storageWarning = null;
    return true;
  } catch {
    store.blocked = true;
    store.memoryDirty = true;
    state.storageReady = false;
    state.storageWarning =
      state.storageWarning === otherTabMessage
        ? otherTabMessage
        : storageMessage;
    return false;
  }
}

export function updateMemberTaskDraftStore(
  store: DraftStore,
  update: (state: DraftState) => DraftState,
  shouldPersist = true,
) {
  const state = update(store.state);
  const saved = shouldPersist ? persist(store, state) : true;
  store.state = state;
  notify(store);
  if (!state.busy) releaseUnusedLease(store);
  return saved;
}

export function canSaveMemberTaskDraftStore(store: DraftStore) {
  if (store.blocked || !store.lease || !store.state.storageReady) return false;
  try {
    if (localStorage.getItem(store.storageKey) === store.raw) return true;
    block(store, otherTabMessage);
  } catch {
    block(store);
  }
  return false;
}

export function getMemberTaskDraftDates(memberId: number): string[] {
  const prefix = `${STORAGE_PREFIX}.${memberId}.`;
  const dates = new Set<string>();
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith(prefix)) continue;
      const date = key.slice(prefix.length);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      try {
        if (
          Object.keys(decodeDrafts(localStorage.getItem(key), memberId, date))
            .length
        )
          dates.add(date);
      } catch {
        // Keep incompatible data discoverable without changing or interpreting it.
        dates.add(date);
      }
    }
  } catch {
    // Memory-only drafts are still recoverable in this open app.
  }
  for (const store of stores.values()) {
    if (store.memberId !== memberId) continue;
    if (!store.lease && !store.memoryDirty && !store.blocked) continue;
    if (Object.keys(store.state.drafts).length) dates.add(store.date);
    else if (store.lease && !store.blocked) dates.delete(store.date);
  }
  return [...dates].sort().reverse();
}

export function subscribeMemberTaskDraftDates(listener: () => void) {
  dateListeners.add(listener);
  return () => {
    dateListeners.delete(listener);
  };
}

export function getMemberTaskDraftDateSnapshot() {
  return dateSnapshot;
}
