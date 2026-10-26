import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArchiveRestore, Download, PencilLine, Target } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { getCurrentSession, type SessionOwnerKey } from '../../core/session';
import { Button } from '../../shared/ui';
import {
  DAY_LABELS,
  MEMBER_PLAN_SAVED_EVENT,
  MONTHLY_DRAFT_STORAGE_KEY,
  PLAN_ROWS,
  WEEKLY_DRAFT_STORAGE_KEY,
} from '../../screens/member/plans/model/plan.constants';
import {
  formatMonthLabel,
  isMonthKey,
} from '../../screens/member/plans/model/plan.dates';
import type { StoredMonthlyDraft } from '../../screens/member/plans/model/plan.types';
import { memberPlanQueryKeys } from './plan-query-keys';
import { fetchMonthlyPlanGoal, saveMonthlyPlanGoal } from './plans-api';
import './plan-draft-recovery.css';

// Keep a recoverable copy during route changes when browser storage is blocked.
// These are private member drafts, never a fallback for another signed-in member.
const monthlyMemory = new Map<string, StoredMonthlyDraft>();
const monthlySaves = new Set<string>();

type RawDraft = { raw: string | null; unavailable: boolean };

function readRawDraft(key: string): RawDraft {
  try {
    return { raw: window.sessionStorage.getItem(key), unavailable: false };
  } catch {
    return { raw: null, unavailable: true };
  }
}

function parseRecord(raw: string | null): Record<string, unknown> | null {
  if (raw === null) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return value !== null && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function parseMonthlyDraft(
  raw: string | null,
  memberId: number,
): StoredMonthlyDraft | null {
  const value = parseRecord(raw);
  if (
    value?.memberId !== memberId ||
    typeof value.goal !== 'string' ||
    typeof value.monthKey !== 'string' ||
    !isMonthKey(value.monthKey) ||
    typeof value.revision !== 'string' ||
    !value.revision ||
    Object.keys(value).some(
      (key) => !['goal', 'memberId', 'monthKey', 'revision'].includes(key),
    )
  )
    return null;
  return {
    goal: value.goal,
    memberId,
    monthKey: value.monthKey,
    revision: value.revision,
  };
}

function draftRevision() {
  return `${Date.now()}-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
}

function downloadRaw(raw: string, filename: string) {
  const url = URL.createObjectURL(
    new Blob([raw], { type: 'application/json;charset=utf-8' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function RawDraftActions({ raw, filename }: { raw: string; filename: string }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  return (
    <>
      <div className="plan-recovery__actions">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            void (async () => {
              try {
                await navigator.clipboard.writeText(raw);
                setCopied(true);
                setCopyError(false);
              } catch {
                setCopyError(true);
              }
            })();
          }}
        >
          {copied ? '원본 복사됨' : '원본 복사'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => downloadRaw(raw, filename)}
        >
          <Download size={14} aria-hidden="true" /> 원본 내려받기
        </Button>
      </div>
      {copyError && (
        <p role="status">
          복사할 수 없어요. 원본을 내려받거나 아래 내용을 직접 복사해 주세요.
        </p>
      )}
      <details className="plan-recovery__raw">
        <summary>원본 데이터 보기</summary>
        <pre tabIndex={0}>{raw}</pre>
      </details>
    </>
  );
}

function displayValue(value: unknown) {
  if (typeof value === 'string') return value || '(빈 내용)';
  return JSON.stringify(value) ?? '(값 없음)';
}

export function LegacyPlanDraftNotice({ memberId }: { memberId: number }) {
  return <LegacyPlanDraftContent key={memberId} memberId={memberId} />;
}

function LegacyPlanDraftContent({ memberId }: { memberId: number }) {
  const storageKey = `${WEEKLY_DRAFT_STORAGE_KEY}.${memberId}`;
  const [stored, setStored] = useState(() => readRawDraft(storageKey));
  const [message, setMessage] = useState('');
  if (stored.unavailable)
    return (
      <p className="plan-recovery__warning" role="status">
        이 브라우저의 이전 임시 계획을 확인할 수 없어요. 브라우저 저장 공간
        설정을 확인해 주세요.
      </p>
    );
  if (stored.raw === null) return null;
  const originalRaw = stored.raw;
  const parsed = parseRecord(originalRaw);
  const items = Array.isArray(parsed?.items) ? parsed.items : null;

  return (
    <section className="plan-recovery" aria-label="이전 임시 계획 복구">
      <div className="plan-recovery__heading">
        <ArchiveRestore size={18} aria-hidden="true" />
        <strong>이전 화면에서 작성한 임시 계획이 있어요</strong>
      </div>
      <p>
        저장 전 내용은 원본 그대로 보관했어요. 현재 계획과 자동으로 합치지
        않으니, 아래 내용을 확인하고 필요한 항목만 새 체크리스트에 옮겨 주세요.
      </p>
      <details className="plan-recovery__details">
        <summary>
          임시 계획 확인
          {typeof parsed?.weekStartKey === 'string'
            ? ` · ${parsed.weekStartKey}`
            : ''}
        </summary>
        {parsed && (
          <>
            <p>
              <strong>주간 목표</strong>
            </p>
            <p className="plan-recovery__content">
              {displayValue(parsed.goal)}
            </p>
            {items && (
              <ul className="plan-recovery__items">
                {items.map((item: unknown, index: number) => {
                  const row =
                    item !== null &&
                    typeof item === 'object' &&
                    !Array.isArray(item)
                      ? (item as Record<string, unknown>)
                      : null;
                  if (!row)
                    return (
                      <li key={index}>
                        <pre>{displayValue(item)}</pre>
                      </li>
                    );
                  const day =
                    typeof row.dayIndex === 'number'
                      ? DAY_LABELS[row.dayIndex]
                      : undefined;
                  const period = PLAN_ROWS.find(
                    (entry) => entry.periodIndex === row.periodIndex,
                  );
                  return (
                    <li key={index}>
                      <small>
                        {day
                          ? `${day}요일`
                          : `요일 값 ${displayValue(row.dayIndex)}`}{' '}
                        ·{' '}
                        {period?.label ??
                          `교시 값 ${displayValue(row.periodIndex)}`}{' '}
                        ·{' '}
                        {row.done === true
                          ? '완료'
                          : row.done === false
                            ? '미완료'
                            : `완료 값 ${displayValue(row.done)}`}
                      </small>
                      <span className="plan-recovery__content">
                        {displayValue(row.content)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
        {!parsed && (
          <p>
            이전 데이터 형식을 읽을 수 없어요. 원본을 복사하거나 내려받아 보관해
            주세요.
          </p>
        )}
        <RawDraftActions
          raw={originalRaw}
          filename={`weekly-plan-draft-${memberId}.json`}
        />
        <Button
          size="sm"
          variant="ghost"
          className="plan-recovery__dismiss"
          onClick={() => {
            if (getCurrentSession().memberId !== memberId) return;
            if (
              !window.confirm(
                '이전 임시 계획 원본을 삭제할까요? 서버에 저장된 계획은 바뀌지 않아요. 필요한 내용은 먼저 복사하거나 내려받아 주세요.',
              )
            )
              return;
            const latest = readRawDraft(storageKey);
            if (latest.unavailable || latest.raw !== originalRaw) {
              setStored(latest);
              setMessage(
                '임시 계획이 바뀌었어요. 최신 원본을 확인한 뒤 다시 시도해 주세요.',
              );
              return;
            }
            try {
              window.sessionStorage.removeItem(storageKey);
              setStored({ raw: null, unavailable: false });
            } catch {
              setMessage(
                '원본을 지우지 못했어요. 임시 계획은 그대로 보관되어 있어요.',
              );
            }
          }}
        >
          이전 임시 계획 삭제
        </Button>
      </details>
      {message && <p role="status">{message}</p>}
    </section>
  );
}

type MonthlyGoalProps = {
  memberId: number;
  ownerKey: SessionOwnerKey;
  monthKey: string;
};

export function MemberMonthlyGoal(props: MonthlyGoalProps) {
  return (
    <MonthlyGoalMonths key={`${props.ownerKey}:${props.monthKey}`} {...props} />
  );
}

function MonthlyGoalMonths(props: MonthlyGoalProps) {
  const [activeMonth, setActiveMonth] = useState(props.monthKey);
  return (
    <MonthlyGoalEditor
      key={`${props.ownerKey}:${activeMonth}`}
      {...props}
      activeMonth={activeMonth}
      onOpenMonth={setActiveMonth}
    />
  );
}

function MonthlyGoalEditor({
  memberId,
  ownerKey,
  monthKey,
  activeMonth,
  onOpenMonth,
}: MonthlyGoalProps & {
  activeMonth: string;
  onOpenMonth: (month: string) => void;
}) {
  const inputId = useId();
  const queryClient = useQueryClient();
  const storageKey = `${MONTHLY_DRAFT_STORAGE_KEY}.${memberId}`;
  const memoryKey = `${memberId}:${activeMonth}`;
  const [stored, setStored] = useState(() => readRawDraft(storageKey));
  const [draft, setDraft] = useState<StoredMonthlyDraft | null>(() => {
    const memory = monthlyMemory.get(memoryKey);
    if (memory) return memory;
    const recovered = parseMonthlyDraft(readRawDraft(storageKey).raw, memberId);
    return recovered?.monthKey === activeMonth ? recovered : null;
  });
  const [expanded, setExpanded] = useState(Boolean(draft));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [storageWarning, setStorageWarning] = useState(() => {
    const recovered = parseMonthlyDraft(stored.raw, memberId);
    return (
      stored.unavailable ||
      Boolean(draft && recovered?.revision !== draft.revision)
    );
  });
  const recovered = parseMonthlyDraft(stored.raw, memberId);
  const blocked =
    stored.raw !== null &&
    (!recovered ||
      recovered.monthKey !== activeMonth ||
      Boolean(draft && recovered.revision !== draft.revision));
  const query = useQuery({
    queryKey: memberPlanQueryKeys.month(ownerKey, activeMonth),
    queryFn: async () => {
      const result = await fetchMonthlyPlanGoal(activeMonth, memberId);
      if (getCurrentSession().ownerKey !== ownerKey)
        throw new Error('로그인 정보가 변경되었어요.');
      return result;
    },
    enabled: isMonthKey(activeMonth),
    retry: false,
  });
  const value = draft?.goal ?? query.data?.goal ?? '';

  useEffect(() => {
    if (!draft || !storageWarning) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [draft, storageWarning]);

  function updateGoal(goal: string) {
    if (getCurrentSession().ownerKey !== ownerKey || blocked || saving) return;
    const next = {
      goal,
      memberId,
      monthKey: activeMonth,
      revision: draftRevision(),
    };
    setDraft(next);
    monthlyMemory.set(memoryKey, next);
    setMessage('');
    const latest = readRawDraft(storageKey);
    if (latest.unavailable || latest.raw !== stored.raw) {
      if (!latest.unavailable) setStored(latest);
      setStorageWarning(true);
      setMessage(
        '브라우저의 임시 내용과 달라 현재 입력은 이 화면에 보관 중이에요. 원본을 덮어쓰지 않았어요.',
      );
      return;
    }
    try {
      const raw = JSON.stringify(next);
      window.sessionStorage.setItem(storageKey, raw);
      setStored({ raw, unavailable: false });
      setStorageWarning(false);
    } catch {
      setStorageWarning(true);
    }
  }

  async function saveGoal() {
    if (!draft || blocked || getCurrentSession().ownerKey !== ownerKey) return;
    if (monthlySaves.has(memoryKey)) {
      setMessage('이 월간 목표를 저장 중이에요. 잠시 후 다시 확인해 주세요.');
      return;
    }
    const submitted = draft;
    setSaving(true);
    setMessage('');
    monthlySaves.add(memoryKey);
    try {
      await queryClient.cancelQueries({
        queryKey: memberPlanQueryKeys.month(ownerKey, activeMonth),
      });
      if (getCurrentSession().ownerKey !== ownerKey) return;
      const result = await saveMonthlyPlanGoal(
        { month: activeMonth, goal: submitted.goal.trim() },
        memberId,
      );
      if (getCurrentSession().ownerKey !== ownerKey) return;
      queryClient.setQueryData(
        memberPlanQueryKeys.month(ownerKey, activeMonth),
        result,
      );
      const latest = readRawDraft(storageKey);
      const current = parseMonthlyDraft(latest.raw, memberId);
      if (
        current?.monthKey === activeMonth &&
        current.revision === submitted.revision
      ) {
        try {
          window.sessionStorage.removeItem(storageKey);
          setStored({ raw: null, unavailable: false });
        } catch {
          setStorageWarning(true);
        }
      }
      if (monthlyMemory.get(memoryKey)?.revision === submitted.revision)
        monthlyMemory.delete(memoryKey);
      setDraft((currentDraft) =>
        currentDraft?.revision === submitted.revision ? null : currentDraft,
      );
      setMessage('월간 목표를 저장했어요.');
      window.dispatchEvent(new Event(MEMBER_PLAN_SAVED_EVENT));
    } catch (error) {
      if (getCurrentSession().ownerKey === ownerKey) {
        setMessage(
          error instanceof Error
            ? `${error.message} 입력한 내용은 유지했어요.`
            : '저장하지 못했어요. 입력한 내용은 유지했어요.',
        );
      }
    } finally {
      monthlySaves.delete(memoryKey);
      setSaving(false);
    }
  }

  return (
    <section className="member-monthly-goal" aria-label="월간 목표">
      <header className="member-monthly-goal__heading">
        <Target size={18} aria-hidden="true" />
        <div>
          <small>{formatMonthLabel(activeMonth)}</small>
          <h3>월간 목표</h3>
        </div>
        <Button
          size="sm"
          variant="ghost"
          aria-expanded={expanded}
          aria-controls={inputId}
          onClick={() => setExpanded(!expanded)}
        >
          <PencilLine size={14} aria-hidden="true" />
          {expanded ? '접기' : '편집'}
        </Button>
      </header>
      {activeMonth !== monthKey && (
        <Button
          size="sm"
          variant="ghost"
          disabled={saving}
          onClick={() => onOpenMonth(monthKey)}
        >
          {formatMonthLabel(monthKey)}로 돌아가기
        </Button>
      )}
      {blocked && (
        <div className="plan-recovery">
          <strong>
            {recovered
              ? `${formatMonthLabel(recovered.monthKey)} 임시 목표가 있어요`
              : '이전 임시 목표 원본을 보관하고 있어요'}
          </strong>
          <p>다른 임시 내용을 덮어쓰지 않도록 새 편집을 잠시 멈췄어요.</p>
          {recovered && (
            <>
              <p className="plan-recovery__content">
                {recovered.goal || '(빈 목표)'}
              </p>
              {recovered.monthKey !== activeMonth && (
                <Button
                  size="sm"
                  onClick={() => onOpenMonth(recovered.monthKey)}
                >
                  임시 목표 열기
                </Button>
              )}
            </>
          )}
          <RawDraftActions
            raw={stored.raw!}
            filename={`monthly-plan-draft-${memberId}.json`}
          />
          {draft && recovered?.monthKey === activeMonth && (
            <>
              <p>
                이 화면의 다른 임시 내용도 보관했어요. 아래 원본과 비교한 뒤
                필요한 내용을 남겨 주세요.
              </p>
              <RawDraftActions
                raw={JSON.stringify(draft)}
                filename={`monthly-plan-current-draft-${memberId}.json`}
              />
            </>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (getCurrentSession().ownerKey !== ownerKey) return;
              if (
                !window.confirm(
                  '이전 임시 목표를 삭제할까요? 필요한 내용은 먼저 복사하거나 내려받아 주세요. 서버의 월간 목표는 바뀌지 않아요.',
                )
              )
                return;
              const latest = readRawDraft(storageKey);
              if (latest.unavailable || latest.raw !== stored.raw) {
                setStored(latest);
                setMessage(
                  '임시 목표가 바뀌었어요. 최신 원본을 다시 확인해 주세요.',
                );
                return;
              }
              try {
                window.sessionStorage.removeItem(storageKey);
                if (
                  recovered &&
                  monthlyMemory.get(`${memberId}:${recovered.monthKey}`)
                    ?.revision === recovered.revision
                )
                  monthlyMemory.delete(`${memberId}:${recovered.monthKey}`);
                setStored({ raw: null, unavailable: false });
              } catch {
                setMessage(
                  '원본을 지우지 못했어요. 임시 목표는 그대로 보관되어 있어요.',
                );
              }
            }}
          >
            이전 임시 목표 삭제
          </Button>
        </div>
      )}
      {!expanded && (
        <p className="member-monthly-goal__preview">
          {value ||
            (query.isPending
              ? '목표를 불러오는 중이에요.'
              : '이번 달 이루고 싶은 목표를 적어보세요.')}
        </p>
      )}
      {expanded && (
        <div className="member-monthly-goal__editor">
          <label htmlFor={inputId}>이번 달 목표</label>
          <textarea
            id={inputId}
            rows={3}
            value={value}
            disabled={blocked || saving || (!query.data && !draft)}
            onChange={(event) => updateGoal(event.target.value)}
            placeholder="이번 달 이루고 싶은 목표"
          />
          <div className="member-monthly-goal__save">
            <span>{draft ? '저장 전 내용' : '저장된 목표'}</span>
            <Button
              size="sm"
              disabled={!draft || blocked || !query.data}
              loading={saving}
              onClick={() => void saveGoal()}
            >
              목표 저장
            </Button>
          </div>
        </div>
      )}
      {query.isError && (
        <div className="plan-recovery__warning" role="alert">
          월간 목표를 불러오지 못했어요. 임시 내용은 유지돼요.{' '}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void query.refetch()}
          >
            다시 불러오기
          </Button>
        </div>
      )}
      {storageWarning && draft && (
        <p className="plan-recovery__warning" role="status">
          브라우저에 임시 저장하지 못했어요. 이 화면을 새로고침하거나 닫기 전에
          목표를 저장하거나 복사해 주세요.
        </p>
      )}
      {message && (
        <p className="member-monthly-goal__message" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
